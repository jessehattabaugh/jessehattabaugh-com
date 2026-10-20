import { createUser, getUserById, getUserByEmailAny, createPasskey, getPasskeyById, updatePasskeyCounter, createChallenge, consumeChallenge, getOrCreateConversation, normalizeEmail, getEmailVerification, completeEmailVerification } from '../shared/data/messages.js';
import { verifyRegistration, verifyAuthentication, createRegistrationOptions, createAuthenticationOptions } from './webauthn.js';
import { createSession, sessionCookieHeader } from './session.js';
import { sessionUser, emailVerification, validEmail, returnTarget } from './auth.js';
import { notifyNewMessage } from './message-notifications.js';
import { render } from '../shared/html.js';
import { authPage, authFragment } from '../shared/templates/auth.js';
import { paths } from '../shared/routes.js';
import { SECURITY_HEADERS } from './security-headers.js';
import { readForm, readJson } from './request.js';
import { json, redirect } from './responses.js';

/** @param {Request} request @param {import('../shared/templates/auth.js').AuthData} data @param {number} [status] */
function authResponse(request, data, status = 200) {
	return new Response(render(request.headers.get('X-Fragment') === 'true' ? authFragment(data) : authPage(data)), {
		status, headers: { 'Content-Type': 'text/html;charset=utf-8', Vary: 'X-Fragment', 'Cache-Control': 'no-store', ...SECURITY_HEADERS },
	});
}

/** @param {Request} request @param {import('../shared/types.js').Env} env @param {import('../shared/templates/auth.js').AuthData} [extra] @param {number} [status] */
async function renderAccountPage(request, env, extra = {}, status = 200) {
	const user = await sessionUser(request, env);
	if (!user) { return redirect(paths.login, {}, 302); }
	const url = new URL(request.url);
	return authResponse(request, { user, screen: 'profile', returnTo: returnTarget(url.searchParams.get('returnTo')), notice: url.searchParams.has('checkEmail') ? 'Check your email to confirm your request.' : undefined, ...extra, values: { email: user.email ?? '', ...extra.values } }, status);
}

/** @param {Request} request @param {import('../shared/types.js').Env} env */
export async function handleAuthApi(request, env) {
	const url = new URL(request.url);
	const path = url.pathname;
	if (path === paths.login) {
		if (request.method === 'GET') {
			const response = authResponse(request, { user: await sessionUser(request, env), returnTo: returnTarget(url.searchParams.get('returnTo')), screen: 'login', notice: url.searchParams.has('checkEmail') ? 'Check your email to confirm your request.' : undefined });
			return response;
		}
		const form = await readForm(request);
		const returnTo = returnTarget(form.get('returnTo'));
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		if (!name || name.length > 100 || !validEmail(email)) {
			return authResponse(request, { user: await sessionUser(request, env), screen: 'login', returnTo, error: 'Enter your name and a valid email address.', values: { name, email } }, 422);
		}
		let user = await getUserByEmailAny(env.DB, email);
		if (!user) {
			const id = crypto.randomUUID();
			await createUser(env.DB, { id, displayName: name, email });
			user = await getUserById(env.DB, id);
		}
		if (!user) { throw new Error('Account missing'); }
		await emailVerification(env, request, { userId: user.id, email, name, returnTo, purpose: 'login' });
		return redirect(`${paths.login}?checkEmail=1&returnTo=${encodeURIComponent(returnTo)}`);
	}
	if (path === paths.verify) {
		const token = request.method === 'GET' ? url.searchParams.get('token') : String((await readForm(request)).get('token') ?? '');
		const verification = token ? await getEmailVerification(env.DB, token) : null;
		if (!verification || verification.expires_at < Date.now() || verification.consumed_at) {
			return authResponse(request, { user: await sessionUser(request, env), screen: 'verify', error: 'That verification link has expired or is invalid.' }, 400);
		}
		if (request.method === 'GET') {
			return authResponse(request, { user: await sessionUser(request, env), screen: 'verify', token: verification.id });
		}
		if (!env.SESSION_SECRET) { throw new Error('Session signing is not configured'); }
		const user = await getUserById(env.DB, verification.user_id);
		if (!user || (verification.purpose !== 'profile' && user.email !== verification.email)) {
			return authResponse(request, { user: await sessionUser(request, env), screen: 'verify', error: 'That verification link is no longer valid.' }, 400);
		}
		if (verification.purpose === 'profile') {
			const existing = await getUserByEmailAny(env.DB, verification.email);
			if (existing && existing.id !== user.id) {
				return authResponse(request, { user: await sessionUser(request, env), screen: 'verify', error: 'That email belongs to another account.' }, 409);
			}
		}
		let content = null;
		if (verification.purpose === 'guest-message') {
			const payload = JSON.parse(verification.payload ?? '{}');
			content = payload.message ? String(payload.message).trim() : null;
			if (content !== null && (!content || content.length > 10000)) { throw new Error('Invalid held message'); }
		}
		// Prepare the cookie before committing so signing failures cannot burn proof.
		const cookie = sessionCookieHeader(await createSession(env.SESSION_SECRET, user.id));
		const completed = await completeEmailVerification(env.DB, verification, content);
		if (!completed) {
			return authResponse(request, { user: await sessionUser(request, env), screen: 'verify', error: 'That verification link has already been used or is no longer valid.' }, 400);
		}
		if (completed.content && completed.conversationId) {
			// Push is best effort after commit; delivery failures must not prevent
			// the sender receiving their session and successful POST redirect.
			try {
				await notifyNewMessage(env, { conversationId: completed.conversationId, senderIsOwner: !!user.is_owner, senderName: user.display_name, content: completed.content, verified: true });
			} catch (error) { console.error('Message notification failed', error); }
		}
		const destination = verification.purpose === 'guest-message' ? paths.messages : returnTarget(JSON.parse(verification.payload ?? '{}').returnTo);
		const response = redirect(destination + (completed.content ? '?verified=1' : ''), { 'Set-Cookie': cookie });
		return response;
	}
	if (path === paths.logout) {
		const form = await readForm(request);
		return redirect(returnTarget(form.get('returnTo')), { 'Set-Cookie': sessionCookieHeader('', true) });
	}
	const user = await sessionUser(request, env);
	if (path === paths.profile) {
		if (!user) { return redirect(paths.login, {}, 302); }
		if (request.method === 'GET') { return renderAccountPage(request, env); }
		const form = await readForm(request);
		const returnTo = returnTarget(form.get('returnTo'));
		const email = normalizeEmail(String(form.get('email') ?? ''));
		if (!validEmail(email)) { return renderAccountPage(request, env, { returnTo, error: 'Enter a valid recovery email address.', values: { email } }, 422); }
		const existing = await getUserByEmailAny(env.DB, email);
		if (existing && existing.id !== user.id) { return renderAccountPage(request, env, { returnTo, error: 'That email belongs to another account.', values: { email } }, 409); }
		await emailVerification(env, request, { userId: user.id, email, name: user.display_name, returnTo, purpose: 'profile' });
		return redirect(`${paths.profile}?checkEmail=1&returnTo=${encodeURIComponent(returnTo)}`);
	}
	// Credential APIs are protocol exchanges; every sign-in also has the email-form path.
	const { hostname: rpId, origin } = url;
	if (path === paths.registerBegin) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const { challenge, options } = createRegistrationOptions({ rpName: 'Jesse Hattabaugh', rpId, userId: user.id, displayName: user.display_name });
		const challengeId = crypto.randomUUID();
		await createChallenge(env.DB, { id: challengeId, challenge, userId: user.id, type: 'register' });
		return json({ challengeId, options, returnTo: returnTarget((await readForm(request)).get('returnTo')) });
	}
	if (path === paths.loginBegin) {
		const { challenge, options } = createAuthenticationOptions({ rpId });
		const challengeId = crypto.randomUUID();
		await createChallenge(env.DB, { id: challengeId, challenge, type: 'login' });
		return json({ challengeId, options, returnTo: returnTarget((await readForm(request)).get('returnTo')) });
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
		if (!authenticatedUser.is_owner) { await getOrCreateConversation(env.DB, authenticatedUser.id); }
		return json({ location: returnTarget(body.returnTo) }, 200, { 'Set-Cookie': sessionCookieHeader(await createSession(env.SESSION_SECRET, authenticatedUser.id)) });
	}
	return null;
}
