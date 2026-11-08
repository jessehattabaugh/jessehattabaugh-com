/** @import { D1Database } from '@cloudflare/workers-types' */

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
 * @param {D1Database} db
 * @param {{ id: string, counter: number, backedUp?: boolean }} opts
 */
export async function updatePasskeyCounter(db, { id, counter, backedUp = false }) {
	await db
		.prepare('UPDATE passkeys SET counter = ?, backed_up = ? WHERE id = ?')
		.bind(counter, backedUp ? 1 : 0, id)
		.run();
}

/** Remove stale challenges to keep the table small. @param {D1Database} db */
export function cleanExpiredChallenges(db) {
	return db.prepare('DELETE FROM auth_challenges WHERE expires_at < ?').bind(Date.now()).run();
}

/**
 * @param {D1Database} db
 * @param {{ id: string, challenge: string, userId?: string | null, type?: string }} opts
 */
export async function createChallenge(db, { id, challenge, userId = null, type = 'register' }) {
	// Canceled WebAuthn prompts never complete their challenges. Reclaim only
	// expired records before starting another ceremony, without relying on cron.
	await cleanExpiredChallenges(db);
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
