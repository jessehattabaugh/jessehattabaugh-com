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
  id           TEXT    PRIMARY KEY,
  display_name TEXT    NOT NULL,
  is_owner     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

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

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_user
  ON passkeys(user_id);
