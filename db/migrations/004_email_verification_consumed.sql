-- 004: track when a verification token was used

-- consumed_at records when a single-use verification token was completed, so
-- register/begin can require a freshly-completed email verification (rather than
-- a stale email_verified flag) before attaching a passkey to an existing user.
ALTER TABLE email_verifications ADD COLUMN consumed_at INTEGER;