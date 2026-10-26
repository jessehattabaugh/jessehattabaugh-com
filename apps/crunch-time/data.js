/** @typedef {{ id: string, reps: number, style: string, created_at: string }} Workout */
/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} owner */
export async function crunchHistory(db, owner) {
	const totals = await db.prepare(`SELECT
		COALESCE((SELECT SUM(reps) FROM crunch_workouts WHERE owner = ?), 0) AS reps,
		(SELECT COUNT(*) FROM crunch_meals WHERE owner = ?) AS meals,
		(SELECT MAX(created_at) FROM crunch_meals WHERE owner = ?) AS fed`).bind(owner, owner, owner).first();
	const history = await db.prepare('SELECT id, reps, style, created_at FROM crunch_workouts WHERE owner = ? ORDER BY created_at DESC, rowid DESC LIMIT 20').bind(owner).all();
	return { reps: Number(totals?.reps ?? 0), meals: Number(totals?.meals ?? 0), fed: String(totals?.fed ?? ''), history: /** @type {Workout[]} */ (history.results) };
}
/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} owner @param {string} id @param {number} reps @param {string} style */
export async function saveCrunchWorkout(db, owner, id, reps, style) {
	await db.prepare('INSERT INTO crunch_workouts (owner, id, reps, style) VALUES (?, ?, ?, ?) ON CONFLICT(owner, id) DO NOTHING').bind(owner, id, reps, style).run();
}
/** A single conditional statement prevents concurrent meals overspending points.
 * @param {import('@cloudflare/workers-types').D1Database} db @param {string} owner @param {string} id */
export async function feedCrunchPet(db, owner, id) {
	const result = await db.prepare(`INSERT INTO crunch_meals (owner, id)
		SELECT ?, ? WHERE
		COALESCE((SELECT SUM(reps) FROM crunch_workouts WHERE owner = ?), 0)
		- 10 * (SELECT COUNT(*) FROM crunch_meals WHERE owner = ?) >= 10
		ON CONFLICT(owner, id) DO NOTHING`).bind(owner, id, owner, owner).run();
	if (result.meta.changes > 0) { return true; }
	// A retry of an already committed meal is also a successful operation.
	return Boolean(await db.prepare('SELECT id FROM crunch_meals WHERE owner = ? AND id = ?').bind(owner, id).first());
}
