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
