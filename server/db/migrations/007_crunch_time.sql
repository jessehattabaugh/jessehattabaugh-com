-- Device-scoped, anonymous workout ledger. Unique IDs make retries harmless.
CREATE TABLE IF NOT EXISTS crunch_workouts (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	reps INTEGER NOT NULL CHECK(reps BETWEEN 1 AND 1000),
	style TEXT NOT NULL CHECK(style IN ('standard', 'twist')),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(owner, id)
);
CREATE TABLE IF NOT EXISTS crunch_meals (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(owner, id)
);
