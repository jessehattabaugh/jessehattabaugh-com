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

/**
 * @typedef {{ id: string, user_id: string, email: string, purpose: string, payload: string | null, expires_at: number, consumed_at: number | null }} EmailVerification
 */

/** Remove stale verification records to keep the table small. */
/** @param {D1Database} db */
export function cleanExpiredEmailVerifications(db) {
	return db.prepare('DELETE FROM email_verifications WHERE expires_at < ?').bind(Date.now()).run();
}

/**
 * Create a single-use email verification record.
 * @param {D1Database} db
 * @param {{ id: string, userId: string, email: string, purpose: string, payload?: string | null, ttlMs?: number }} opts
 */
export async function createEmailVerification(
	db,
	{ id, userId, email, purpose = 'register', payload = null, ttlMs = 15 * 60 * 1000 },
) {
	// Opportunistic maintenance runs on every email request, including previews
	// without scheduled triggers. Valid and retryable proofs remain untouched.
	await cleanExpiredEmailVerifications(db);
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
			'UPDATE email_verifications SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at >= ? RETURNING id, user_id, email, purpose, payload, expires_at, consumed_at',
		)
		.bind(Date.now(), id, Date.now())
		.first();
}

/**
 * Commit proof, profile, conversation and a held message together. Every write
 * checks the same pending token; competing submissions become no-ops. D1 batch
 * rolls back all writes on failure, keeping the original link retryable.
 * @param {D1Database} db
 * @param {EmailVerification} verification
 * @param {string | null} content
 */
export async function completeEmailVerification(db, verification, content = null) {
	const now = Date.now();
	const pending = `EXISTS (SELECT 1 FROM email_verifications v WHERE v.id = ? AND v.consumed_at IS NULL AND v.expires_at >= ?
		AND (v.purpose = 'profile' OR v.email = (SELECT email FROM users WHERE id = v.user_id)))`;
	const statements = [
		db.prepare(`UPDATE users SET email = CASE WHEN ? = 'profile' THEN ? ELSE email END, email_verified = 1 WHERE id = ? AND ${pending}`)
			.bind(verification.purpose, verification.email, verification.user_id, verification.id, now),
	];
	if (content !== null) {
		statements.push(db.prepare(`INSERT INTO conversations (id, visitor_user_id) SELECT ?, id FROM users WHERE id = ? AND (is_owner = 0 OR ? IS NOT NULL) AND ${pending} ON CONFLICT(visitor_user_id) DO NOTHING`)
			.bind(crypto.randomUUID(), verification.user_id, content, verification.id, now));
	}
	if (content !== null) {
		statements.push(db.prepare(`INSERT INTO messages (id, conversation_id, sender_user_id, content)
			SELECT ?, id, visitor_user_id, ? FROM conversations WHERE visitor_user_id = ? AND ${pending} RETURNING conversation_id`)
			.bind(crypto.randomUUID(), content, verification.user_id, verification.id, now));
	}
	statements.push(db.prepare(`UPDATE email_verifications SET consumed_at = ? WHERE id = ? AND ${pending} RETURNING id`)
		.bind(now, verification.id, verification.id, now));
	const results = await db.batch(statements);
	if (!results.at(-1)?.results.length) { return null; }
	const message = content === null ? null : results[2].results[0];
	return { conversationId: message ? String(/** @type {{ conversation_id: string }} */ (message).conversation_id) : null };
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

/** Remove stale challenges to keep the table small. */
/** @param {D1Database} db */
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


