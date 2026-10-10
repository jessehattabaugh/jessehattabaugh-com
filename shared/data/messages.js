/** @import { D1Database } from '@cloudflare/workers-types' */

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
 * @returns {Promise<Array<{ id: string, sender_user_id: string, content: string, senderName: string, createdAt: string }>>}
 */
export async function getMessages(db, conversationId) {
	const { results } = await db
		.prepare(
			"SELECT m.id, m.sender_user_id, m.content, u.display_name AS senderName, strftime('%Y-%m-%dT%H:%M:%fZ', m.created_at) AS createdAt FROM messages m JOIN users u ON u.id = m.sender_user_id WHERE m.conversation_id = ? ORDER BY m.created_at ASC, m.rowid ASC",
		)
		.bind(conversationId)
		.all();
	return /** @type {Array<{ id: string, sender_user_id: string, content: string, senderName: string, createdAt: string }>} */ (
		results
	);
}

/** @param {D1Database} db @param {string} id @returns {Promise<{ id: string, visitor_user_id: string } | null>} */
export function getConversation(db, id) {
	return db.prepare('SELECT id, visitor_user_id FROM conversations WHERE id = ?').bind(id)
		.first();
}

/** @param {D1Database} db @param {string} userId @returns {Promise<{ id: string, visitor_user_id: string } | null>} */
export function getUserConversation(db, userId) {
	return db.prepare('SELECT id, visitor_user_id FROM conversations WHERE visitor_user_id = ?').bind(userId).first();
}

/** @param {D1Database} db @param {string} endpoint @param {string} userId */
export function deleteUserPushSubscription(db, endpoint, userId) {
	return db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint, userId).run();
}

/** @param {D1Database} db @param {string} endpoint @param {string} userId */
export async function hasUserPushSubscription(db, endpoint, userId) {
	return !!(await db.prepare('SELECT 1 FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint, userId).first());
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
