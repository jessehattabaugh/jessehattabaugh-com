import {
	createUser,
	getUserById,
	getUserByEmail,
	getUserByEmailAny,
	hasPasskey,
	updateUserProfile,
	createPasskey,
	getPasskeyById,
	getEmailVerification,
	updatePasskeyCounter,
	createChallenge,
	consumeChallenge,
	getOrCreateConversation,
	getAllConversations,
	getMessages,
	createMessage,
	savePushSubscription,
	getPushSubscriptionsByUser,
	getOwnerPushSubscriptions,
	deletePushSubscription,
	cleanExpiredChallenges,
	normalizeEmail,
	createEmailVerification,
	consumeEmailVerification,
	getRecentEmailVerification,
	deleteEmailVerification,
	cleanExpiredEmailVerifications,
	markEmailVerified,
} from '../shared/data/messages.js';
import {
	verifyRegistration,
	verifyAuthentication,
	createRegistrationOptions,
	createAuthenticationOptions,
} from './webauthn.js';
import { getSessionUser, createSession, sessionCookieHeader } from './session.js';
import { notifyAll } from './vapid.js';
import { render, html } from '../shared/html.js';
import { messagesPage } from '../shared/templates/messages.js';
import { SECURITY_HEADERS } from './security-headers.js';

const JSON_CT = { 'Content-Type': 'application/json' };

/** @param {unknown} data @param {number} [status] */
function json(data, status = 200) {
	return new Response(JSON.stringify(data), { status, headers: JSON_CT });
}

/** @param {string} msg @param {number} [status] */
function err(msg, status = 400) {
	return json({ error: msg }, status);
}

/** @param {Request} req */
function rpInfo(req) {
	const url = new URL(req.url);
	return { rpId: url.hostname, origin: url.origin };
}

const EMAIL_VERIFICATION_TTL_MS = 15 * 60 * 1000;

/** @param {string} email */
function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * @param {import('../shared/types.js').Env} env
 * @param {{ email: string, token: string, purpose: 'register' | 'guest-message', displayName?: string, requestUrl: string }} opts
 */
async function sendVerificationEmail(env, { email, token, purpose, displayName, requestUrl }) {
	if (!env.EMAIL || !env.EMAIL_FROM) {
		return;
	}
	const link = new URL('/apps/messages/verify', requestUrl);
	link.searchParams.set('token', token);
	const subject =
		purpose === 'register'
			? 'Confirm your Messages registration'
			: 'Confirm your message to Jesse';
	const safeName = displayName?.trim() || 'there';
	const text = [
		`Hi ${safeName},`,
		'',
		`Please confirm this email to continue in Messages: ${link.toString()}`,
		'',
		'If you did not make this request, you can ignore this email.',
	].join('\n');
	try {
		await env.EMAIL.send({
			to: email,
			from: env.EMAIL_FROM,
			subject,
			text,
			html: html`<p>Hi ${safeName},</p><p>Please confirm this email to continue in Messages:</p><p><a href="${link.toString()}">${link.toString()}</a></p><p>If you did not make this request, you can ignore this email.</p>`,
		});
	} catch (e) {
		console.error('Email send failed', e);
	}
}

/**
 * @param {import('../shared/types.js').Env} env
 * @param {Request} request
 * @param {{ userId: string, email: string, purpose: 'register' | 'guest-message', displayName?: string, payload?: string | null }} opts
 */
async function createVerification(
	env,
	request,
	{ userId, email, purpose, displayName, payload = null },
) {
	const token = crypto.randomUUID();
	await createEmailVerification(env.DB, {
		id: token,
		userId,
		email,
		purpose,
		payload,
		ttlMs: EMAIL_VERIFICATION_TTL_MS,
	});
	await sendVerificationEmail(env, {
		email,
		token,
		purpose,
		displayName,
		requestUrl: request.url,
	});
	return token;
}

/**
 * Send a push notification to the other side of a conversation, if VAPID is configured.
 * Shared by the JSON send endpoint and the no-JS guest form so the notify logic isn't duplicated.
 * The message content is encrypted into the payload so iOS (and all browsers) can show it
 * without the service worker making a follow-up fetch — empty payloads are silently dropped.
 * @param {import('../shared/types.js').Env} env
 * @param {{ conversationId: string, senderIsOwner: boolean, senderName: string, content: string }} opts
 */
async function notifyNewMessage(env, { conversationId, senderIsOwner, senderName, content }) {
	const { DB, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT } = env;
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		return;
	}
	const vapid = {
		vapidPublicKey: VAPID_PUBLIC_KEY,
		vapidPrivateKey: VAPID_PRIVATE_KEY,
		vapidContact: VAPID_CONTACT ?? 'mailto:claude_ai@jessehattabaugh.com',
	};
	const onGone = (/** @type {string} */ ep) => {
		return deletePushSubscription(DB, ep);
	};

	const payload = JSON.stringify({ type: 'message', senderName, content: content.slice(0, 200) });

	if (senderIsOwner) {
		const convRow = await DB.prepare('SELECT visitor_user_id FROM conversations WHERE id = ?')
			.bind(conversationId)
			.first();
		if (convRow) {
			const subs = await getPushSubscriptionsByUser(DB, String(convRow.visitor_user_id));
			await notifyAll(subs, vapid, onGone, payload);
		}
	} else {
		const ownerSubs = await getOwnerPushSubscriptions(DB);
		await notifyAll(ownerSubs, vapid, onGone, payload);
	}
}

/**
 * Render the Messages PWA document shell — the no-JS baseline and the mount
 * point the client app upgrades once JS runs.
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @param {{ status?: number, error?: string, values?: { name?: string, email?: string, message?: string }, sent?: boolean }} [opts]
 * @returns {Promise<Response>}
 */
async function renderMessagesPage(request, env, { status = 200, error, values, sent } = {}) {
	const { DB, SESSION_SECRET } = env;
	const sessionUserId = await getSessionUser(request, SESSION_SECRET);
	const user = sessionUserId ? await getUserById(DB, sessionUserId) : null;
	const url = new URL(request.url);

	const body = render(
		messagesPage({
			viewerRole: user?.is_owner ? 'owner' : 'guest',
			sent: sent ?? url.searchParams.get('sent') === '1',
			error,
			values: values ?? { name: user?.display_name ?? '', email: user?.email ?? '' },
		}),
	);
	return new Response(body, {
		status,
		headers: { 'Content-Type': 'text/html;charset=utf-8', ...SECURITY_HEADERS },
	});
}

/**
 * No-JS fallback: a guest fills in name + message and the form POSTs here
 * directly. Identity is tracked via the same signed session cookie used by
 * passkey auth, so a guest's messages carry over if they later register.
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response>}
 */
async function handleGuestMessagePost(request, env) {
	const { DB, SESSION_SECRET } = env;
	const contentType = request.headers.get('Content-Type') ?? '';
	if (
		!contentType.includes('application/x-www-form-urlencoded') &&
		!contentType.includes('multipart/form-data')
	) {
		return new Response('Unsupported Media Type', { status: 415, headers: SECURITY_HEADERS });
	}

	const sessionUserId = await getSessionUser(request, SESSION_SECRET);
	const existingUser = sessionUserId ? await getUserById(DB, sessionUserId) : null;

	// The owner has no single recipient to send to from this form — they need the JS app.
	if (existingUser?.is_owner) {
		return Response.redirect(new URL('/apps/messages/', request.url).toString(), 303);
	}

	const form = await request.formData();
	const name = String(form.get('name') ?? '')
		.trim()
		.slice(0, 100);
	const email = normalizeEmail(String(form.get('email') ?? ''));
	const message = String(form.get('message') ?? '').trim();

	if (!name || !message || !email) {
		return renderMessagesPage(request, env, {
			status: 422,
			error: 'Name, email, and message are required.',
			values: { name, email, message },
		});
	}
	if (!isValidEmail(email)) {
		return renderMessagesPage(request, env, {
			status: 422,
			error: 'Please enter a valid email address.',
			values: { name, email, message },
		});
	}
	if (message.length > 10000) {
		return renderMessagesPage(request, env, {
			status: 422,
			error: 'Message is too long.',
			values: { name, email, message },
		});
	}

	let userId = existingUser?.id ?? null;
	if (!userId) {
		userId = crypto.randomUUID();
		await createUser(DB, { id: userId, displayName: name, isOwner: false, email });
	} else {
		await updateUserProfile(DB, { id: userId, displayName: name, isOwner: false, email });
	}

	if (!existingUser || existingUser.email !== email || existingUser.email_verified !== 1) {
		const token = await createVerification(env, request, {
			userId,
			email,
			purpose: 'guest-message',
			displayName: name,
			payload: JSON.stringify({ name, message }),
		});
		return renderMessagesPage(request, env, {
			status: 200,
			error: 'Check your email to confirm your message before it is sent.',
			values: { name, email, message },
			sent: false,
		});
	}

	const conv = await getOrCreateConversation(DB, userId);
	await createMessage(DB, {
		id: crypto.randomUUID(),
		conversationId: conv.id,
		senderUserId: userId,
		content: message,
	});
	await notifyNewMessage(env, {
		conversationId: conv.id,
		senderIsOwner: false,
		senderName: name,
		content: message,
	});

	const headers = new Headers({
		Location: new URL('/apps/messages/?sent=1', request.url).toString(),
		...SECURITY_HEADERS,
	});
	if (!sessionUserId && SESSION_SECRET) {
		headers.set('Set-Cookie', sessionCookieHeader(await createSession(SESSION_SECRET, userId)));
	}
	return new Response(null, { status: 303, headers });
}

/**
 * @param {Request} request
 * @param {import('../shared/types.js').Env} env
 * @returns {Promise<Response | null>}  null = route not matched here
 */
export async function handleMessagesApi(request, env) {
	const url = new URL(request.url);
	const path = url.pathname;
	const { method } = request;
	const { DB, SESSION_SECRET, VAPID_PUBLIC_KEY, OWNER_SETUP_TOKEN } = env;

	// ── Page: SSR shell (no-JS baseline + JS app mount point) ───────────────────

	if (method === 'GET' && path === '/apps/messages/') {
		return renderMessagesPage(request, env);
	}

	if (method === 'POST' && path === '/apps/messages/') {
		return handleGuestMessagePost(request, env);
	}

	// ── Config ─────────────────────────────────────────────────────────────────

	if (method === 'GET' && path === '/apps/messages/api/config') {
		return json({ vapidPublicKey: VAPID_PUBLIC_KEY ?? null });
	}

	// ── Email verification ────────────────────────────────────────────────────

	if (method === 'GET' && path === '/apps/messages/verify') {
		const token = url.searchParams.get('token');
		if (!token) {
			return renderMessagesPage(request, env, {
				status: 400,
				error: 'Verification link is missing.',
			});
		}
		const verification = await getEmailVerification(DB, token);
		if (!verification || verification.expires_at < Date.now() || verification.consumed_at) {
			return renderMessagesPage(request, env, {
				status: 400,
				error: 'That verification link has expired or is invalid.',
			});
		}
		const user = await getUserById(DB, verification.user_id);
		if (!user) {
			return renderMessagesPage(request, env, {
				status: 404,
				error: 'The account for this verification link could not be found.',
			});
		}

		// Consume the verification token atomically before applying side effects
		const consumed = await consumeEmailVerification(DB, token);
		if (!consumed) {
			return renderMessagesPage(request, env, {
				status: 400,
				error: 'That verification link has expired or is invalid.',
			});
		}

		await updateUserProfile(DB, {
			id: user.id,
			displayName: user.display_name,
			isOwner: !!user.is_owner,
			email: verification.email,
		});
		await markEmailVerified(DB, user.id);

		if (verification.purpose === 'guest-message') {
			const payload = verification.payload ? JSON.parse(verification.payload) : null;
			const name = String(payload?.name ?? user.display_name ?? '').trim();
			const message = String(payload?.message ?? '').trim();
			if (name && message) {
				const conv = await getOrCreateConversation(DB, user.id);
				await createMessage(DB, {
					id: crypto.randomUUID(),
					conversationId: conv.id,
					senderUserId: user.id,
					content: message,
				});
				await notifyNewMessage(env, {
					conversationId: conv.id,
					senderIsOwner: false,
					senderName: name,
					content: message,
				});
			}
			const redirect = new URL('/apps/messages/?sent=1', request.url);
			if (SESSION_SECRET) {
				redirect.searchParams.set('sent', '1');
			}
			return Response.redirect(redirect.toString(), 303);
		}

		return Response.redirect(
			new URL('/apps/messages/?verified=1', request.url).toString(),
			303,
		);
	}

	// ── Register: begin ────────────────────────────────────────────────────────

	if (method === 'POST' && path === '/apps/messages/api/auth/register/begin') {
		const body = /** @type {any} */ (await request.json());
		const displayName = String(body?.displayName ?? '')
			.trim()
			.slice(0, 100);
		const email = normalizeEmail(String(body?.email ?? ''));
		if (!displayName) {
			return err('displayName required');
		}
		if (!email || !isValidEmail(email)) {
			return err('Valid email required');
		}

		const guestUserId = await getSessionUser(request, SESSION_SECRET);
		const existingGuest = guestUserId ? await getUserById(DB, guestUserId) : null;
		const existingEmailUser = await getUserByEmailAny(DB, email);

		let userId = null;
		let verificationProof = null;

		// Session-proven: a pre-auth guest (identified by a no-JS session cookie)
		// who hasn't registered a passkey yet may attach one to their own account.
		if (existingGuest && !existingGuest.is_owner && !(await hasPasskey(DB, existingGuest.id))) {
			userId = existingGuest.id;
		}

		// Email-proven: the email maps to an existing account. Attach a credential
		// to it only when the caller already holds a session for that account, or
		// has just completed an email verification in this registration attempt.
		// An unauthenticated caller who merely supplies a stranger's verified email
		// must NOT get a registration challenge — that would let them take over the
		// victim's conversation (and demote an owner via is_owner: false).
		if (!userId && existingEmailUser) {
			if (existingGuest?.id === existingEmailUser.id) {
				userId = existingEmailUser.id;
			} else {
				verificationProof = await getRecentEmailVerification(DB, {
					userId: existingEmailUser.id,
					email,
					purpose: 'register',
					consumedAfter: Date.now() - EMAIL_VERIFICATION_TTL_MS,
				});
				if (verificationProof) {
					userId = existingEmailUser.id;
				}
			}
		}

		if (!userId) {
			// New account — or an existing account whose email the caller has not
			// proven ownership of this attempt. Either way a fresh email verification
			// is required before a credential can be attached. Existing accounts are
			// not mutated (profile / verified / owner status) until verification passes.
			if (!existingEmailUser) {
				userId = crypto.randomUUID();
				await createUser(DB, { id: userId, displayName, isOwner: false, email });
			} else {
				userId = existingEmailUser.id;
			}
			await createVerification(env, request, {
				userId,
				email,
				purpose: 'register',
				displayName,
			});
			return json({ challengeId: null, userId, needsVerification: true, email });
		}

		// A completed verification authorizes exactly one registration — consume it
		// so it can't be replayed to attach a second, attacker-controlled credential.
		if (verificationProof) {
			await deleteEmailVerification(DB, verificationProof.id);
		}

		const currentUser = await getUserById(DB, userId);
		if (!currentUser) {
			return err('Registration session expired. Please try again.', 400);
		}
		await updateUserProfile(DB, {
			id: userId,
			displayName,
			isOwner: !!currentUser.is_owner,
			email,
		});

		const verifiedAlready = currentUser.email === email && currentUser.email_verified === 1;
		if (!verifiedAlready) {
			await createVerification(env, request, {
				userId,
				email,
				purpose: 'register',
				displayName,
			});
			return json({ challengeId: null, userId, needsVerification: true, email });
		}

		const { rpId } = rpInfo(request);
		const { challenge, options } = createRegistrationOptions({
			rpName: 'Jesse Hattabaugh',
			rpId,
			userId,
			displayName,
		});

		const challengeId = crypto.randomUUID();
		await createChallenge(DB, { id: challengeId, challenge, userId, type: 'register' });
		await cleanExpiredChallenges(DB);
		await cleanExpiredEmailVerifications(DB);

		return json({ challengeId, userId, challenge, options, rpId, needsVerification: false });
	}

	// ── Register: complete ─────────────────────────────────────────────────────

	if (method === 'POST' && path === '/apps/messages/api/auth/register/complete') {
		const body = /** @type {any} */ (await request.json());
		const { challengeId, displayName: rawDisplayName, setupToken, credential } = body ?? {};
		if (!challengeId || !credential) {
			return err('Missing required fields');
		}
		const displayName = String(rawDisplayName ?? '')
			.trim()
			.slice(0, 100);
		if (!displayName) {
			return err('displayName required');
		}

		const stored = await consumeChallenge(DB, challengeId);
		if (!stored || stored.expires_at < Date.now()) {
			return err('Challenge expired or not found');
		}
		if (stored.type !== 'register') {
			return err('Invalid challenge type');
		}
		if (!stored.user_id) {
			return err('Challenge has no associated user ID');
		}
		const userId = stored.user_id;

		const { origin, rpId } = rpInfo(request);
		let regInfo;
		try {
			regInfo = await verifyRegistration({
				credential,
				expectedChallenge: stored.challenge,
				expectedOrigin: origin,
				expectedRPID: rpId,
			});
		} catch (e) {
			return err(`Registration failed: ${e instanceof Error ? e.message : String(e)}`);
		}

		// register/begin always creates (or reuses) the `users` row up front, so
		// it should exist here — guard anyway since createPasskey below has a
		// foreign key on userId and would otherwise fail with a confusing error.
		const existingUser = await getUserById(DB, userId);
		if (!existingUser) {
			return err('Registration session expired. Please try again.', 400);
		}
		if (!existingUser.email || existingUser.email_verified !== 1) {
			return err('Please confirm your email before creating a passkey.', 422);
		}

		let isOwner = !!existingUser.is_owner;
		if (OWNER_SETUP_TOKEN && setupToken === OWNER_SETUP_TOKEN) {
			const existingOwner = await DB.prepare(
				'SELECT id FROM users WHERE is_owner = 1 LIMIT 1',
			).first();
			if (!existingOwner) {
				isOwner = true;
			}
		}

		await updateUserProfile(DB, { id: userId, displayName, isOwner });
		await createPasskey(DB, {
			id: regInfo.credentialId,
			userId,
			publicKey: regInfo.publicKey,
			counter: regInfo.counter,
			transports: regInfo.transports,
		});

		if (!SESSION_SECRET) {
			return err('Server not configured: SESSION_SECRET is missing', 500);
		}
		const session = await createSession(SESSION_SECRET, userId);
		return new Response(JSON.stringify({ user: { id: userId, displayName, isOwner } }), {
			status: 200,
			headers: { ...JSON_CT, 'Set-Cookie': sessionCookieHeader(session) },
		});
	}

	// ── Login: begin ───────────────────────────────────────────────────────────

	if (method === 'POST' && path === '/apps/messages/api/auth/login/begin') {
		const { rpId } = rpInfo(request);
		const { challenge, options } = createAuthenticationOptions({ rpId });
		const challengeId = crypto.randomUUID();
		await createChallenge(DB, { id: challengeId, challenge, type: 'login' });
		return json({ challengeId, challenge, options, rpId });
	}

	// ── Login: complete ────────────────────────────────────────────────────────

	if (method === 'POST' && path === '/apps/messages/api/auth/login/complete') {
		const body = /** @type {any} */ (await request.json());
		const { challengeId, credential } = body ?? {};
		if (!challengeId || !credential) {
			return err('Missing required fields');
		}

		const stored = await consumeChallenge(DB, challengeId);
		if (!stored || stored.expires_at < Date.now()) {
			return err('Challenge expired or not found');
		}
		if (stored.type !== 'login') {
			return err('Invalid challenge type');
		}

		const passkey = await getPasskeyById(DB, credential.id);
		if (!passkey) {
			return err('Passkey not found', 404);
		}

		const { origin, rpId } = rpInfo(request);
		let authInfo;
		try {
			authInfo = await verifyAuthentication({
				credential,
				expectedChallenge: stored.challenge,
				expectedOrigin: origin,
				expectedRPID: rpId,
				storedPublicKey: passkey.public_key,
				storedCounter: passkey.counter,
			});
		} catch (e) {
			return err(`Authentication failed: ${e instanceof Error ? e.message : String(e)}`);
		}

		await updatePasskeyCounter(DB, { id: passkey.id, counter: authInfo.newCounter });
		const user = await getUserById(DB, passkey.user_id);
		if (!user) {
			return err('User not found', 404);
		}

		if (!SESSION_SECRET) {
			return err('Server not configured: SESSION_SECRET is missing', 500);
		}
		const session = await createSession(SESSION_SECRET, user.id);
		return new Response(
			JSON.stringify({
				user: { id: user.id, displayName: user.display_name, isOwner: !!user.is_owner },
			}),
			{ status: 200, headers: { ...JSON_CT, 'Set-Cookie': sessionCookieHeader(session) } },
		);
	}

	// ── Logout ─────────────────────────────────────────────────────────────────

	if (method === 'POST' && path === '/apps/messages/api/auth/logout') {
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { ...JSON_CT, 'Set-Cookie': sessionCookieHeader('', true) },
		});
	}

	// ── Current user ───────────────────────────────────────────────────────────

	if (method === 'GET' && path === '/apps/messages/api/auth/me') {
		const userId = await getSessionUser(request, SESSION_SECRET);
		if (!userId) {
			return json({ user: null });
		}
		const user = await getUserById(DB, userId);
		if (!user) {
			return json({ user: null });
		}
		return json({
			user: { id: user.id, displayName: user.display_name, isOwner: !!user.is_owner },
		});
	}

	// ── Messages: list ─────────────────────────────────────────────────────────

	if (method === 'GET' && path === '/apps/messages/api/messages') {
		const userId = await getSessionUser(request, SESSION_SECRET);
		if (!userId) {
			return err('Not authenticated', 401);
		}
		const user = await getUserById(DB, userId);
		if (!user) {
			return err('User not found', 404);
		}

		if (user.is_owner) {
			const convId = url.searchParams.get('conversationId');
			let conversations = await getAllConversations(DB);
			// Owner-only edge case: with no visitors yet there are no conversations
			// to reply to, which used to leave the owner staring at a disabled,
			// empty shell. Give the owner a "self" conversation (they are its sole
			// participant) so the chat interface is always usable and the owner can
			// send a message to themself.
			if (conversations.length === 0) {
				await getOrCreateConversation(DB, userId);
				conversations = await getAllConversations(DB);
			}

			if (!convId) {
				// When the owner has only their self conversation, auto-select it so
				// the composer isn't left disabled. This must also fire on later
				// visits — not just the request that created the self conversation —
				// e.g. after a reload or on a new device, where the mobile sidebar is
				// hidden and there's otherwise no visible way to select it.
				const self = conversations.find((c) => {
					return c.visitor_user_id === userId;
				});
				if (conversations.length === 1 && self) {
					const messages = await getMessages(DB, self.id);
					return json({ conversations, messages, conversationId: self.id });
				}
				return json({ conversations, messages: [] });
			}
			const messages = await getMessages(DB, convId);
			return json({ conversations, messages, conversationId: convId });
		} else {
			const conv = await getOrCreateConversation(DB, userId);
			const messages = await getMessages(DB, conv.id);
			const ownerRow = await DB.prepare(
				'SELECT id, display_name FROM users WHERE is_owner = 1 LIMIT 1',
			).first();
			return json({
				messages,
				conversationId: conv.id,
				ownerName: ownerRow?.display_name ?? 'Jesse',
				ownerUserId: ownerRow?.id ?? null,
			});
		}
	}

	// ── Messages: latest (service worker fetches on push) ─────────────────────

	if (method === 'GET' && path === '/apps/messages/api/messages/latest') {
		const userId = await getSessionUser(request, SESSION_SECRET);
		if (!userId) {
			return err('Not authenticated', 401);
		}
		const user = await getUserById(DB, userId);
		if (!user) {
			return err('User not found', 404);
		}

		if (user.is_owner) {
			const row = await DB.prepare(
				`SELECT m.conversation_id as conversationId, u.display_name as senderName, m.content
         FROM messages m JOIN users u ON m.sender_user_id = u.id
         WHERE u.is_owner = 0
         ORDER BY m.created_at DESC LIMIT 1`,
			).first();
			if (!row) {
				return err('No messages', 404);
			}
			return json(row);
		} else {
			const conv = await getOrCreateConversation(DB, userId);
			const row = await DB.prepare(
				`SELECT u.display_name as senderName, m.content
         FROM messages m JOIN users u ON m.sender_user_id = u.id
         WHERE m.conversation_id = ? AND u.is_owner = 1
         ORDER BY m.created_at DESC LIMIT 1`,
			)
				.bind(conv.id)
				.first();
			if (!row) {
				return err('No messages', 404);
			}
			return json(row);
		}
	}

	// ── Messages: send ─────────────────────────────────────────────────────────

	if (method === 'POST' && path === '/apps/messages/api/messages') {
		const ct = request.headers.get('Content-Type') ?? '';
		const isShare = ct.includes('multipart/form-data');
		const appUrl = new URL('/apps/messages/', request.url).toString();

		const userId = await getSessionUser(request, SESSION_SECRET);
		if (!userId) {
			return isShare ? Response.redirect(appUrl, 303) : err('Not authenticated', 401);
		}
		const user = await getUserById(DB, userId);
		if (!user) {
			return isShare ? Response.redirect(appUrl, 303) : err('User not found', 404);
		}

		let content, conversationId;
		if (isShare) {
			const formData = await request.formData();
			const title = String(formData.get('title') ?? '').trim();
			const text = String(formData.get('text') ?? '').trim();
			const sharedUrl = String(formData.get('url') ?? '').trim();
			content = [title, text, sharedUrl].filter(Boolean).join('\n');
			if (!user.is_owner) {
				const conv = await getOrCreateConversation(DB, userId);
				conversationId = conv.id;
			}
		} else {
			const body = /** @type {any} */ (await request.json());
			content = String(body?.content ?? '').trim();
			conversationId = body?.conversationId;
			if (user.is_owner && !conversationId) {
				return err('conversationId required');
			}
			if (!user.is_owner) {
				const conv = await getOrCreateConversation(DB, userId);
				conversationId = conv.id;
			}
		}

		if (!content) {
			return isShare ? Response.redirect(appUrl, 303) : err('Content required');
		}
		if (content.length > 10000) {
			return isShare ? Response.redirect(appUrl, 303) : err('Message too long');
		}
		if (!conversationId) {
			return isShare ? Response.redirect(appUrl, 303) : err('conversationId required');
		}

		const msgId = crypto.randomUUID();
		const createdAt = new Date().toISOString();
		await createMessage(DB, { id: msgId, conversationId, senderUserId: userId, content });

		await notifyNewMessage(env, {
			conversationId,
			senderIsOwner: !!user.is_owner,
			senderName: user.display_name,
			content,
		});

		if (isShare) {
			return Response.redirect(appUrl, 303);
		}
		// sender_user_id matches the shape getMessages() returns — chat-view's
		// addMessage() reads this field to decide sent-vs-received styling.
		// eslint-disable-next-line camelcase
		return json({ id: msgId, conversationId, sender_user_id: userId, content, createdAt }, 201);
	}

	// ── Push: subscribe ────────────────────────────────────────────────────────

	if (method === 'POST' && path === '/apps/messages/api/push/subscribe') {
		const userId = await getSessionUser(request, SESSION_SECRET);
		if (!userId) {
			return err('Not authenticated', 401);
		}
		const body = /** @type {any} */ (await request.json());
		const { endpoint, keys } = body ?? {};
		if (!endpoint || !keys?.p256dh || !keys?.auth) {
			return err('Missing subscription fields');
		}
		await savePushSubscription(DB, {
			id: crypto.randomUUID(),
			userId,
			endpoint,
			p256dh: keys.p256dh,
			auth: keys.auth,
		});
		return json({ ok: true });
	}

	// ── Push: unsubscribe ──────────────────────────────────────────────────────

	if (method === 'DELETE' && path === '/apps/messages/api/push/subscribe') {
		const userId = await getSessionUser(request, SESSION_SECRET);
		if (!userId) {
			return err('Not authenticated', 401);
		}
		const body = /** @type {any} */ (await request.json());
		if (!body?.endpoint) {
			return err('endpoint required');
		}
		await deletePushSubscription(DB, body.endpoint);
		return json({ ok: true });
	}

	return null;
}
