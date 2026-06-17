import { fromBase64url, toBase64url } from './utils.js';

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
	return `${signingInput}.${toBase64url(sig)}`;
}

/**
 * Send a Web Push to a single subscription.
 * Body is empty — the service worker fetches content on receipt (privacy-friendly).
 * @param {{ endpoint: string, jwt: string, vapidPublicKey: string, ttl?: number }} opts
 * @returns {Promise<Response>}
 */
async function sendPush({ endpoint, jwt, vapidPublicKey, ttl = 86400 }) {
	return fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
			'Content-Length': '0',
			'Content-Type': 'application/octet-stream',
			TTL: String(ttl),
			Urgency: 'normal',
		},
	});
}

/**
 * Send push notifications to all subscriptions, silently dropping expired ones.
 * @param {Array<{ endpoint: string, p256dh: string, auth: string }>} subscriptions
 * @param {{ vapidPublicKey: string, vapidPrivateKey: string, vapidContact: string }} vapid
 * @param {(endpoint: string) => Promise<unknown>} onGone  called when subscription is gone (410/404)
 */
export async function notifyAll(subscriptions, vapid, onGone) {
	await Promise.allSettled(
		subscriptions.map(async (sub) => {
			const { origin } = new URL(sub.endpoint);
			const jwt = await signVapidJwt({
				audience: origin,
				subject: vapid.vapidContact,
				privateKeyB64: vapid.vapidPrivateKey,
			});
			const res = await sendPush({
				endpoint: sub.endpoint,
				jwt,
				vapidPublicKey: vapid.vapidPublicKey,
			});
			if (res.status === 410 || res.status === 404) {
				await onGone(sub.endpoint);
			}
		}),
	);
}
