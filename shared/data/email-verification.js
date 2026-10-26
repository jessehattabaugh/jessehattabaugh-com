/** @import { D1Database } from '@cloudflare/workers-types' */
import { normalizeEmail } from './accounts.js';

/** Email proof and held-message approval share one transaction; keep that atomic boundary intact. */

/**
 * @typedef {{ id: string, user_id: string, email: string, purpose: string, payload: string | null, expires_at: number, consumed_at: number | null }} EmailVerification
 */

/** Remove stale verification records to keep the table small. @param {D1Database} db */
export function cleanExpiredEmailVerifications(db) {
	return db.prepare('DELETE FROM email_verifications WHERE expires_at < ?').bind(Date.now()).run();
}

/**
 * Create a single-use email verification record.
 * @param {D1Database} db
 * @param {{ id: string, userId: string, email: string, purpose: string, payload?: string | null, message?: {id: string, conversationId: string, content: string}, ttlMs?: number }} opts
 */
export async function createEmailVerification(
	db,
	{ id, userId, email, purpose = 'register', payload = null, message, ttlMs = 15 * 60 * 1000 },
) {
	// Opportunistic maintenance runs on every email request, including previews
	// without scheduled triggers. Valid and retryable proofs remain untouched.
	await cleanExpiredEmailVerifications(db);
	const expiresAt = Date.now() + ttlMs;
	const statements = [db.prepare('INSERT INTO email_verifications (id, user_id, email, purpose, payload, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(id, userId, normalizeEmail(email), purpose, payload, expiresAt)];
	if (message) {
		statements.push(db.prepare('INSERT INTO messages (id, conversation_id, sender_user_id, content, verification_id) VALUES (?, ?, ?, ?, ?)')
			.bind(message.id, message.conversationId, userId, message.content, id));
	}
	if (message) { await db.batch(statements); }
	else { await statements[0].run(); }
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
 * Commit email proof and message verification together. Every write
 * checks the same pending token; competing submissions become no-ops. D1 batch
 * rolls back all writes on failure, keeping the original link retryable.
 * @param {D1Database} db
 * @param {EmailVerification} verification
 * @param {string | null} content Legacy, pre-migration held message.
 */
export async function completeEmailVerification(db, verification, content = null) {
	const now = Date.now();
	const pending = `EXISTS (SELECT 1 FROM email_verifications v WHERE v.id = ? AND v.consumed_at IS NULL AND v.expires_at >= ?
		AND (v.purpose = 'profile' OR v.email = (SELECT email FROM users WHERE id = v.user_id)))`;
	const statements = [
		db.prepare(`UPDATE users SET email = CASE WHEN ? = 'profile' THEN ? ELSE email END, email_verified = 1 WHERE id = ? AND ${pending}`)
			.bind(verification.purpose, verification.email, verification.user_id, verification.id, now),
		db.prepare(`INSERT INTO conversations (id, visitor_user_id) SELECT ?, id FROM users WHERE id = ? AND (is_owner = 0 OR ? IS NOT NULL) AND ${pending} ON CONFLICT(visitor_user_id) DO NOTHING`)
			.bind(crypto.randomUUID(), verification.user_id, content, verification.id, now),
	];
	if (content !== null) {
		statements.push(db.prepare(`INSERT INTO messages (id, conversation_id, sender_user_id, content, verified_at)
			SELECT ?, id, visitor_user_id, ?, datetime('now') FROM conversations WHERE visitor_user_id = ? AND ${pending} RETURNING conversation_id`)
			.bind(crypto.randomUUID(), content, verification.user_id, verification.id, now));
	}
	// Only this submission's token can approve it, even when the account was
	// already verified. An unrelated sign-in must never approve spoofed messages.
	const messageIndex = statements.length;
	statements.push(db.prepare(`UPDATE messages SET verified_at = datetime('now')
		WHERE (verification_id = ? OR verification_id IS NULL) AND sender_user_id = ? AND verified_at IS NULL AND ${pending}
		RETURNING conversation_id, content`)
		.bind(verification.id, verification.user_id, verification.id, now));
	statements.push(db.prepare(`UPDATE email_verifications SET consumed_at = ? WHERE id = ? AND ${pending} RETURNING id`)
		.bind(now, verification.id, verification.id, now));
	const results = await db.batch(statements);
	if (!results.at(-1)?.results.length) { return null; }
	const message = /** @type {{conversation_id: string, content?: string} | undefined} */ (results[messageIndex].results[0] ?? (content === null ? undefined : results[2].results[0]));
	return { conversationId: message?.conversation_id ?? null, content: message?.content ?? content };
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
