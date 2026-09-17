-- Rainbow Hour app: anonymous push subscriptions keyed by endpoint.
-- No accounts — one row per browser/device that enabled rainbow alerts.
-- Coordinates are rounded to 2 decimals (~1 km) before storage; that is all
-- the solar math needs, so no precise location is ever retained.
CREATE TABLE IF NOT EXISTS rainbow_subscriptions (
  id               TEXT PRIMARY KEY,
  endpoint         TEXT    NOT NULL UNIQUE,  -- push service URL
  p256dh           TEXT    NOT NULL,         -- subscription key (base64url)
  auth             TEXT    NOT NULL,         -- subscription auth secret (base64url)
  latitude         REAL    NOT NULL,         -- rounded to ~1 km precision
  longitude        REAL    NOT NULL,
  timezone         TEXT    NOT NULL,         -- IANA zone name, e.g. "America/New_York"
  last_notified_at INTEGER,                  -- Unix ms of last wake push (rate limiting)
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rainbow_subscriptions_endpoint
  ON rainbow_subscriptions(endpoint);
