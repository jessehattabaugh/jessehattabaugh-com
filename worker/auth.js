import { createUser, getUserById, getUserByEmailAny, getOwner, claimOwner, createPasskey, getPasskeyById, updatePasskeyCounter, createChallenge, consumeChallenge, normalizeEmail, createEmailVerification, getEmailVerification, completeEmailVerification, deleteEmailVerification } from '../shared/data/auth.js';
import { verifyRegistration, verifyAuthentication, createRegistrationOptions, createAuthenticationOptions } from './webauthn.js';
import { sessionUser, createSession, sessionCookieHeader } from './session.js';
import { notifyNewMessage } from './message-notifications.js';
import { render, html } from '../shared/html.js';
import { authPage, authFragment } from '../shared/templates/auth.js';
import { paths, legacyAuthPaths } from '../shared/routes.js';
import { ServiceError, readForm, readJson } from './request.js';

/** Only server-defined destinations are accepted, never arbitrary redirect URLs. */
/** @param {string | null | undefined} destination */
export function returnDestination(destination) {
	if (destination === 'lightsfinder' || destination === paths.lightsfinder) { return paths.lightsfinder; }
	if (destination === 'messages' || destination === paths.messages) { return paths.messages; }
	return paths.account;
}

/** Destination travels with the proof, including when email opens on another device. */
/** @param {import('../shared/data/auth.js').EmailVerification} verification @param {Request} request */
function verificationReturn(verification, request) {
	if (verification.purpose === 'guest-message') { return paths.messages; }
	if (verification.purpose === 'profile') { return paths.account; }
	const payload = JSON.parse(verification.payload ?? '{}');
	// Previously issued links had no destination; retain their old behavior.
	if (!verification.payload) {
		return /(?:^|;\s*)__Host-appReturn=lightsfinder(?:;|$)/.test(request.headers.get('Cookie') ?? '') ? paths.lightsfinder : paths.messages;
	}
	return returnDestination(payload.returnTo);
}

/** @param {unknown} data @param {number} [status] @param {Record<string,string>} [headers] */
function json(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
/** @param {string} href @param {Record<string,string>} [headers] @param {number} [status] */
function redirect(href, headers = {}, status = 303) {
	return new Response(null, { status, headers: { Location: href, ...headers } });
}
/** @param {Request} request @param {import('../shared/templates/auth.js').AuthData} data @param {number} [status] */
function page(request, data, status = 200) {
	return new Response(render(request.headers.get('X-Fragment') === 'true' ? authFragment(data) : authPage(data)), {
		status, headers: { 'Content-Type': 'text/html;charset=utf-8', Vary: 'X-Fragment' },
	});
}
/** @param {Request} request @param {import('../shared/types.js').Env} env @param {import('../shared/templates/auth.js').AuthData} [extra] @param {number} [status] */
async function renderAccount(request, env, extra = {}, status = 200) {
	const user = await sessionUser(request, env);
	if (!user) { return redirect(paths.login, {}, 302); }
	return page(request, {
		screen: 'account', user, canSetup: !!env.OWNER_SETUP_TOKEN && user.email_verified === 1 && !user.is_owner && !(await getOwner(env.DB)),
		notice: new URL(request.url).searchParams.has('checkEmail') ? 'Check your email to confirm your request.' : undefined,
		...extra, values: { email: user.email ?? '', ...extra.values },
	}, status);
}

/** @param {string} email */
export function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }

/**
 * Delivery failures are failures, never a misleading "check your inbox" success.
 * No raw binding errors are shown to the user; the outer Worker renders 500.
 * @param {import('../shared/types.js').Env} env
 * @param {Request} request
 * @param {{ userId: string, email: string, purpose: string, message?: string, name: string, returnTo?: string }} data
 */
export async function emailVerification(env, request, data) {
	if (!env.EMAIL || !env.EMAIL_FROM || !env.SESSION_SECRET) {
		if (!env.EMAIL) { throw new ServiceError('EMAIL_BINDING_MISSING'); }
		if (!env.EMAIL_FROM) { throw new ServiceError('EMAIL_SENDER_MISSING'); }
		throw new ServiceError('SESSION_SECRET_MISSING');
	}
	const token = crypto.randomUUID();
	await createEmailVerification(env.DB, {
		id: token, userId: data.userId, email: data.email, purpose: data.purpose,
		payload: JSON.stringify({ name: data.name, message: data.message, returnTo: returnDestination(data.returnTo ?? (data.purpose === 'guest-message' ? 'messages' : 'account')) }),
	});
	const link = new URL(paths.verify, request.url);
	link.searchParams.set('token', token);
	try {
		await env.EMAIL.send({
			to: data.email, from: env.EMAIL_FROM,
			subject: 'Confirm your jessehattabaugh.com account',
			text: `Hi ${data.name},\n\nConfirm your email to continue: ${link}\n\nThis link expires in 15 minutes and can be used once. Ignore it if you did not make this request.`,
			html: html`<p>Hi ${data.name},</p><p><a href="${link.toString()}">Confirm your email</a></p><p>This link expires in 15 minutes and can be used once. Ignore it if you did not make this request.</p>`.value,
		});
	} catch (error) {
		await deleteEmailVerification(env.DB, token);
		const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
		const known = ['E_SENDER_NOT_VERIFIED', 'E_SENDER_DOMAIN_NOT_AVAILABLE', 'E_RECIPIENT_NOT_ALLOWED', 'E_RECIPIENT_SUPPRESSED', 'E_VALIDATION_ERROR', 'E_FIELD_MISSING', 'E_UNVERIFIED_SENDER', 'E_INVALID_EMAIL', 'E_INVALID_ARGUMENT', 'E_DELIVERY_FAILED', 'E_RATE_LIMIT_EXCEEDED', 'E_DAILY_LIMIT_EXCEEDED', 'E_INTERNAL_SERVER_ERROR', 'E_UNAUTHORIZED', 'E_NOT_AUTHORIZED'];
		throw new ServiceError(known.includes(code) ? code : 'EMAIL_DELIVERY_FAILED', error);
	}
}

/** @param {Request} request @param {import('../shared/types.js').Env} env */
export async function handleAuth(request, env) {
	const url = new URL(request.url);
	const path = legacyAuthPaths[url.pathname] ?? url.pathname;
	const returnTo = returnDestination(url.searchParams.get('returnTo'));
	if (path === paths.account) { return renderAccount(request, env); }
	if (path === paths.login) {
		if (request.method === 'GET') {
			return page(request, { screen: 'login', returnTo, notice: url.searchParams.has('checkEmail') ? 'Check your email to confirm your request.' : undefined });
		}
		const form = await readForm(request);
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		if (!name || name.length > 100 || !validEmail(email)) {
			return page(request, { screen: 'login', returnTo, error: 'Enter your name and a valid email address.', values: { name, email } }, 422);
		}
		let user = await getUserByEmailAny(env.DB, email);
		if (!user) {
			const id = crypto.randomUUID();
			await createUser(env.DB, { id, displayName: name, email });
			user = await getUserById(env.DB, id);
		}
		if (!user) { throw new Error('Account missing'); }
		await emailVerification(env, request, { userId: user.id, email, name, purpose: 'login', returnTo });
		return redirect(`${paths.login}?returnTo=${encodeURIComponent(returnTo)}&checkEmail=1`);
	}
	if (path === paths.verify) {
		const token = request.method === 'GET' ? url.searchParams.get('token') : String((await readForm(request)).get('token') ?? '');
		const verification = token ? await getEmailVerification(env.DB, token) : null;
		if (!verification || verification.expires_at < Date.now() || verification.consumed_at) {
			return page(request, { screen: 'verify', returnTo: verification ? verificationReturn(verification, request) : paths.account, error: 'That verification link has expired or is invalid.' }, 400);
		}
		if (request.method === 'GET') {
			return page(request, { screen: 'verify', token: verification.id, returnTo: verificationReturn(verification, request) });
		}
		if (!env.SESSION_SECRET) { throw new Error('Session signing is not configured'); }
		const user = await getUserById(env.DB, verification.user_id);
		if (!user || (verification.purpose !== 'profile' && user.email !== verification.email)) {
			return page(request, { screen: 'verify', error: 'That verification link is no longer valid.' }, 400);
		}
		if (verification.purpose === 'profile') {
			const existing = await getUserByEmailAny(env.DB, verification.email);
			if (existing && existing.id !== user.id) {
				return page(request, { screen: 'verify', error: 'That email belongs to another account.' }, 409);
			}
		}
		let content = null;
		if (verification.purpose === 'guest-message') {
			const payload = JSON.parse(verification.payload ?? '{}');
			content = String(payload.message ?? '').trim();
			if (!content || content.length > 10000) { throw new Error('Invalid held message'); }
		}
		// Prepare the cookie before committing so signing failures cannot burn proof.
		const cookie = sessionCookieHeader(await createSession(env.SESSION_SECRET, user.id));
		const completed = await completeEmailVerification(env.DB, verification, content);
		if (!completed) {
			return page(request, { screen: 'verify', error: 'That verification link has already been used or is no longer valid.' }, 400);
		}
		if (content && completed.conversationId) {
			// Push is best effort after commit; delivery failures must not prevent
			// the sender receiving their session and successful POST redirect.
			try {
				await notifyNewMessage(env, { conversationId: completed.conversationId, senderIsOwner: !!user.is_owner, senderName: user.display_name, content });
			} catch (error) { console.error('Message notification failed', error); }
		}
		return redirect(verificationReturn(verification, request) + (content ? '?sent=1' : ''), { 'Set-Cookie': cookie });
	}
	if (path === paths.logout) {
		const form = await readForm(request);
		return redirect(returnDestination(String(form.get('returnTo') ?? 'account')), { 'Set-Cookie': sessionCookieHeader('', true) });
	}
	const user = await sessionUser(request, env);
	if (path === paths.profile) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const email = normalizeEmail(String((await readForm(request)).get('email') ?? ''));
		if (!validEmail(email)) { return renderAccount(request, env, { error: 'Enter a valid recovery email address.', values: { email } }, 422); }
		const existing = await getUserByEmailAny(env.DB, email);
		if (existing && existing.id !== user.id) { return renderAccount(request, env, { error: 'That email belongs to another account.', values: { email } }, 409); }
		await emailVerification(env, request, { userId: user.id, email, name: user.display_name, purpose: 'profile' });
		return redirect(`${paths.account}?checkEmail=1`);
	}
	if (path === paths.setup) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const token = String((await readForm(request)).get('setupToken') ?? '');
		if (!env.OWNER_SETUP_TOKEN || token !== env.OWNER_SETUP_TOKEN) {
			return renderAccount(request, env, { error: 'The owner setup token is invalid.' }, 422);
		}
		if (!(await claimOwner(env.DB, user.id))) {
			return renderAccount(request, env, { error: 'A site owner has already been configured.' }, 409);
		}
		return redirect(paths.account);
	}
	// Credential APIs are protocol exchanges; every sign-in also has the email-form path.
	const { hostname: rpId, origin } = url;
	if (path === paths.registerBegin) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const { challenge, options } = createRegistrationOptions({ rpName: 'Jesse Hattabaugh', rpId, userId: user.id, displayName: user.display_name });
		const challengeId = crypto.randomUUID();
		await createChallenge(env.DB, { id: challengeId, challenge, userId: user.id, type: 'register' });
		return json({ challengeId, options });
	}
	if (path === paths.loginBegin) {
		const { challenge, options } = createAuthenticationOptions({ rpId });
		const challengeId = crypto.randomUUID();
		await createChallenge(env.DB, { id: challengeId, challenge, type: 'login' });
		return json({ challengeId, options });
	}
	if (path === paths.registerComplete || path === paths.loginComplete) {
		const body = /** @type {any} */ (await readJson(request));
		const stored = await consumeChallenge(env.DB, String(body.challengeId ?? ''));
		const registration = path === paths.registerComplete;
		if (!stored || stored.expires_at < Date.now() || stored.type !== (registration ? 'register' : 'login')) {
			return json({ error: 'The credential request expired. Please try again.' }, 422);
		}
		let authenticatedUser = user;
		if (registration) {
			if (!user || user.id !== stored.user_id) { return redirect(paths.login, {}, 302); }
			let info;
			try {
				info = await verifyRegistration({ credential: body.credential, expectedChallenge: stored.challenge, expectedOrigin: origin, expectedRPID: rpId });
			} catch (error) {
				console.error(error);
				return json({ error: 'The passkey could not be verified.' }, 422);
			}
			await createPasskey(env.DB, { id: info.credentialId, userId: user.id, publicKey: info.publicKey, counter: info.counter, transports: info.transports });
		} else {
			const passkey = await getPasskeyById(env.DB, String(body.credential?.id ?? ''));
			if (!passkey) { return json({ error: 'The passkey could not be verified.' }, 422); }
			let info;
			try {
				info = await verifyAuthentication({ credential: body.credential, expectedChallenge: stored.challenge, expectedOrigin: origin, expectedRPID: rpId, storedPublicKey: passkey.public_key, storedCounter: passkey.counter });
			} catch (error) {
				console.error(error);
				return json({ error: 'The passkey could not be verified.' }, 422);
			}
			await updatePasskeyCounter(env.DB, { id: passkey.id, counter: info.newCounter });
			authenticatedUser = await getUserById(env.DB, passkey.user_id);
		}
		if (!authenticatedUser) {
			return json({ error: 'The account could not be found.' }, 422);
		}
		return json({ location: registration ? paths.account : returnTo }, 200, { 'Set-Cookie': sessionCookieHeader(await createSession(env.SESSION_SECRET, authenticatedUser.id)) });
	}
	return null;
}
