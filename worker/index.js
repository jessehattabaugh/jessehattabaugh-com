import { render } from '../shared/html.js';
import { contact } from '../shared/templates/contact.js';
import {
	contactSubmissionsAuth,
	contactSubmissionsList,
} from '../shared/templates/contact-submissions.js';
import { error as errorPage } from '../shared/templates/error.js';
import {
	deleteContactMessage,
	insertContactMessage,
	listContactMessages,
} from '../shared/data/contact.js';

const SECURITY_HEADERS = {
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'",
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
};

const textEncoder = new TextEncoder();
const ADMIN_AUTH_COOKIE = 'admin_contact_auth';
const ADMIN_AUTH_STATE_COOKIE = 'admin_contact_auth_state';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const ADMIN_STATE_TTL_SECONDS = 60 * 5;

/**
 * @param {string} html
 * @param {number} [status]
 * @returns {Response}
 */
function htmlResponse(html, status = 200) {
	return new Response(html, {
		status,
		headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS },
	});
}

/**
 * @param {string} value
 * @returns {Uint8Array}
 */
function fromBase64Url(value) {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * @param {ArrayBuffer | Uint8Array} value
 * @returns {string}
 */
function toBase64Url(value) {
	const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * @param {string | null} cookieHeader
 * @returns {Record<string, string>}
 */
function parseCookies(cookieHeader) {
	const cookies = /** @type {Record<string, string>} */ ({});
	if (!cookieHeader) {
		return cookies;
	}
	for (const part of cookieHeader.split(';')) {
		const index = part.indexOf('=');
		if (index === -1) {
			continue;
		}
		const key = part.slice(0, index).trim();
		const value = part.slice(index + 1).trim();
		cookies[key] = value;
	}
	return cookies;
}

/**
 * @param {string} name
 * @param {string} value
 * @param {{ maxAge: number, path: string }} opts
 * @returns {string}
 */
function buildCookie(name, value, opts) {
	return `${name}=${value}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * @param {Uint8Array} left
 * @param {Uint8Array} right
 * @returns {boolean}
 */
function timingSafeEqual(left, right) {
	if (left.length !== right.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < left.length; i++) {
		diff |= left[i] ^ right[i];
	}
	return diff === 0;
}

/**
 * @param {string} secret
 * @param {string} payload
 * @returns {Promise<string>}
 */
async function signPayload(secret, payload) {
	const key = await crypto.subtle.importKey(
		'raw',
		textEncoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
	return toBase64Url(signature);
}

/**
 * @param {string} secret
 * @param {unknown} payload
 * @returns {Promise<string>}
 */
async function createSignedToken(secret, payload) {
	const encodedPayload = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
	const signature = await signPayload(secret, encodedPayload);
	return `${encodedPayload}.${signature}`;
}

/**
 * @param {string} secret
 * @param {string | undefined} token
 * @returns {Promise<any | null>}
 */
async function verifySignedToken(secret, token) {
	if (!token) {
		return null;
	}
	const [encodedPayload, encodedSignature] = token.split('.');
	if (!encodedPayload || !encodedSignature) {
		return null;
	}
	const expectedSignature = await signPayload(secret, encodedPayload);
	if (!timingSafeEqual(fromBase64Url(encodedSignature), fromBase64Url(expectedSignature))) {
		return null;
	}
	try {
		return JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
	} catch {
		return null;
	}
}

/**
 * @param {import('../shared/types.js').Env} env
 * @param {Request} request
 * @returns {{ secret: string, credentialId: string, publicKey: string, rpId: string, origin: string } | null}
 */
function getAdminConfig(env, request) {
	if (
		!env.ADMIN_AUTH_SECRET ||
		!env.ADMIN_WEBAUTHN_CREDENTIAL_ID ||
		!env.ADMIN_WEBAUTHN_PUBLIC_KEY
	) {
		return null;
	}
	const url = new URL(request.url);
	return {
		secret: env.ADMIN_AUTH_SECRET,
		credentialId: env.ADMIN_WEBAUTHN_CREDENTIAL_ID,
		publicKey: env.ADMIN_WEBAUTHN_PUBLIC_KEY,
		rpId: env.ADMIN_WEBAUTHN_RP_ID ?? url.hostname,
		origin: env.ADMIN_WEBAUTHN_ORIGIN ?? url.origin,
	};
}

/**
 * @param {string} value
 * @returns {Promise<CryptoKey>}
 */
async function importWebAuthnPublicKey(value) {
	const cleaned = value.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, '');
	return crypto.subtle.importKey(
		'spki',
		fromBase64Url(cleaned.replace(/\+/g, '-').replace(/\//g, '_')),
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['verify'],
	);
}

/**
 * @param {Uint8Array} signature
 * @returns {Uint8Array | null}
 */
function derToRawEcdsaSignature(signature) {
	if (signature.length < 8 || signature[0] !== 0x30) {
		return null;
	}
	const totalLength = signature[1];
	if (totalLength + 2 !== signature.length) {
		return null;
	}
	if (signature[2] !== 0x02) {
		return null;
	}
	const rLength = signature[3];
	const rStart = 4;
	const sMarker = rStart + rLength;
	if (signature[sMarker] !== 0x02) {
		return null;
	}
	const sLength = signature[sMarker + 1];
	const sStart = sMarker + 2;
	const r = signature.slice(rStart, rStart + rLength);
	const s = signature.slice(sStart, sStart + sLength);
	const raw = new Uint8Array(64);
	raw.set(r.slice(Math.max(0, r.length - 32)), 32 - Math.min(32, r.length));
	raw.set(s.slice(Math.max(0, s.length - 32)), 64 - Math.min(32, s.length));
	return raw;
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<{ config: NonNullable<ReturnType<typeof getAdminConfig>>, session: any | null } | null>}
 */
async function getAdminSession(request, env) {
	const config = getAdminConfig(env, request);
	if (!config) {
		return null;
	}
	const cookies = parseCookies(request.headers.get('cookie'));
	const session = await verifySignedToken(config.secret, cookies[ADMIN_AUTH_COOKIE]);
	if (!session || typeof session.exp !== 'number' || session.exp < Date.now()) {
		return { config, session: null };
	}
	return { config, session };
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleAdminContactGet(request, env) {
	const state = await getAdminSession(request, env);
	if (!state) {
		return htmlResponse(
			render(errorPage({ message: 'WebAuthn admin access is not configured.' })),
			500,
		);
	}

	if (state.session) {
		const messages = await listContactMessages(env.DB);
		return htmlResponse(render(contactSubmissionsList({ messages })));
	}

	const challenge = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
	const authState = await createSignedToken(state.config.secret, {
		challenge,
		exp: Date.now() + ADMIN_STATE_TTL_SECONDS * 1000,
	});

	const response = htmlResponse(
		render(
			contactSubmissionsAuth({
				challenge,
				credentialId: state.config.credentialId,
				rpId: state.config.rpId,
			}),
		),
		401,
	);
	response.headers.append(
		'Set-Cookie',
		buildCookie(ADMIN_AUTH_STATE_COOKIE, authState, {
			maxAge: ADMIN_STATE_TTL_SECONDS,
			path: '/admin/contact-submissions/auth',
		}),
	);
	return response;
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleAdminAuthPost(request, env) {
	const state = await getAdminSession(request, env);
	if (!state) {
		return htmlResponse(
			render(errorPage({ message: 'WebAuthn admin access is not configured.' })),
			500,
		);
	}

	const cookies = parseCookies(request.headers.get('cookie'));
	const authState = await verifySignedToken(
		state.config.secret,
		cookies[ADMIN_AUTH_STATE_COOKIE],
	);
	if (!authState || typeof authState.exp !== 'number' || authState.exp < Date.now()) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: toBase64Url(crypto.getRandomValues(new Uint8Array(32))),
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication session expired. Try again.',
				}),
			),
			401,
		);
	}

	const form = await request.formData();
	const credentialId = (form.get('credentialId') ?? '').toString().trim();
	const clientDataJSON = (form.get('clientDataJSON') ?? '').toString().trim();
	const authenticatorData = (form.get('authenticatorData') ?? '').toString().trim();
	const signature = (form.get('signature') ?? '').toString().trim();

	if (!credentialId || !clientDataJSON || !authenticatorData || !signature) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: authState.challenge,
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication failed. Missing assertion data.',
				}),
			),
			401,
		);
	}

	if (credentialId !== state.config.credentialId) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: authState.challenge,
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication failed. Unrecognized credential.',
				}),
			),
			401,
		);
	}

	const clientDataBytes = fromBase64Url(clientDataJSON);
	const authDataBytes = fromBase64Url(authenticatorData);
	const signatureBytes = fromBase64Url(signature);
	const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));

	if (clientData.type !== 'webauthn.get' || clientData.challenge !== authState.challenge) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: authState.challenge,
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication failed. Invalid challenge.',
				}),
			),
			401,
		);
	}

	if (clientData.origin !== state.config.origin || authDataBytes.length < 37) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: authState.challenge,
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication failed. Invalid authenticator data.',
				}),
			),
			401,
		);
	}

	const rpIdHash = new Uint8Array(
		await crypto.subtle.digest('SHA-256', textEncoder.encode(state.config.rpId)),
	);
	if (!timingSafeEqual(authDataBytes.slice(0, 32), rpIdHash)) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: authState.challenge,
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication failed. RP ID mismatch.',
				}),
			),
			401,
		);
	}

	if ((authDataBytes[32] & 0x01) === 0) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: authState.challenge,
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication failed. User presence check failed.',
				}),
			),
			401,
		);
	}

	const clientDataHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataBytes));
	const signedData = new Uint8Array(authDataBytes.length + clientDataHash.length);
	signedData.set(authDataBytes, 0);
	signedData.set(clientDataHash, authDataBytes.length);

	const publicKey = await importWebAuthnPublicKey(state.config.publicKey);
	let verified = await crypto.subtle.verify(
		{ name: 'ECDSA', hash: 'SHA-256' },
		publicKey,
		signatureBytes,
		signedData,
	);
	if (!verified) {
		const rawSignature = derToRawEcdsaSignature(signatureBytes);
		if (rawSignature) {
			verified = await crypto.subtle.verify(
				{ name: 'ECDSA', hash: 'SHA-256' },
				publicKey,
				rawSignature,
				signedData,
			);
		}
	}
	if (!verified) {
		return htmlResponse(
			render(
				contactSubmissionsAuth({
					challenge: authState.challenge,
					credentialId: state.config.credentialId,
					rpId: state.config.rpId,
					error: 'Authentication failed. Signature verification failed.',
				}),
			),
			401,
		);
	}

	const sessionToken = await createSignedToken(state.config.secret, {
		exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
	});
	const response = new Response(null, {
		status: 303,
		headers: {
			Location: new URL('/admin/contact-submissions', request.url).toString(),
			...SECURITY_HEADERS,
		},
	});
	response.headers.append(
		'Set-Cookie',
		buildCookie(ADMIN_AUTH_COOKIE, sessionToken, {
			maxAge: ADMIN_SESSION_TTL_SECONDS,
			path: '/admin/contact-submissions',
		}),
	);
	response.headers.append(
		'Set-Cookie',
		buildCookie(ADMIN_AUTH_STATE_COOKIE, '', {
			maxAge: 0,
			path: '/admin/contact-submissions/auth',
		}),
	);
	return response;
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleAdminDeletePost(request, env) {
	const state = await getAdminSession(request, env);
	if (!state || !state.session) {
		return new Response('Unauthorized', { status: 401, headers: SECURITY_HEADERS });
	}
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('application/x-www-form-urlencoded')) {
		return new Response('Unsupported Media Type', { status: 415, headers: SECURITY_HEADERS });
	}
	const form = await request.formData();
	const id = Number.parseInt((form.get('id') ?? '').toString(), 10);
	if (!Number.isInteger(id) || id <= 0) {
		return new Response('Bad Request', { status: 400, headers: SECURITY_HEADERS });
	}
	await deleteContactMessage(env.DB, id);
	return new Response(null, {
		status: 303,
		headers: {
			Location: new URL('/admin/contact-submissions', request.url).toString(),
			...SECURITY_HEADERS,
		},
	});
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleAdminLogoutPost(request, env) {
	const state = getAdminConfig(env, request);
	if (!state) {
		return htmlResponse(
			render(errorPage({ message: 'WebAuthn admin access is not configured.' })),
			500,
		);
	}
	const response = new Response(null, {
		status: 303,
		headers: {
			Location: new URL('/admin/contact-submissions', request.url).toString(),
			...SECURITY_HEADERS,
		},
	});
	response.headers.append(
		'Set-Cookie',
		buildCookie(ADMIN_AUTH_COOKIE, '', { maxAge: 0, path: '/admin/contact-submissions' }),
	);
	return response;
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleContactPost(request, env) {
	const contentType = request.headers.get('content-type') ?? '';
	if (
		!contentType.includes('application/x-www-form-urlencoded') &&
		!contentType.includes('multipart/form-data')
	) {
		return new Response('Unsupported Media Type', { status: 415, headers: SECURITY_HEADERS });
	}

	const form = await request.formData();
	const name = (form.get('name') ?? '').toString().trim();
	const email = (form.get('email') ?? '').toString().trim();
	const message = (form.get('message') ?? '').toString().trim();

	if (!name || !email || !message) {
		return htmlResponse(
			render(
				contact({ error: 'All fields are required.', values: { name, email, message } }),
			),
			422,
		);
	}

	// Basic email format check
	if (!email.includes('@')) {
		return htmlResponse(
			render(
				contact({
					error: 'Please enter a valid email address.',
					values: { name, email, message },
				}),
			),
			422,
		);
	}

	await insertContactMessage(env.DB, { name, email, message });

	// PRG: redirect after POST so browser back button doesn't re-submit
	return new Response(null, {
		status: 303,
		headers: { Location: new URL('/thanks', request.url).toString(), ...SECURITY_HEADERS },
	});
}

/** @type {ExportedHandler<import('../shared/types.js').Env>} */
export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		try {
			// GET /contact
			if (request.method === 'GET' && url.pathname === '/contact') {
				return htmlResponse(render(contact()));
			}

			// POST /contact
			if (request.method === 'POST' && url.pathname === '/contact') {
				return handleContactPost(request, env);
			}

			// Admin contact submissions
			if (request.method === 'GET' && url.pathname === '/admin/contact-submissions') {
				return handleAdminContactGet(request, env);
			}
			if (request.method === 'POST' && url.pathname === '/admin/contact-submissions/auth') {
				return handleAdminAuthPost(request, env);
			}
			if (request.method === 'POST' && url.pathname === '/admin/contact-submissions/delete') {
				return handleAdminDeletePost(request, env);
			}
			if (request.method === 'POST' && url.pathname === '/admin/contact-submissions/logout') {
				return handleAdminLogoutPost(request, env);
			}

			// Fall through to static assets
			return env.ASSETS.fetch(request);
		} catch (err) {
			console.error(err);
			return htmlResponse(render(errorPage()), 500);
		}
	},
};
