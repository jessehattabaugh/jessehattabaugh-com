-- Only email proof qualifies; legacy passkey-only senders remain unverified.
-- New anonymous submissions require their own email link.
ALTER TABLE messages ADD COLUMN verified_at TEXT;
ALTER TABLE messages ADD COLUMN verification_id TEXT;
UPDATE messages SET verified_at = created_at
WHERE sender_user_id IN (SELECT id FROM users WHERE email_verified = 1);
CREATE INDEX IF NOT EXISTS idx_messages_verification ON messages(verification_id);
