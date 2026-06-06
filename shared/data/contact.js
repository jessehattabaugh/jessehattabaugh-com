/**
 * @param {D1Database} db
 * @param {{ name: string, email: string, message: string }} data
 * @returns {Promise<void>}
 */
export async function insertContactMessage(db, { name, email, message }) {
	await db
		.prepare('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)')
		.bind(name, email, message)
		.run();
}

/**
 * @param {D1Database} db
 * @returns {Promise<import('../types.js').ContactMessage[]>}
 */
export async function listContactMessages(db) {
	const { results } = await db
		.prepare(
			'SELECT id, name, email, message, created_at FROM contact_messages ORDER BY created_at DESC, id DESC',
		)
		.all();
	return /** @type {import('../types.js').ContactMessage[]} */ (results ?? []);
}

/**
 * @param {D1Database} db
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteContactMessage(db, id) {
	await db.prepare('DELETE FROM contact_messages WHERE id = ?').bind(id).run();
}
