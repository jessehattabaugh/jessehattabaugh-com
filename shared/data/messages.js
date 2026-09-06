/** @import { D1Database } from '@cloudflare/workers-types' */

/**
 * @param {D1Database} db
 * @param {{ id: string, displayName: string, isOwner?: boolean, email?: string | null }} opts
 */
export async function createUser(db, { id, displayName, isOwner = false, email = null }) {
	await db
		.prepare('INSERT INTO users (id, display_name, is_owner, email) VALUES (?, ?, ?, ?)')
		.bind(id, displayName, isOwner ? 1 : 0, email)
		.run();
}

/**
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<{ id: string, display_name: string, is_owner: number, email: string | null, email_verified: number, created_at: string } | null>}
 */
export function getUserById(db, id) {
	return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

/**
 * Normalize an email address (trim + lowercase) for storage and comparison.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
	return email.trim().toLowerCase();
}

/**
 * Look up the verified user for an email, if any.
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<{ id: string, display_name: string, is_owner: number, email: string | null, email_verified: number, created_at: string } | null>}
 */
export function getUserByEmail(db, email) {
	return db
		.prepare('SELECT * FROM users WHERE email = ? AND email_verified = 1 LIMIT 1')
		.bind(normalizeEmail(email))
		.first();
}

/**
 * Look up any user with this email, including unverified rows.
 * @param {D1Database} db
 * @param {string} email
 * @returns {Promise<{ id: string, display_name: string, is_owner: number, email: string | null, email_verified: number, created_at: string } | null>}
 */
export function getUserByEmailAny(db, email) {
	return db
		.prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
		.bind(normalizeEmail(email))
		.first();
}

/**
 * @param {D1Database} db
 * @param {{ id: string, userId: string, publicKey: string, counter?: number, transports?: string[], backedUp?: boolean }} opts
 */
export async function createPasskey(
	db,
	{ id, userId, publicKey, counter = 0, transports = [], backedUp = false },
) {
	await db
		.prepare(
			'INSERT INTO passkeys (id, user_id, public_key, counter, transports, backed_up) VALUES (?, ?, ?, ?, ?, ?)',
		)
		.bind(id, userId, publicKey, counter, JSON.stringify(transports), backedUp ? 1 : 0)
		.run();
}

/**
 * @param {D1Database} db
 * @param {string} id  credential ID (base64url)
 * @returns {Promise<{ id: string, user_id: string, public_key: string, counter: number, transports: string, backed_up: number } | null>}
 */
export function getPasskeyById(db, id) {
	return db.prepare('SELECT * FROM passkeys WHERE id = ?').bind(id).first();
}

/**
 * @param {D1Database} db
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasPasskey(db, userId) {
	const row = await db.prepare('SELECT 1 FROM passkeys WHERE user_id = ? LIMIT 1').bind(userId).first();
	return !!row;
}

/**
 * Update a user's profile in place — used when a pre-auth guest (identified by
 * a no-JS session cookie) later registers a passkey, so their existing id and
 * message history carry over instead of forking into a second user.
 * @param {D1Database} db
 * @param {{ id: string, displayName: string, isOwner: boolean, email?: string | null }} opts
 */
export async function updateUserProfile(db, { id, displayName, isOwner, email = null }) {
	const current = await getUserById(db, id);
	const normalizedEmail = email ? normalizeEmail(email) : null;
	const nextVerified = normalizedEmail && current?.email === normalizedEmail ? current.email_verified : 0;
	await db
		.prepare(
			'UPDATE users SET display_name = ?, is_owner = ?, email = ?, email_verified = ? WHERE id = ?',
		)
		.bind(displayName, isOwner ? 1 : 0, normalizedEmail, nextVerified, id)
		.run();
}

/**
 * Mark a user's email as verified.
 * @param {D1Database} db
 * @param {string} id
 */
export function markEmailVerified(db, id) {
	return db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(id).run();
}

/**
 * @typedef {{ id: string, user_id: string, email: string, purpose: string, payload: string | null, expires_at: number, consumed_at: number | null }} EmailVerification
 */

/**
 * Create a single-use email verification record.
 * @param {D1Database} db
 * @param {{ id: string, userId: string, email: string, purpose: string, payload?: string | null, ttlMs?: number }} opts
 */
export async function createEmailVerification(
	db,
	{ id, userId, email, purpose = 'register', payload = null, ttlMs = 15 * 60 * 1000 },
) {
	const expiresAt = Date.now() + ttlMs;
	await db
		.prepare(
			'INSERT INTO email_verifications (id, user_id, email, purpose, payload, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
		)
		.bind(id, userId, normalizeEmail(email), purpose, payload, expiresAt)
		.run();
}

/**
 * Fetch a verification record by token (does not consume it).
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<EmailVerification | null>}
 */
export function getEmailVerification(db, id) {
	return db
		.prepare(
			'SELECT id, user_id, email, purpose, payload, expires_at, consumed_at FROM email_verifications WHERE id = ?',
		)
		.bind(id)
		.first();
}

/**
 * Atomically mark a verification record as consumed (single-use). The row is
 * kept (not deleted) so register/begin can require a freshly-completed
 * verification before attaching a passkey to an existing user.
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<EmailVerification | null>}
 */
export function consumeEmailVerification(db, id) {
	return db
		.prepare(
			'UPDATE email_verifications SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL RETURNING id, user_id, email, purpose, payload, expires_at, consumed_at',
		)
		.bind(Date.now(), id)
		.first();
}

/**
 * Find the most recent verification for a user+email completed after a cutoff.
 * Used to prove a caller just verified ownership of an existing account.
 * @param {D1Database} db
 * @param {{ userId: string, email: string, purpose: string, consumedAfter: number }} opts
 * @returns {Promise<EmailVerification | null>}
 */
export function getRecentEmailVerification(db, { userId, email, purpose, consumedAfter }) {
	return db
		.prepare(
			`SELECT id, user_id, email, purpose, payload, expires_at, consumed_at
       FROM email_verifications
       WHERE user_id = ? AND email = ? AND purpose = ? AND consumed_at IS NOT NULL AND consumed_at >= ?
       ORDER BY consumed_at DESC LIMIT 1`,
		)
		.bind(userId, normalizeEmail(email), purpose, consumedAfter)
		.first();
}

/**
 * Permanently delete a verification record (single-use registration proof).
 * @param {D1Database} db
 * @param {string} id
 */
export function deleteEmailVerification(db, id) {
	return db.prepare('DELETE FROM email_verifications WHERE id = ?').bind(id).run();
}

/** Remove stale verification records to keep the table small. */
/** @param {D1Database} db */
export function cleanExpiredEmailVerifications(db) {
	return db.prepare('DELETE FROM email_verifications WHERE expires_at < ?').bind(Date.now()).run();
}

/**
 * @param {D1Database} db
 * @param {{ id: string, counter: number, backedUp?: boolean }} opts
 */
export async function updatePasskeyCounter(db, { id, counter, backedUp = false }) {
	await db
		.prepare('UPDATE passkeys SET counter = ?, backed_up = ? WHERE id = ?')
		.bind(counter, backedUp ? 1 : 0, id)
		.run();
}

/**
 * @param {D1Database} db
 * @param {{ id: string, challenge: string, userId?: string | null, type?: string }} opts
 */
export async function createChallenge(db, { id, challenge, userId = null, type = 'register' }) {
	const expiresAt = Date.now() + 5 * 60 * 1000;
	await db
		.prepare(
			'INSERT INTO auth_challenges (id, challenge, user_id, type, expires_at) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(id, challenge, userId, type, expiresAt)
		.run();
}

/**
 * Fetch and atomically delete the challenge (single-use).
 * @param {D1Database} db
 * @param {string} id
 * @returns {Promise<{ id: string, challenge: string, user_id: string | null, type: string, expires_at: number } | null>}
 */
export async function consumeChallenge(db, id) {
	const row = await db
		.prepare(
			'DELETE FROM auth_challenges WHERE id = ? RETURNING id, challenge, user_id, type, expires_at',
		)
		.bind(id)
		.first();
	return /** @type {{ id: string, challenge: string, user_id: string | null, type: string, expires_at: number } | null} */ (
		row
	);
}

/**
 * @param {D1Database} db
 * @param {string} visitorUserId
 * @returns {Promise<{ id: string, visitor_user_id: string, created_at: string }>}
 */
export async function getOrCreateConversation(db, visitorUserId) {
	await db
		.prepare(
			'INSERT INTO conversations (id, visitor_user_id) VALUES (?, ?) ON CONFLICT(visitor_user_id) DO NOTHING',
		)
		.bind(crypto.randomUUID(), visitorUserId)
		.run();

	const row = await db
		.prepare('SELECT * FROM conversations WHERE visitor_user_id = ?')
		.bind(visitorUserId)
		.first();
	if (!row) {
		throw new Error('Failed to get or create conversation');
	}
	return /** @type {{ id: string, visitor_user_id: string, created_at: string }} */ (row);
}

/**
 * @param {D1Database} db
 * @returns {Promise<Array<{ id: string, visitor_user_id: string, display_name: string, last_message: string | null, last_at: string | null }>>}
 */
export async function getAllConversations(db) {
	const { results } = await db
		.prepare(
			`SELECT c.id, c.visitor_user_id, u.display_name,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_at
      FROM conversations c
      JOIN users u ON c.visitor_user_id = u.id
      ORDER BY last_at DESC`,
		)
		.all();
	return /** @type {Array<{ id: string, visitor_user_id: string, display_name: string, last_message: string | null, last_at: string | null }>} */ (
		results
	);
}

/**
 * @param {D1Database} db
 * @param {string} conversationId
 * @returns {Promise<Array<{ id: string, sender_user_id: string, content: string, createdAt: string }>>}
 */
export async function getMessages(db, conversationId) {
	const { results } = await db
		.prepare(
			"SELECT id, sender_user_id, content, strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
		)
		.bind(conversationId)
		.all();
	return /** @type {Array<{ id: string, sender_user_id: string, content: string, createdAt: string }>} */ (
		results
	);
}

/**
 * @param {D1Database} db
 * @param {{ id: string, conversationId: string, senderUserId: string, content: string }} opts
 */
export async function createMessage(db, { id, conversationId, senderUserId, content }) {
	await db
		.prepare(
			'INSERT INTO messages (id, conversation_id, sender_user_id, content) VALUES (?, ?, ?, ?)',
		)
		.bind(id, conversationId, senderUserId, content)
		.run();
}

/**
 * @param {D1Database} db
 * @param {string} conversationId
 * @returns {Promise<{ sender_display_name: string, content: string } | null>}
 */
export function getLatestMessage(db, conversationId) {
	return db
		.prepare(
			`SELECT u.display_name as sender_display_name, m.content
       FROM messages m JOIN users u ON m.sender_user_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC LIMIT 1`,
		)
		.bind(conversationId)
		.first();
}

/**
 * @param {D1Database} db
 * @param {{ id: string, userId: string, endpoint: string, p256dh: string, auth: string }} opts
 */
export async function savePushSubscription(db, { id, userId, endpoint, p256dh, auth }) {
	await db
		.prepare(
			`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh  = excluded.p256dh,
         auth    = excluded.auth`,
		)
		.bind(id, userId, endpoint, p256dh, auth)
		.run();
}

/**
 * @param {D1Database} db
 * @param {string} userId
 * @returns {Promise<Array<{ id: string, endpoint: string, p256dh: string, auth: string }>>}
 */
export async function getPushSubscriptionsByUser(db, userId) {
	const { results } = await db
		.prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?')
		.bind(userId)
		.all();
	return /** @type {Array<{ id: string, endpoint: string, p256dh: string, auth: string }>} */ (
		results
	);
}

/**
 * @param {D1Database} db
 * @returns {Promise<Array<{ id: string, endpoint: string, p256dh: string, auth: string }>>}
 */
export async function getOwnerPushSubscriptions(db) {
	const { results } = await db
		.prepare(
			`SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions ps
       JOIN users u ON ps.user_id = u.id
       WHERE u.is_owner = 1`,
		)
		.all();
	return /** @type {Array<{ id: string, endpoint: string, p256dh: string, auth: string }>} */ (
		results
	);
}

/**
 * @param {D1Database} db
 * @param {string} endpoint
 */
export function deletePushSubscription(db, endpoint) {
	return db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
}

/** Remove stale challenges to keep the table small. */
/** @param {D1Database} db */
export function cleanExpiredChallenges(db) {
	return db.prepare('DELETE FROM auth_challenges WHERE expires_at < ?').bind(Date.now()).run();
}
