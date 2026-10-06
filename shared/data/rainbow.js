/** @import { D1Database } from '@cloudflare/workers-types' */

/**
 * @typedef {Object} RainbowSubscription
 * @property {string} id
 * @property {string} endpoint
 * @property {string} p256dh
 * @property {string} auth
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} timezone
 * @property {number | null} last_notified_at
 */

/** @typedef {Omit<RainbowSubscription, 'last_notified_at'>} NewRainbowSubscription */

/**
 * Save (or refresh) a Rainbow Hour push subscription. Keyed by endpoint so a
 * device re-enabling alerts or moving to a new location updates in place.
 * @param {D1Database} db
 * @param {NewRainbowSubscription} sub
 */
export async function saveRainbowSubscription(db, sub) {
	await db
		.prepare(
			`INSERT INTO rainbow_subscriptions (id, endpoint, p256dh, auth, latitude, longitude, timezone)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(endpoint) DO UPDATE SET
			   p256dh = excluded.p256dh,
			   auth = excluded.auth,
			   latitude = excluded.latitude,
			   longitude = excluded.longitude,
			   timezone = excluded.timezone`,
		)
		.bind(sub.id, sub.endpoint, sub.p256dh, sub.auth, sub.latitude, sub.longitude, sub.timezone)
		.run();
}

/**
 * Remove a subscription (user disabled alerts, or the push service said 410).
 * @param {D1Database} db
 * @param {string} endpoint
 */
export async function deleteRainbowSubscription(db, endpoint) {
	await db.prepare('DELETE FROM rainbow_subscriptions WHERE endpoint = ?').bind(endpoint).run();
}

/** @param {D1Database} db @param {string} endpoint */
export async function hasRainbowSubscription(db, endpoint) {
	return !!(await db.prepare('SELECT 1 FROM rainbow_subscriptions WHERE endpoint = ?').bind(endpoint).first());
}

/**
 * All subscriptions, for the wake cron to filter by sun position.
 * @param {D1Database} db
 * @returns {Promise<RainbowSubscription[]>}
 */
export function listRainbowSubscriptions(db) {
	return db
		.prepare(
			'SELECT id, endpoint, p256dh, auth, latitude, longitude, timezone, last_notified_at FROM rainbow_subscriptions',
		)
		.all()
		.then((result) => {
			return /** @type {RainbowSubscription[]} */ (/** @type {unknown} */ (result.results ?? []));
		});
}

/**
 * Record that a wake push was sent, for per-device rate limiting.
 * @param {D1Database} db
 * @param {string} endpoint
 * @param {number} atMs  Unix epoch milliseconds
 */
export async function markRainbowNotified(db, endpoint, atMs) {
	await db
		.prepare('UPDATE rainbow_subscriptions SET last_notified_at = ? WHERE endpoint = ?')
		.bind(atMs, endpoint)
		.run();
}
