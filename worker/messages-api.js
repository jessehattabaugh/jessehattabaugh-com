import {
	createUser, getUserById, getUserByEmailAny, getOwner, claimOwner,
	createPasskey, getPasskeyById, updatePasskeyCounter,
	createChallenge, consumeChallenge, getOrCreateConversation, getConversation, getUserConversation,
	getAllConversations, getMessages, createMessage,
	savePushSubscription, getPushSubscriptionsByUser, getOwnerPushSubscriptions,
	deletePushSubscription, deleteUserPushSubscription, normalizeEmail,
	createEmailVerification, getEmailVerification, consumeEmailVerification,
	deleteEmailVerification, markEmailVerified, updateUserProfile,
} from '../shared/data/messages.js';
import {
	verifyRegistration, verifyAuthentication, createRegistrationOptions, createAuthenticationOptions,
} from './webauthn.js';
import { getSessionUser, createSession, sessionCookieHeader } from './session.js';
import { notifyAll } from './vapid.js';
import { render, html } from '../shared/html.js';
import { messagesPage, messagesFragment } from '../shared/templates/messages.js';
import { paths } from '../shared/routes.js';
import { SECURITY_HEADERS } from './security-headers.js';
import { readForm, readJson } from './request.js';

/** @param {unknown} data @param {number} [status] @param {Record<string, string>} [headers] */
function json(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

/** @param {string} href @param {Record<string, string>} [headers] @param {number} [status] */
function redirect(href, headers = {}, status = 303) {
	return new Response(null, { status, headers: { Location: href, ...headers } });
}

/** @param {Request} request @param {import('../shared/templates/messages.js').MessagesData} data @param {number} [status] */
function page(request, data, status = 200) {
	const fragment = request.headers.get('X-Fragment') === 'true';
	return new Response(render(fragment ? messagesFragment(data) : messagesPage(data)), {
		status,
		headers: { 'Content-Type': 'text/html;charset=utf-8', Vary: 'X-Fragment', 'Cache-Control': 'no-store', ...SECURITY_HEADERS },
	});
}

/** @param {Request} request @param {import('../shared/types.js').Env} env */
async function sessionUser(request, env) {
	const id = await getSessionUser(request, env.SESSION_SECRET);
	const user = id ? await getUserById(env.DB, id) : null;
	// This release's host-only cookie is issued only after email or passkey proof.
	// Legacy passkey accounts can enroll a recovery email after signing in.
	return user;
}

/** @param {Request} request @param {import('../shared/types.js').Env} env @param {import('../shared/templates/messages.js').MessagesData} [extra] @param {number} [status] */
async function renderMessagesPage(request, env, extra = {}, status = 200) {
	const user = await sessionUser(request, env);
	const url = new URL(request.url);
	if (!user && url.searchParams.has('conversationId')) {
		return redirect(paths.login, {}, 302);
	}
	/** @type {import('../shared/templates/messages.js').MessagesData} */
	const data = { user, notice: url.searchParams.has('sent') ? 'Message sent — Jesse will get back to you.' : undefined };
	if (url.searchParams.has('checkEmail')) {
		data.notice = 'Check your email to confirm your request.';
	}
	if (user) {
		data.values = { name: user.display_name, email: user.email ?? '' };
		data.canRegister = true;
		data.canUpdateEmail = true;
		data.canSetup = !!env.OWNER_SETUP_TOKEN && user.email_verified === 1 && !user.is_owner && !(await getOwner(env.DB));
		data.vapidPublicKey = env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : undefined;
		let conversationId = extra.conversationId ?? url.searchParams.get('conversationId') ?? undefined;
		if (user.is_owner) {
			data.conversations = (await getAllConversations(env.DB)).map((conversation) => ({
				id: conversation.id, display_name: conversation.display_name,
				href: `${paths.messages}?conversationId=${encodeURIComponent(conversation.id)}`,
			}));
		} else {
			const own = await getUserConversation(env.DB, user.id);
			if (conversationId && conversationId !== own?.id) {
				return page(request, { user, error: 'Conversation not found.' }, 404);
			}
			conversationId = own?.id;
		}
		if (conversationId) {
			const conversation = await getConversation(env.DB, conversationId);
			if (!conversation || (!user.is_owner && conversation.visitor_user_id !== user.id)) {
				return page(request, { user, error: 'Conversation not found.' }, 404);
			}
			data.conversationId = conversationId;
			data.refreshHref = `${paths.messages}?conversationId=${encodeURIComponent(conversationId)}`;
			data.messages = (await getMessages(env.DB, conversationId)).map((message) => ({
				...message, sent: message.sender_user_id === user.id,
			}));
		}
	}
	return page(request, { ...data, ...extra, values: { ...data.values, ...extra.values } }, status);
}

/** @param {string} email */
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }

/**
 * Delivery failures are failures, never a misleading "check your inbox" success.
 * No raw binding errors are shown to the user; the outer Worker renders 500.
 * @param {import('../shared/types.js').Env} env
 * @param {Request} request
 * @param {{ userId: string, email: string, purpose: string, message?: string, name: string }} data
 */
async function emailVerification(env, request, data) {
	if (!env.EMAIL || !env.EMAIL_FROM || !env.SESSION_SECRET) {
		throw new Error('Email sign-in is not configured');
	}
	const token = crypto.randomUUID();
	await createEmailVerification(env.DB, {
		id: token, userId: data.userId, email: data.email, purpose: data.purpose,
		payload: data.message ? JSON.stringify({ name: data.name, message: data.message }) : null,
	});
	const link = new URL(paths.verify, request.url);
	link.searchParams.set('token', token);
	try {
		await env.EMAIL.send({
			to: data.email, from: env.EMAIL_FROM,
			subject: 'Confirm your Messages request',
			text: `Hi ${data.name},\n\nConfirm your email to continue: ${link}\n\nThis link expires in 15 minutes and can be used once. Ignore it if you did not make this request.`,
			html: html`<p>Hi ${data.name},</p><p><a href="${link.toString()}">Confirm your email</a></p><p>This link expires in 15 minutes and can be used once. Ignore it if you did not make this request.</p>`.value,
		});
	} catch (error) {
		await deleteEmailVerification(env.DB, token);
		throw error;
	}
}

/** @param {import('../shared/types.js').Env} env @param {{ conversationId: string, senderIsOwner: boolean, senderName: string, content: string }} data */
async function notifyNewMessage(env, data) {
	if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) { return; }
	const conversation = await getConversation(env.DB, data.conversationId);
	if (!conversation) { return; }
	const subscriptions = data.senderIsOwner
		? await getPushSubscriptionsByUser(env.DB, String(conversation.visitor_user_id))
		: await getOwnerPushSubscriptions(env.DB);
	await notifyAll(subscriptions, {
		vapidPublicKey: env.VAPID_PUBLIC_KEY, vapidPrivateKey: env.VAPID_PRIVATE_KEY,
		vapidContact: env.VAPID_CONTACT ?? 'mailto:jesse@jessehattabaugh.com',
	}, (endpoint) => deletePushSubscription(env.DB, endpoint), JSON.stringify({ ...data, url: `${paths.messages}?conversationId=${encodeURIComponent(data.conversationId)}` }));
}

/** @param {Request} request @param {import('../shared/types.js').Env} env */
async function submitMessage(request, env) {
	const form = await readForm(request);
	const user = await sessionUser(request, env);
	const shared = ['title', 'text', 'url'].map((name) => String(form.get(name) ?? '').trim()).filter(Boolean).join('\n');
	const message = String(form.get('message') ?? shared).trim();
	const name = String(form.get('name') ?? '').trim();
	const email = normalizeEmail(String(form.get('email') ?? ''));
	const values = user ? { message } : { name, email, message };
	let conversationId = String(form.get('conversationId') ?? '');
	const draft = { values, conversationId: conversationId || undefined };
	if (!message || message.length > 10000) {
		return renderMessagesPage(request, env, { ...draft, error: 'Enter a message of at most 10,000 characters.' }, 422);
	}
	if (!user && (!name || name.length > 100 || !validEmail(email))) {
		return renderMessagesPage(request, env, { ...draft, error: 'Enter your name and a valid email address.' }, 422);
	}
	if (!user) {
		let guest = await getUserByEmailAny(env.DB, email);
		if (!guest) {
			const id = crypto.randomUUID();
			await createUser(env.DB, { id, displayName: name, email });
			guest = await getUserById(env.DB, id);
		}
		if (!guest) { throw new Error('Guest account missing'); }
		// An existing email is never sufficient to acquire its session or modify it.
		await emailVerification(env, request, { userId: guest.id, email, name, message, purpose: 'guest-message' });
		return redirect(`${paths.messages}?checkEmail=1`);
	}
	if (!user.is_owner) {
		const own = await getOrCreateConversation(env.DB, user.id);
		if (conversationId && conversationId !== own.id) {
			return page(request, { user, error: 'Conversation not found.' }, 404);
		}
		conversationId = own.id;
	}
	const conversation = await getConversation(env.DB, conversationId);
	if (!conversation) {
		return renderMessagesPage(request, env, { error: 'Select a conversation before sending a reply.', values }, 422);
	}
	await createMessage(env.DB, { id: crypto.randomUUID(), conversationId, senderUserId: user.id, content: message });
	await notifyNewMessage(env, { conversationId, senderIsOwner: !!user.is_owner, senderName: user.display_name, content: message });
	return redirect(`${paths.messages}?conversationId=${encodeURIComponent(conversationId)}&sent=1`);
}

/** @param {Request} request @param {import('../shared/types.js').Env} env */
export async function handleMessagesApi(request, env) {
	const url = new URL(request.url);
	const path = url.pathname;
	if (path === paths.messages) {
		return request.method === 'GET' ? renderMessagesPage(request, env) : submitMessage(request, env);
	}
	if (path === paths.login) {
		if (request.method === 'GET') {
			return page(request, { screen: 'login', notice: url.searchParams.has('checkEmail') ? 'Check your email to confirm your request.' : undefined });
		}
		const form = await readForm(request);
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		if (!name || name.length > 100 || !validEmail(email)) {
			return page(request, { screen: 'login', error: 'Enter your name and a valid email address.', values: { name, email } }, 422);
		}
		let user = await getUserByEmailAny(env.DB, email);
		if (!user) {
			const id = crypto.randomUUID();
			await createUser(env.DB, { id, displayName: name, email });
			user = await getUserById(env.DB, id);
		}
		if (!user) { throw new Error('Account missing'); }
		await emailVerification(env, request, { userId: user.id, email, name, purpose: 'login' });
		return redirect(`${paths.login}?checkEmail=1`);
	}
	if (path === paths.verify) {
		const token = request.method === 'GET' ? url.searchParams.get('token') : String((await readForm(request)).get('token') ?? '');
		const verification = token ? await getEmailVerification(env.DB, token) : null;
		if (!verification || verification.expires_at < Date.now() || verification.consumed_at) {
			return page(request, { screen: 'verify', error: 'That verification link has expired or is invalid.' }, 400);
		}
		if (request.method === 'GET') {
			return page(request, { screen: 'verify', token: verification.id });
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
		if (!(await consumeEmailVerification(env.DB, verification.id))) {
			return page(request, { screen: 'verify', error: 'That verification link has already been used.' }, 400);
		}
		if (verification.purpose === 'profile') {
			await updateUserProfile(env.DB, { id: user.id, displayName: user.display_name, isOwner: !!user.is_owner, email: verification.email });
		}
		await markEmailVerified(env.DB, user.id);
		if (!user.is_owner) { await getOrCreateConversation(env.DB, user.id); }
		let destination = paths.messages;
		if (verification.purpose === 'guest-message') {
			const payload = JSON.parse(verification.payload ?? '{}');
			const content = String(payload.message ?? '').trim();
			if (!content || content.length > 10000) { throw new Error('Invalid held message'); }
			const conversation = await getOrCreateConversation(env.DB, user.id);
			await createMessage(env.DB, { id: crypto.randomUUID(), conversationId: conversation.id, senderUserId: user.id, content });
			await notifyNewMessage(env, { conversationId: conversation.id, senderIsOwner: !!user.is_owner, senderName: user.display_name, content });
			destination += '?sent=1';
		}
		return redirect(destination, { 'Set-Cookie': sessionCookieHeader(await createSession(env.SESSION_SECRET, user.id)) });
	}
	if (path === paths.logout) {
		return redirect(paths.messages, { 'Set-Cookie': sessionCookieHeader('', true) });
	}
	const user = await sessionUser(request, env);
	if (path === paths.profile) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const email = normalizeEmail(String((await readForm(request)).get('email') ?? ''));
		if (!validEmail(email)) { return renderMessagesPage(request, env, { error: 'Enter a valid recovery email address.', values: { email } }, 422); }
		const existing = await getUserByEmailAny(env.DB, email);
		if (existing && existing.id !== user.id) { return renderMessagesPage(request, env, { error: 'That email belongs to another account.', values: { email } }, 409); }
		await emailVerification(env, request, { userId: user.id, email, name: user.display_name, purpose: 'profile' });
		return redirect(`${paths.messages}?checkEmail=1`);
	}
	if (path === paths.setup) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const token = String((await readForm(request)).get('setupToken') ?? '');
		if (!env.OWNER_SETUP_TOKEN || token !== env.OWNER_SETUP_TOKEN) {
			return renderMessagesPage(request, env, { error: 'The owner setup token is invalid.' }, 422);
		}
		if (!(await claimOwner(env.DB, user.id))) {
			return renderMessagesPage(request, env, { error: 'A site owner has already been configured.' }, 409);
		}
		return redirect(paths.messages);
	}
	if (path === paths.messagePush) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const form = await readForm(request);
		const endpoint = String(form.get('endpoint') ?? '');
		if (!endpoint.startsWith('https://')) {
			return renderMessagesPage(request, env, { error: 'A valid push subscription is required.' }, 422);
		}
		if (form.get('operation') === 'unsubscribe') {
			await deleteUserPushSubscription(env.DB, endpoint, user.id);
		} else {
			const p256dh = String(form.get('p256dh') ?? '');
			const auth = String(form.get('auth') ?? '');
			if (!p256dh || !auth) { return renderMessagesPage(request, env, { error: 'Subscription keys are required.' }, 422); }
			await savePushSubscription(env.DB, { id: crypto.randomUUID(), userId: user.id, endpoint, p256dh, auth });
		}
		return redirect(paths.messages);
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
		if (!authenticatedUser.is_owner) { await getOrCreateConversation(env.DB, authenticatedUser.id); }
		return json({ location: paths.messages }, 200, { 'Set-Cookie': sessionCookieHeader(await createSession(env.SESSION_SECRET, authenticatedUser.id)) });
	}
	return null;
}
