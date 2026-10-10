/** @typedef {import('@cloudflare/workers-types').D1Database} DB */
/** @typedef {{id: string, user_id: string, photo_id: string, title: string, description: string, address: string, address_key: string, county: string, state: string, country: string, lat: number, lon: number, holiday: string, season: number, observed: string, ends: string, status: string, created_at: string, average: number, votes: number, reports: number, spam_reports: number, gone_reports: number}} LightPost */
const columns = `p.*, COALESCE((SELECT AVG(score) FROM light_ratings WHERE post_id = p.id), 0) AS average,
	(SELECT COUNT(*) FROM light_ratings WHERE post_id = p.id) AS votes,
	(SELECT COUNT(*) FROM light_reports WHERE post_id = p.id) AS reports,
	(SELECT COUNT(*) FROM light_reports WHERE post_id = p.id AND reason = 'spam') AS spam_reports,
	(SELECT COUNT(*) FROM light_reports WHERE post_id = p.id AND reason = 'gone') AS gone_reports`;

/** Geographical SQL bounding box limits scanned rows; exact radius is applied in shared code.
 * @param {DB} db @param {{holiday: string, season: number, lat: number, lon: number, radius: number, history: boolean}} filters */
export async function listLights(db, filters) {
	const dy = filters.radius / 111;
	const dx = Math.min(180, dy / Math.max(0.05, Math.cos(filters.lat * Math.PI / 180)));
	const { results } = await db.prepare(`SELECT ${columns} FROM light_posts p
		WHERE holiday = ? AND season BETWEEN ? AND ? AND status != 'hidden'
		AND lat BETWEEN ? AND ? AND (ABS(lon - ?) <= ? OR ABS(lon - ?) >= 360 - ?)
		ORDER BY season DESC, observed DESC, id LIMIT 501`)
		.bind(filters.holiday, filters.history ? filters.season - 3 : filters.season, filters.season,
			filters.lat - dy, filters.lat + dy, filters.lon, dx, filters.lon, dx).all();
	return /** @type {LightPost[]} */ (results);
}
/** @param {DB} db @param {string} id */
export function getLight(db, id) {
	return db.prepare(`SELECT ${columns} FROM light_posts p WHERE p.id = ?`).bind(id).first().then((row) => { return /** @type {LightPost | null} */ (row); });
}
/** @param {DB} db @param {string} id @param {string} user */
export function draftPhoto(db, id, user) {
	return db.prepare('SELECT id FROM light_photos WHERE id = ? AND user_id = ? AND NOT EXISTS (SELECT 1 FROM light_posts WHERE photo_id = ?) AND created_at > datetime(\'now\', \'-1 day\')').bind(id, user, id).first();
}
/** @param {DB} db @param {string} user @param {string} mime @param {ArrayBuffer} image */
export async function savePhoto(db, user, mime, image) {
	const id = crypto.randomUUID();
	await db.prepare(`DELETE FROM light_photos WHERE created_at < datetime('now', '-1 day') AND NOT EXISTS (SELECT 1 FROM light_posts WHERE photo_id = light_photos.id)`).run();
	// Cap draft storage per account as well as published posts.
	const result = await db.prepare(`INSERT INTO light_photos (id, user_id, mime, image) SELECT ?, ?, ?, ?
		WHERE (SELECT COUNT(*) FROM light_photos WHERE user_id = ? AND created_at > datetime('now', '-1 day')) < 20`)
		.bind(id, user, mime, image, user).run();
	return result.meta.changes ? id : null;
}
/** @param {DB} db @param {string} id @param {string | null} user @param {boolean} [moderator] */
export function getPhoto(db, id, user, moderator = false) {
	return db.prepare(`SELECT mime, image FROM light_photos WHERE id = ? AND (
		EXISTS (SELECT 1 FROM light_posts WHERE photo_id = ? AND (status != 'hidden' OR ? = 1)) OR
		(user_id = ? AND NOT EXISTS (SELECT 1 FROM light_posts WHERE photo_id = ?)))`)
		.bind(id, id, moderator ? 1 : 0, user, id).first().then((row) => { return /** @type {{mime: string, image: number[] | ArrayBuffer} | null} */ (row); });
}
/** @param {DB} db @param {Omit<LightPost, 'created_at' | 'average' | 'votes' | 'reports' | 'status' | 'spam_reports' | 'gone_reports'>} post */
export async function publishLight(db, post) {
	const result = await db.prepare(`INSERT INTO light_posts
		(id, user_id, photo_id, title, description, address, address_key, county, state, country, lat, lon, holiday, season, observed, ends)
		SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE
		(SELECT COUNT(*) FROM light_posts WHERE user_id = ? AND created_at > datetime('now', '-1 day')) < 10
		AND EXISTS (SELECT 1 FROM light_photos WHERE id = ? AND user_id = ? AND NOT EXISTS (SELECT 1 FROM light_posts WHERE photo_id = ?))`)
		.bind(post.id, post.user_id, post.photo_id, post.title, post.description, post.address, post.address_key,
			post.county, post.state, post.country, post.lat, post.lon, post.holiday, post.season, post.observed, post.ends,
			post.user_id, post.photo_id, post.user_id, post.photo_id).run();
	return !!result.meta.changes;
}
/** @param {DB} db @param {string} id @param {string} user @param {number} score */
export function rateLight(db, id, user, score) {
	return db.prepare(`INSERT INTO light_ratings (post_id, user_id, score)
		SELECT id, ?, ? FROM light_posts WHERE id = ? AND user_id != ? AND status = 'active' AND ends >= date('now')
		ON CONFLICT(post_id, user_id) DO UPDATE SET score = excluded.score`).bind(user, score, id, user).run();
}
/** Each verified account has one report. Owner reports take effect immediately; three others quarantine.
 * @param {DB} db @param {string} id @param {string} user @param {'spam'|'gone'} reason */
export async function reportLight(db, id, user, reason) {
	await db.batch([
		db.prepare(`INSERT INTO light_reports (post_id, user_id, reason) VALUES (?, ?, ?)
			ON CONFLICT(post_id, user_id) DO UPDATE SET reason = excluded.reason`).bind(id, user, reason),
		db.prepare(`UPDATE light_posts SET status = CASE
			WHEN (SELECT COUNT(*) FROM light_reports WHERE post_id = ? AND reason = 'spam') >= 3 THEN 'hidden'
			WHEN (user_id = ? AND ? = 'gone') OR (SELECT COUNT(*) FROM light_reports WHERE post_id = ? AND reason = 'gone') >= 3 THEN 'gone'
			ELSE status END WHERE id = ?`).bind(id, user, reason, id, id),
	]);
}
/** @param {DB} db @param {string} id @param {'active'|'gone'|'hidden'} status */
export function moderateLight(db, id, status) {
	// Clear resolved reports so stale reports cannot immediately quarantine a restored post.
	return db.batch([
		db.prepare('DELETE FROM light_reports WHERE post_id = ?').bind(id),
		db.prepare('UPDATE light_posts SET status = ? WHERE id = ?').bind(status, id),
	]);
}
/** @param {DB} db */
export async function moderationQueue(db) {
	const { results } = await db.prepare(`SELECT ${columns} FROM light_posts p WHERE
		status != 'active' OR EXISTS (SELECT 1 FROM light_reports WHERE post_id = p.id)
		ORDER BY created_at DESC LIMIT 100`).all();
	return /** @type {LightPost[]} */ (results);
}
/** Full-region address rankings are independent of viewport/result limits.
 * Each voter contributes once per address, averaging their votes across photos.
 * @param {DB} db @param {string} holiday @param {number} season @param {'county'|'state'|'country'} scope @param {string} region @param {string} country @param {string} state */
export async function awardStandings(db, holiday, season, scope, region, country, state) {
	// scope is a closed server enum, never interpolated from untrusted text.
	const { results } = await db.prepare(`WITH eligible AS (
		SELECT * FROM light_posts WHERE holiday = ? AND season = ? AND status != 'hidden' AND ${scope} = ? AND (? = 'country' OR country = ?) AND (? != 'county' OR state = ?)
	), voters AS (
		SELECT p.address_key, r.user_id, AVG(r.score) score FROM eligible p JOIN light_ratings r ON r.post_id = p.id GROUP BY p.address_key, r.user_id
	), scores AS (
		SELECT address_key, AVG(score) average, COUNT(*) votes FROM voters GROUP BY address_key
	)
	SELECT p.address_key, MIN(p.address) address, MIN(p.title) title, MIN(p.id) id,
		COUNT(*) posts, MAX(p.ends) ends, (SELECT MAX(ends) FROM eligible) season_end, COALESCE(s.average, 0) average, COALESCE(s.votes, 0) votes,
		(COALESCE(s.average, 0) * COALESCE(s.votes, 0) + 15.0) / (COALESCE(s.votes, 0) + 5) merit
	FROM eligible p LEFT JOIN scores s ON s.address_key = p.address_key
	GROUP BY p.address_key ORDER BY merit DESC, votes DESC, p.address_key LIMIT 100`).bind(holiday, season, region, scope, country, scope, state).all();
	return /** @type {Array<{address_key: string, address: string, title: string, id: string, posts: number, ends: string, season_end: string, average: number, votes: number, merit: number}>} */ (results);
}
