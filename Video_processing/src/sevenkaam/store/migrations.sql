-- Local prototype database (spec section 6: "SQLite for a local prototype
-- database"). This is the module's own record, entirely separate from the
-- platform's Postgres. It is authoritative for idempotency and is the source
-- for error analysis and calibration -- NOT Worker.videoScore, which only ever
-- sees promoted outcomes and is therefore upward-biased by construction.

CREATE TABLE IF NOT EXISTS assessments (
    id                  TEXT PRIMARY KEY,
    submission_id       TEXT NOT NULL,
    worker_id           TEXT NOT NULL,
    trade_id            TEXT NOT NULL,
    challenge_id        TEXT,
    decision            TEXT NOT NULL,
    score               REAL NOT NULL,
    score_100           REAL NOT NULL,
    evidence_coverage   REAL NOT NULL,
    reason_codes        TEXT NOT NULL,   -- JSON array
    components          TEXT NOT NULL,   -- JSON object
    report              TEXT NOT NULL,   -- JSON object
    versions            TEXT NOT NULL,   -- JSON object
    adapter_modes       TEXT NOT NULL,   -- JSON object
    idempotency_key     TEXT NOT NULL,
    media_sha256        TEXT,
    media_phash         TEXT,
    assessed_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_worker ON assessments (worker_id);
CREATE INDEX IF NOT EXISTS idx_assessments_key    ON assessments (idempotency_key);

-- One row per completed unit of remote work. scoring_log_written is tracked
-- separately from the VideoAssessment insert so a crash between the two remote
-- writes resumes by doing only the missing half, never both again.
CREATE TABLE IF NOT EXISTS assessment_idempotency (
    idempotency_key      TEXT PRIMARY KEY,
    submission_id        TEXT NOT NULL,
    video_assessment_id  TEXT,
    scoring_log_written  INTEGER NOT NULL DEFAULT 0,
    note_tag             TEXT,
    created_at           TEXT NOT NULL
);

-- Duplicate-detection history. Necessary because the platform overwrites each
-- worker's video at a fixed storage path, so prior attempts cannot be re-fetched.
CREATE TABLE IF NOT EXISTS media_hash (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id           TEXT NOT NULL,
    sha256              TEXT,
    phash               TEXT,
    seen_at             TEXT NOT NULL,
    video_assessment_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_hash_worker ON media_hash (worker_id);

-- Writebacks that could not complete (backend unreachable, table missing).
-- Retried by `sevenkaam sync`, so a recompute never silently vanishes.
CREATE TABLE IF NOT EXISTS pending_writeback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    idempotency_key TEXT NOT NULL,
    payload         TEXT NOT NULL,   -- JSON
    last_error      TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
);

-- Human review queue and decisions (spec sections 14 and 17).
CREATE TABLE IF NOT EXISTS reviews (
    id            TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'OPEN',
    decision      TEXT,
    reason        TEXT,
    reviewer_id   TEXT,
    created_at    TEXT NOT NULL,
    decided_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
