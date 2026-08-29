-- 003: email verification for messaging

-- users gain an optional, unique email plus a verified flag. Email is the
-- cross-device identity anchor: two passkeys on different devices resolve to
-- the same user_id when they share a verified email.
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- Partial unique index: a given email maps to at most one user, while the many
-- legacy/anonymous users with NULL email remain unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON users(email) WHERE email IS NOT NULL;

-- Single-use, expiring verification tokens. `purpose` distinguishes
-- 'register' (finish passkey creation) from 'guest-message' (publish a held
-- no-JS guest message). `payload` is JSON, e.g. the held guest message.
CREATE TABLE IF NOT EXISTS email_verifications (
  id         TEXT    PRIMARY KEY,  -- token (random UUID), also the id
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email      TEXT    NOT NULL,
  purpose    TEXT    NOT NULL DEFAULT 'register',
  payload    TEXT,
  expires_at INTEGER NOT NULL,     -- Unix timestamp ms
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications(user_id);