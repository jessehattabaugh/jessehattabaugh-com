import { ecdsaDerToRaw, fromBase64url, toBase64url } from './utils.js';

/**
 * Sign a VAPID JWT for push service authorization.
 * @param {{ audience: string, subject: string, privateKeyB64: string }} opts
 * @returns {Promise<string>}  JWT string
 */
export async function signVapidJwt({ audience, subject, privateKeyB64 }) {
	/** @param {string} s */
	const encode = (s) => {
		return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	};
	const header = encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
	const now = Math.floor(Date.now() / 1000);
	const payload = encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject }));
	const signingInput = `${header}.${payload}`;

	const key = await crypto.subtle.importKey(
		'pkcs8',
		fromBase64url(privateKeyB64),
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign'],
	);
	const sig = new Uint8Array(
		await crypto.subtle.sign(
			{ name: 'ECDSA', hash: 'SHA-256' },
			key,
			new TextEncoder().encode(signingInput),
		),
	);
	return `${signingInput}.${toBase64url(ecdsaDerToRaw(sig))}`;
}

// ── RFC 8291 payload encryption helpers ─────────────────────────────────────

/** Concatenate byte arrays. */
/** @param {...Uint8Array} parts */
function concat(...parts) {
	const total = parts.reduce((sum, p) => {
		return sum + p.length;
	}, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

/** HMAC-SHA-256. */
/** @param {Uint8Array} key @param {Uint8Array} data */
async function hmac(key, data) {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

/** 4-byte big-endian record size. */
/** @param {number} n */
function recordSizeBytes(n) {
	const b = new Uint8Array(4);
	b[0] = (n >>> 24) & 0xff;
	b[1] = (n >>> 16) & 0xff;
	b[2] = (n >>> 8) & 0xff;
	b[3] = n & 0xff;
	return b;
}

/**
 * Encrypt a plaintext payload for Web Push per RFC 8291 ("aes128gcm" content coding).
 * Returns header || ciphertext as the POST body bytes.
 *
 * iOS/iPadOS Web Push silently drops empty (and unencrypted) payloads, so the
 * message content must be encrypted and non-empty to trigger a notification.
 * @param {string} plaintext  UTF-8 payload string
 * @param {string} uaPublicKeyB64  subscription p256dh (base64url, 65-byte uncompressed point)
 * @param {string} authSecretB64   subscription auth (base64url, 16 bytes)
 * @returns {Promise<Uint8Array>}
 */
export async function encryptPayload(plaintext, uaPublicKeyB64, authSecretB64) {
	const uaPublic = fromBase64url(uaPublicKeyB64);
	const authSecret = fromBase64url(authSecretB64);

	// Ephemeral application-server ECDH key pair (P-256).
	const keyPair = await crypto.subtle.generateKey(
		{ name: 'ECDH', namedCurve: 'P-256' },
		true,
		['deriveBits'],
	);
	const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));

	const uaKey = await crypto.subtle.importKey(
		'raw',
		uaPublic,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[],
	);

	// ecdh_secret = ECDH(as_private, ua_public)
	const ecdhSecret = new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, keyPair.privateKey, 256),
	);

	// PRK_key = HMAC-SHA-256(auth_secret, ecdh_secret)
	const prkKey = await hmac(authSecret, ecdhSecret);

	// IKM = HMAC-SHA-256(PRK_key, "WebPush: info" || 0x00 || ua_public || as_public || 0x01)
	const keyInfo = concat(
		new TextEncoder().encode('WebPush: info'),
		new Uint8Array([0]),
		uaPublic,
		asPublic,
	);
	const ikm = await hmac(prkKey, concat(keyInfo, new Uint8Array([1])));

	const salt = crypto.getRandomValues(new Uint8Array(16));

	// PRK = HMAC-SHA-256(salt, IKM)
	const prk = await hmac(salt, ikm);

	// CEK = HMAC-SHA-256(PRK, "Content-Encoding: aes128gcm" || 0x00 || 0x01)[0..15]
	const cekInfo = concat(new TextEncoder().encode('Content-Encoding: aes128gcm'), new Uint8Array([0]));
	const cek = (await hmac(prk, concat(cekInfo, new Uint8Array([1])))).slice(0, 16);

	// NONCE = HMAC-SHA-256(PRK, "Content-Encoding: nonce" || 0x00 || 0x01)[0..11]
	const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce'), new Uint8Array([0]));
	const nonce = (await hmac(prk, concat(nonceInfo, new Uint8Array([1])))).slice(0, 12);

	// Header = salt (16) || rs (4 = 4096) || idlen (1 = 65) || as_public (65)
	const header = concat(salt, recordSizeBytes(4096), new Uint8Array([asPublic.length]), asPublic);

	// Plaintext = content || 0x02 (padding delimiter)
	const plaintextBytes = concat(new TextEncoder().encode(plaintext), new Uint8Array([2]));

	const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: nonce, additionalData: header },
			aesKey,
			plaintextBytes,
		),
	);

	return concat(header, ciphertext);
}

/**
 * Send a Web Push (encrypted payload per RFC 8291) to a single subscription.
 * @param {{
 *   endpoint: string,
 *   jwt: string,
 *   vapidPublicKey: string,
 *   encryptedBody: Uint8Array,
 *   ttl?: number,
 * }} opts
 * @returns {Promise<Response>}
 */
async function sendPush({ endpoint, jwt, vapidPublicKey, encryptedBody, ttl = 86400 }) {
	return fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
			'Content-Encoding': 'aes128gcm',
			'Content-Type': 'application/octet-stream',
			TTL: String(ttl),
			Urgency: 'normal',
		},
		body: encryptedBody,
	});
}

/**
 * Send push notifications to all subscriptions, silently dropping expired ones.
 * @param {Array<{ endpoint: string, p256dh: string, auth: string }>} subscriptions
 * @param {{ vapidPublicKey: string, vapidPrivateKey: string, vapidContact: string }} vapid
 * @param {(endpoint: string) => Promise<unknown>} onGone  called when subscription is gone (410/404)
 * @param {string} payload  plaintext payload to encrypt and send (JSON string)
 */
export async function notifyAll(subscriptions, vapid, onGone, payload) {
	await Promise.allSettled(
		subscriptions.map(async (sub) => {
			const { origin } = new URL(sub.endpoint);
			const jwt = await signVapidJwt({
				audience: origin,
				subject: vapid.vapidContact,
				privateKeyB64: vapid.vapidPrivateKey,
			});
			const encryptedBody = await encryptPayload(payload, sub.p256dh, sub.auth);
			const res = await sendPush({
				endpoint: sub.endpoint,
				jwt,
				vapidPublicKey: vapid.vapidPublicKey,
				encryptedBody,
			});
			if (res.status === 410 || res.status === 404) {
				await onGone(sub.endpoint);
			}
		}),
	);
}
