import { decodeCbor } from './cbor.js';
import { toBase64url, fromBase64url } from './utils.js';

export { toBase64url, fromBase64url };

/**
 * Parse the binary authenticator data block.
 * @param {Uint8Array} authData
 */
function parseAuthData(authData) {
	if (authData.length < 37) {
		throw new Error('authenticatorData is too short');
	}

	const view = new DataView(authData.buffer, authData.byteOffset);
	const rpIdHash = authData.slice(0, 32);
	const flags = view.getUint8(32);
	const userPresent = (flags & 0x01) !== 0;
	const userVerified = (flags & 0x04) !== 0;
	const counter = view.getUint32(33, false); // big-endian

	let credentialId = null;
	let coseKey = null;

	if ((flags & 0x40) !== 0) {
		// Attested credential data present (AT flag)
		if (authData.length < 55) {
			throw new Error('authenticatorData is missing attested credential metadata');
		}
		const credIdLen = view.getUint16(53, false);
		if (authData.length < 55 + credIdLen) {
			throw new Error('authenticatorData credentialId is truncated');
		}
		credentialId = authData.slice(55, 55 + credIdLen);
		const coseKeyBytes = authData.slice(55 + credIdLen);
		coseKey = /** @type {Map<number,unknown>} */ (decodeCbor(coseKeyBytes));
	}

	return { rpIdHash, userPresent, userVerified, counter, credentialId, coseKey };
}

/**
 * Extract uncompressed EC public key (65 bytes: 0x04‖x‖y) from COSE key map.
 * Only ES256 (kty=2, alg=-7, crv=1) is supported.
 * @param {Map<number,unknown>} coseKey
 * @returns {Uint8Array}
 */
export function coseToPublicKey(coseKey) {
	const kty = coseKey.get(1);
	const alg = coseKey.get(3);
	const crv = coseKey.get(-1);
	const x = /** @type {Uint8Array} */ (coseKey.get(-2));
	const y = /** @type {Uint8Array} */ (coseKey.get(-3));

	if (kty !== 2 || alg !== -7 || crv !== 1 || !x || !y) {
		throw new Error('Only ES256 (ECDSA P-256) passkeys are supported');
	}
	const pub = new Uint8Array(65);
	pub[0] = 0x04;
	pub.set(x, 1);
	pub.set(y, 33);
	return pub;
}

/**
 * Convert DER-encoded ECDSA signature to the raw r‖s format WebCrypto expects.
 * @param {Uint8Array} der
 * @returns {Uint8Array} 64 bytes
 */
function derToRaw(der) {
	// Strict DER form: 0x30 <len|0x81 len> 0x02 <rLen> <r> 0x02 <sLen> <s>
	if (der.length < 8 || der[0] !== 0x30) {
		throw new Error('Invalid ECDSA DER signature');
	}

	let offset = 1;
	let seqLen = der[offset++];
	if (seqLen === 0x81) {
		if (offset >= der.length) {
			throw new Error('Invalid ECDSA DER signature length');
		}
		seqLen = der[offset++];
	}
	if (offset + seqLen !== der.length) {
		throw new Error('Invalid ECDSA DER signature size');
	}

	if (der[offset++] !== 0x02 || offset >= der.length) {
		throw new Error('Invalid ECDSA DER integer (r)');
	}
	const rLen = der[offset++];
	if (rLen === 0 || offset + rLen > der.length) {
		throw new Error('Invalid ECDSA DER r length');
	}
	const r = der.slice(offset, offset + rLen);
	offset += rLen;

	if (der[offset++] !== 0x02 || offset >= der.length) {
		throw new Error('Invalid ECDSA DER integer (s)');
	}
	const sLen = der[offset++];
	if (sLen === 0 || offset + sLen !== der.length) {
		throw new Error('Invalid ECDSA DER s length');
	}
	const s = der.slice(offset, offset + sLen);

	const raw = new Uint8Array(64);
	const rClean = r[0] === 0 ? r.slice(1) : r;
	const sClean = s[0] === 0 ? s.slice(1) : s;
	if (rClean.length > 32 || sClean.length > 32) {
		throw new Error('Invalid ECDSA DER integer width');
	}
	raw.set(rClean, 32 - rClean.length);
	raw.set(sClean, 64 - sClean.length);
	return raw;
}

/**
 * Generate registration options and a random challenge.
 * @param {{ rpName: string, rpId: string, userId: string, displayName: string }} opts
 * @returns {{ challenge: string, options: object }}
 */
export function createRegistrationOptions({ rpName, rpId, userId, displayName }) {
	const challenge = toBase64url(crypto.getRandomValues(new Uint8Array(32)));
	return {
		challenge,
		options: {
			rp: { name: rpName, id: rpId },
			user: { id: userId, name: displayName, displayName },
			challenge,
			pubKeyCredParams: [
				{ type: 'public-key', alg: -7 }, // ES256
			],
			timeout: 60000,
			attestation: 'none',
			authenticatorSelection: {
				residentKey: 'required',
				requireResidentKey: true,
				userVerification: 'preferred',
			},
		},
	};
}

/**
 * Generate authentication options and a random challenge.
 * @param {{ rpId: string }} opts
 * @returns {{ challenge: string, options: object }}
 */
export function createAuthenticationOptions({ rpId }) {
	const challenge = toBase64url(crypto.getRandomValues(new Uint8Array(32)));
	return {
		challenge,
		options: {
			challenge,
			timeout: 60000,
			rpId,
			allowCredentials: [],
			userVerification: 'preferred',
		},
	};
}

/**
 * Verify a WebAuthn registration response.
 * @param {{ credential: object, expectedChallenge: string, expectedOrigin: string, expectedRPID: string }} opts
 * @returns {Promise<{ credentialId: string, publicKey: string, counter: number, transports: string[] }>}
 */
export async function verifyRegistration({
	credential,
	expectedChallenge,
	expectedOrigin,
	expectedRPID,
}) {
	const { response } = /** @type {any} */ (credential);

	const clientDataJSON = fromBase64url(response.clientDataJSON);
	const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

	if (clientData.type !== 'webauthn.create') {
		throw new Error('Invalid type');
	}
	if (clientData.origin !== expectedOrigin) {
		throw new Error('Origin mismatch');
	}
	if (clientData.challenge !== expectedChallenge) {
		throw new Error('Challenge mismatch');
	}

	const attestationObject = fromBase64url(response.attestationObject);
	const attestation = /** @type {Map<string,unknown>} */ (decodeCbor(attestationObject));
	const authData = /** @type {Uint8Array} */ (attestation.get('authData'));

	const { rpIdHash, userPresent, credentialId, coseKey } = parseAuthData(authData);
	if (!userPresent) {
		throw new Error('User not present');
	}
	if (!credentialId || !coseKey) {
		throw new Error('No credential data in authData');
	}

	const expectedHash = new Uint8Array(
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expectedRPID)),
	);
	if (
		!expectedHash.every((b, i) => {
			return b === rpIdHash[i];
		})
	) {
		throw new Error('RP ID hash mismatch');
	}

	const publicKey = coseToPublicKey(coseKey);
	const view = new DataView(authData.buffer, authData.byteOffset);
	const counter = view.getUint32(33, false);

	return {
		credentialId: toBase64url(credentialId),
		publicKey: toBase64url(publicKey),
		counter,
		transports: response.transports ?? [],
	};
}

/**
 * Verify a WebAuthn authentication response.
 * @param {{ credential: object, expectedChallenge: string, expectedOrigin: string, expectedRPID: string, storedPublicKey: string, storedCounter: number }} opts
 * @returns {Promise<{ newCounter: number }>}
 */
export async function verifyAuthentication({
	credential,
	expectedChallenge,
	expectedOrigin,
	expectedRPID,
	storedPublicKey,
	storedCounter,
}) {
	const { response } = /** @type {any} */ (credential);

	const clientDataJSON = fromBase64url(response.clientDataJSON);
	const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

	if (clientData.type !== 'webauthn.get') {
		throw new Error('Invalid type');
	}
	if (clientData.origin !== expectedOrigin) {
		throw new Error('Origin mismatch');
	}
	if (clientData.challenge !== expectedChallenge) {
		throw new Error('Challenge mismatch');
	}

	const authData = fromBase64url(response.authenticatorData);
	const { rpIdHash, userPresent, counter } = parseAuthData(authData);

	if (!userPresent) {
		throw new Error('User not present');
	}

	const expectedHash = new Uint8Array(
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expectedRPID)),
	);
	if (
		!expectedHash.every((b, i) => {
			return b === rpIdHash[i];
		})
	) {
		throw new Error('RP ID hash mismatch');
	}

	// Replay attack guard (counter === 0 means authenticator doesn't use counters)
	if (storedCounter !== 0 && counter <= storedCounter) {
		throw new Error('Counter not incremented — possible cloned authenticator');
	}

	// Signed data = authData ‖ SHA-256(clientDataJSON)
	const clientDataHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataJSON));
	const verData = new Uint8Array(authData.length + 32);
	verData.set(authData, 0);
	verData.set(clientDataHash, authData.length);

	const publicKeyBytes = fromBase64url(storedPublicKey);
	const publicKey = await crypto.subtle.importKey(
		'raw',
		publicKeyBytes,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['verify'],
	);

	const rawSig = derToRaw(fromBase64url(response.signature));
	const valid = await crypto.subtle.verify(
		{ name: 'ECDSA', hash: 'SHA-256' },
		publicKey,
		rawSig,
		verData,
	);
	if (!valid) {
		throw new Error('Signature verification failed');
	}

	return { newCounter: counter };
}
