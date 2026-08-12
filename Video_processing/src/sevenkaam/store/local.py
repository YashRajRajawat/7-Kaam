"""SQLite store — stdlib sqlite3, no ORM.

An ORM here would mean declaring model classes, and model classes for the
platform's tables would be a second source of truth competing with
backend/prisma/schema.prisma. These tables are this module's own, so they stay
deliberately plain.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from sevenkaam.schemas import AssessmentResult

_MIGRATIONS = Path(__file__).resolve().parent / "migrations.sql"


class LocalStore:
    """Thin wrapper. Every write runs inside an explicit transaction."""

    def __init__(self, path: str | Path = ":memory:") -> None:
        self.path = str(path)
        self._conn = sqlite3.connect(self.path)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._migrate()

    def _migrate(self) -> None:
        self._conn.executescript(_MIGRATIONS.read_text(encoding="utf-8"))
        self._conn.commit()

    @contextmanager
    def _tx(self) -> Iterator[sqlite3.Connection]:
        try:
            yield self._conn
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise

    def close(self) -> None:
        self._conn.close()

    def __enter__(self) -> LocalStore:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # ── assessments ──────────────────────────────────────────────────────────

    def record_assessment(self, result: AssessmentResult) -> str:
        assessment_id = str(uuid.uuid4())
        with self._tx() as conn:
            conn.execute(
                """
                INSERT INTO assessments (
                    id, submission_id, worker_id, trade_id, challenge_id, decision,
                    score, score_100, evidence_coverage, reason_codes, components,
                    report, versions, adapter_modes, idempotency_key,
                    media_sha256, media_phash, assessed_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    assessment_id,
                    result.submission_id,
                    result.worker_id,
                    result.trade_id,
                    result.challenge_id,
                    result.decision.value,
                    result.score,
                    result.score_100,
                    result.evidence_coverage,
                    json.dumps([c.value for c in result.reason_codes]),
                    json.dumps(result.components.model_dump()),
                    json.dumps(result.report.model_dump()),
                    json.dumps(result.versions),
                    json.dumps(result.adapter_modes),
                    result.idempotency_key,
                    result.media.sha256,
                    result.media.phash,
                    result.assessed_at,
                ),
            )
        return assessment_id

    def assessments_for_worker(self, worker_id: str) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT * FROM assessments WHERE worker_id = ? ORDER BY assessed_at DESC",
            (worker_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    # ── idempotency ──────────────────────────────────────────────────────────

    def claim(self, key: str, submission_id: str, now: str) -> bool:
        """Try to claim this key. True if newly claimed, False if already done.

        INSERT OR IGNORE makes the claim atomic, so a re-run cannot double-write
        a ScoringLog row and skew the worker's rolling average.
        """
        with self._tx() as conn:
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO assessment_idempotency
                    (idempotency_key, submission_id, created_at)
                VALUES (?,?,?)
                """,
                (key, submission_id, now),
            )
        return cursor.rowcount > 0

    def get_claim(self, key: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            "SELECT * FROM assessment_idempotency WHERE idempotency_key = ?", (key,)
        ).fetchone()
        return dict(row) if row else None

    def mark_video_assessment(self, key: str, video_assessment_id: str) -> None:
        with self._tx() as conn:
            conn.execute(
                "UPDATE assessment_idempotency SET video_assessment_id = ? WHERE idempotency_key = ?",
                (video_assessment_id, key),
            )

    def mark_scoring_log(self, key: str, note_tag: str) -> None:
        with self._tx() as conn:
            conn.execute(
                """
                UPDATE assessment_idempotency
                   SET scoring_log_written = 1, note_tag = ?
                 WHERE idempotency_key = ?
                """,
                (note_tag, key),
            )

    # ── media history ────────────────────────────────────────────────────────

    def remember_media(
        self,
        worker_id: str,
        sha256: str | None,
        phash: str | None,
        now: str,
        video_assessment_id: str | None = None,
    ) -> None:
        with self._tx() as conn:
            conn.execute(
                """
                INSERT INTO media_hash (worker_id, sha256, phash, seen_at, video_assessment_id)
                VALUES (?,?,?,?,?)
                """,
                (worker_id, sha256, phash, now, video_assessment_id),
            )

    def media_history(self, worker_id: str) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT sha256, phash, seen_at FROM media_hash WHERE worker_id = ? ORDER BY seen_at",
            (worker_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    # ── pending writebacks ───────────────────────────────────────────────────

    def queue_writeback(self, key: str, payload: dict[str, Any], now: str, error: str) -> None:
        with self._tx() as conn:
            conn.execute(
                """
                INSERT INTO pending_writeback (idempotency_key, payload, last_error, created_at)
                VALUES (?,?,?,?)
                """,
                (key, json.dumps(payload), error, now),
            )

    def pending_writebacks(self) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT * FROM pending_writeback ORDER BY created_at"
        ).fetchall()
        return [dict(row) for row in rows]

    def drop_writeback(self, row_id: int) -> None:
        with self._tx() as conn:
            conn.execute("DELETE FROM pending_writeback WHERE id = ?", (row_id,))

    # ── reviews (spec sections 14 and 17) ────────────────────────────────────

    def open_review(self, assessment_id: str, now: str) -> str:
        review_id = f"rev_{uuid.uuid4().hex[:12]}"
        with self._tx() as conn:
            conn.execute(
                "INSERT INTO reviews (id, assessment_id, status, created_at) VALUES (?,?,?,?)",
                (review_id, assessment_id, "OPEN", now),
            )
        return review_id

    # NOTE: reviews.decision and assessments.decision are different things —
    # the review's own decision (open reviews are always NULL) vs. the AI
    # decision that put the item in the queue. Both are aliased explicitly:
    # sqlite3.Row resolves a duplicate column name to whichever occurrence
    # came first in the SELECT list, so an unaliased `r.*, a.decision` would
    # silently return the review's (always-NULL) decision under the key a
    # caller expects to hold the assessment's decision.

    def review_queue(self) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            """
            SELECT r.id, r.assessment_id, r.status AS review_status,
                   r.decision AS review_decision, r.reason AS review_reason,
                   r.reviewer_id, r.created_at, r.decided_at,
                   a.worker_id, a.trade_id, a.decision AS assessment_decision,
                   a.score_100, a.evidence_coverage, a.reason_codes, a.submission_id
              FROM reviews r
              JOIN assessments a ON a.id = r.assessment_id
             WHERE r.status = 'OPEN'
             ORDER BY r.created_at
            """
        ).fetchall()
        return [dict(row) for row in rows]

    def get_review(self, review_id: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            """
            SELECT r.id, r.assessment_id, r.status AS review_status,
                   r.decision AS review_decision, r.reviewer_id,
                   r.created_at, r.decided_at,
                   a.worker_id, a.trade_id, a.decision AS assessment_decision,
                   a.score_100, a.idempotency_key, a.submission_id
              FROM reviews r
              JOIN assessments a ON a.id = r.assessment_id
             WHERE r.id = ?
            """,
            (review_id,),
        ).fetchone()
        return dict(row) if row else None

    def decide_review(
        self, review_id: str, decision: str, reason: str, reviewer_id: str, now: str
    ) -> None:
        with self._tx() as conn:
            conn.execute(
                """
                UPDATE reviews
                   SET status = 'CLOSED', decision = ?, reason = ?, reviewer_id = ?, decided_at = ?
                 WHERE id = ?
                """,
                (decision, reason, reviewer_id, now, review_id),
            )
