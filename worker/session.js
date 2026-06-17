import { toBase64url, fromBase64url } from './utils.js';

const SESSION_COOKIE = 'msgsession';
const SESSION_DAYS = 30;

/** @param {string} secretB64 */
async function importKey(secretB64) {
	return crypto.subtle.importKey(
		'raw',
		fromBase64url(secretB64),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify'],
	);
}

/**
 * Create a signed session cookie value.
 * @param {string} sessionSecret  base64url
 * @param {string} userId
 */
export async function createSession(sessionSecret, userId) {
	const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
	const payload = toBase64url(new TextEncoder().encode(JSON.stringify({ userId, exp })));
	const key = await importKey(sessionSecret);
	const sig = new Uint8Array(
		await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)),
	);
	return `${payload}.${toBase64url(sig)}`;
}

/**
 * Verify a session cookie value; returns userId or null.
 * @param {string} sessionSecret
 * @param {string} cookie
 * @returns {Promise<string | null>}
 */
export async function verifySession(sessionSecret, cookie) {
	const dot = cookie.lastIndexOf('.');
	if (dot < 0) {
		return null;
	}
	const payload = cookie.slice(0, dot);
	const sig = cookie.slice(dot + 1);
	try {
		const key = await importKey(sessionSecret);
		const valid = await crypto.subtle.verify(
			'HMAC',
			key,
			fromBase64url(sig),
			new TextEncoder().encode(payload),
		);
		if (!valid) {
			return null;
		}
		const data = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
		if (data.exp < Math.floor(Date.now() / 1000)) {
			return null;
		}
		return data.userId ?? null;
	} catch {
		return null;
	}
}

/**
 * Extract and verify the session from a Request's Cookie header.
 * @param {Request} request
 * @param {string | undefined} sessionSecret
 * @returns {Promise<string | null>}
 */
export async function getSessionUser(request, sessionSecret) {
	if (!sessionSecret) {
		return null;
	}
	const header = request.headers.get('Cookie') ?? '';
	const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
	if (!match) {
		return null;
	}
	return verifySession(sessionSecret, match[1]);
}

/**
 * Build the Set-Cookie header value.
 * @param {string} value
 * @param {boolean} [clear]
 */
export function sessionCookieHeader(value, clear = false) {
	const maxAge = clear ? 0 : SESSION_DAYS * 86400;
	return `${SESSION_COOKIE}=${clear ? '' : value}; HttpOnly; Secure; SameSite=Lax; Path=/apps/messages; Max-Age=${maxAge}`;
}
