import { getOrCreateConversation, getConversation, getUserConversation, getAllConversations, getMessages, createMessage, savePushSubscription, deleteUserPushSubscription, hasUserPushSubscription } from '../shared/data/messages.js';
import { createUser, getUserById, getUserByEmailAny, normalizeEmail } from '../shared/data/auth.js';
import { sessionUser } from './session.js';
import { validEmail, emailVerification } from './auth.js';
import { notifyNewMessage } from './message-notifications.js';
import { render } from '../shared/html.js';
import { messagesPage, messagesFragment } from '../shared/templates/messages.js';
import { paths } from '../shared/routes.js';
import { SECURITY_HEADERS } from './security-headers.js';
import { readForm } from './request.js';

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

/** @param {Request} request @param {import('../shared/types.js').Env} env @param {import('../shared/templates/messages.js').MessagesData} [extra] @param {number} [status] */
async function renderMessagesPage(request, env, extra = {}, status = 200) {
	const user = await sessionUser(request, env);
	const url = new URL(request.url);
	if (!user && url.searchParams.has('conversationId')) {
		return redirect(`${paths.login}?returnTo=messages`, {}, 302);
	}
	/** @type {import('../shared/templates/messages.js').MessagesData} */
	const data = { user, notice: url.searchParams.has('sent') ? 'Message sent — Jesse will get back to you.' : undefined };
	if (url.searchParams.has('checkEmail')) {
		data.notice = 'Check your email to confirm your request.';
	}
	if (user) {
		data.values = { name: user.display_name, email: user.email ?? '' };
		data.vapidPublicKey = env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : undefined;
		let conversationId = extra.conversationId ?? url.searchParams.get('conversationId') ?? undefined;
		if (user.is_owner) {
			data.conversations = (await getAllConversations(env.DB)).map((conversation) => {return {
				id: conversation.id, 'display_name': conversation.display_name,
				href: `${paths.messages}?conversationId=${encodeURIComponent(conversation.id)}`,
			}});
		} else {
			const own = await getUserConversation(env.DB, user.id);
			if (conversationId && conversationId !== own?.id) {
				return page(request, { user, error: 'Conversation not found.' }, 404);
			}
			conversationId = own?.id;
		}
		// A new platform account has no conversation until it sends a message.
		if (!user.is_owner && !conversationId) {
			data.refreshHref = paths.messages;
			data.messages = [];
		}
		if (conversationId) {
			const conversation = await getConversation(env.DB, conversationId);
			if (!conversation || (!user.is_owner && conversation.visitor_user_id !== user.id)) {
				return page(request, { user, error: 'Conversation not found.' }, 404);
			}
			data.conversationId = conversationId;
			data.refreshHref = `${paths.messages}?conversationId=${encodeURIComponent(conversationId)}`;
			data.messages = (await getMessages(env.DB, conversationId)).map((message) => {return {
				...message, sent: message.sender_user_id === user.id,
			}});
		}
	}
	return page(request, { ...data, ...extra, values: { ...data.values, ...extra.values } }, status);
}

/** @param {Request} request @param {import('../shared/types.js').Env} env */
async function submitMessage(request, env) {
	const form = await readForm(request);
	const user = await sessionUser(request, env);
	const shared = ['title', 'text', 'url'].map((name) => {return String(form.get(name) ?? '').trim()}).filter(Boolean).join('\n');
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
	const path = new URL(request.url).pathname;
	if (path === paths.messages) { return request.method === 'GET' ? renderMessagesPage(request, env) : submitMessage(request, env); }
	const user = await sessionUser(request, env);
	if (path === paths.messagePush) {
		if (!user) { return redirect(paths.login, {}, 302); }
		const form = await readForm(request);
		const endpoint = String(form.get('endpoint') ?? '');
		if (!endpoint.startsWith('https://')) {
			return renderMessagesPage(request, env, { error: 'A valid push subscription is required.' }, 422);
		}
		if (form.get('operation') === 'status') {
			return json({ enabled: await hasUserPushSubscription(env.DB, endpoint, user.id) });
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
	return null;
}
