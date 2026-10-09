-- Small, bounded photos use the same isolated D1 binding as their posts.
CREATE TABLE IF NOT EXISTS light_photos (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	mime TEXT NOT NULL,
	image BLOB NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS light_posts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	photo_id TEXT NOT NULL UNIQUE REFERENCES light_photos(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	address TEXT NOT NULL,
	address_key TEXT NOT NULL,
	county TEXT NOT NULL,
	state TEXT NOT NULL,
	country TEXT NOT NULL,
	lat REAL NOT NULL CHECK(lat BETWEEN -85 AND 85),
	lon REAL NOT NULL CHECK(lon BETWEEN -180 AND 180),
	holiday TEXT NOT NULL,
	season INTEGER NOT NULL,
	observed TEXT NOT NULL,
	ends TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','gone','hidden')),
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_light_season ON light_posts(holiday, season, status, lat, lon);
CREATE INDEX IF NOT EXISTS idx_light_author ON light_posts(user_id, created_at);
CREATE TABLE IF NOT EXISTS light_ratings (
	post_id TEXT NOT NULL REFERENCES light_posts(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
	PRIMARY KEY(post_id, user_id)
);
CREATE TABLE IF NOT EXISTS light_reports (
	post_id TEXT NOT NULL REFERENCES light_posts(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	reason TEXT NOT NULL CHECK(reason IN ('spam','gone')),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(post_id, user_id)
);
