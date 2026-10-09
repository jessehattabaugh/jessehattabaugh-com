-- Canonical schema reference; migrations are the mechanism of change.

-- Unused since the Messages app replaced the legacy contact form, but the
-- table still exists in production — migrations are additive-only.
CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT    PRIMARY KEY,
  display_name   TEXT    NOT NULL,
  is_owner       INTEGER NOT NULL DEFAULT 0,
  email          TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON users(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS passkeys (
  id         TEXT    PRIMARY KEY,  -- credential ID (base64url)
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT    NOT NULL,     -- uncompressed EC point base64url (0x04||x||y)
  counter    INTEGER NOT NULL DEFAULT 0,
  transports TEXT,                 -- JSON array e.g. '["internal","hybrid"]'
  backed_up  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id         TEXT    PRIMARY KEY,
  challenge  TEXT    NOT NULL,  -- base64url random bytes
  user_id    TEXT    REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL DEFAULT 'register',
  expires_at INTEGER NOT NULL  -- Unix timestamp ms
);

-- One conversation per visitor (1:1 with Jesse)
CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  visitor_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id         TEXT    PRIMARY KEY,  -- token (random UUID), also the id
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email      TEXT    NOT NULL,
  purpose    TEXT    NOT NULL DEFAULT 'register',
  payload    TEXT,
  expires_at INTEGER NOT NULL,     -- Unix timestamp ms
  consumed_at INTEGER,             -- Unix timestamp ms when the token was used (single-use)
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_user
  ON passkeys(user_id);

-- Rainbow Hour app: anonymous push subscriptions keyed by endpoint (no accounts).
-- Coordinates are rounded to 2 decimals (~1 km) before storage.
CREATE TABLE IF NOT EXISTS rainbow_subscriptions (
  id               TEXT PRIMARY KEY,
  endpoint         TEXT    NOT NULL UNIQUE,
  p256dh           TEXT    NOT NULL,
  auth             TEXT    NOT NULL,
  latitude         REAL    NOT NULL,
  longitude        REAL    NOT NULL,
  timezone         TEXT    NOT NULL,
  last_notified_at INTEGER,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rainbow_subscriptions_endpoint
  ON rainbow_subscriptions(endpoint);
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
