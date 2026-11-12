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
 * Update a user's profile in place — used when a pre-auth guest (identified by
 * a no-JS session cookie) later registers a passkey, so their existing id and
 * message history carry over instead of forking into a second user.
 * @param {D1Database} db
 * @param {{ id: string, displayName: string, isOwner: boolean, email?: string | null }} opts
 */
export async function updateUserProfile(db, { id, displayName, isOwner, email = null }) {
	const current = await getUserById(db, id);
	const normalizedEmail = email ? normalizeEmail(email) : current?.email || null;
	const nextVerified = current?.email === normalizedEmail ? current.email_verified : 0;
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

/** @param {D1Database} db @returns {Promise<{ id: string, display_name: string } | null>} */
export function getOwner(db) {
	return db.prepare('SELECT id, display_name FROM users WHERE is_owner = 1 LIMIT 1').first();
}

/** Claim once, atomically; parallel setup requests cannot create two owners. */
/** @param {D1Database} db @param {string} id */
export async function claimOwner(db, id) {
	const result = await db.prepare('UPDATE users SET is_owner = 1 WHERE id = ? AND email_verified = 1 AND NOT EXISTS (SELECT 1 FROM users WHERE is_owner = 1)')
		.bind(id).run();
	return result.meta.changes === 1;
}
