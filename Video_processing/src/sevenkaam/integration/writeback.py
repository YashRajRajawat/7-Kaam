"""Writeback policy — the safety-critical module.

Everything that could change a worker's standing on the platform passes through
here, and nothing else in the package may call the database or the backend
directly.

THE CENTRAL INVARIANT
---------------------
    VideoAssessment.score is non-NULL  if and only if  a ScoringLog VIDEO row
    was written for that assessment.

Why it matters: backend/src/controllers/scoringController.js derives
Worker.videoScore as the rolling average of every ScoringLog row with
signalType='VIDEO', then recomputes finalScore, tier, KaamCard.version and
appends KaamCardHistory. There is NO delete route for ScoringLog anywhere in the
platform. A single low row is therefore a permanent, unappealable demotion.

Existing code already handles the NULL case correctly — testController.js filters
`v.score != null` when computing a worker's best score — so withholding the
number loses nothing while keeping the irreversible lever untouched.

Policies:
  never         (DEFAULT) no ScoringLog row, ever. score stays NULL.
  verified_only only provisionally/strongly_verified may promote.
  all           every outcome promotes. Implemented so the dangerous path is
                testable; config.validate_policy() refuses it in live mode
                without an explicit second acknowledgement.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Protocol

from sevenkaam.config import Settings
from sevenkaam.errors import SchemaDriftError
from sevenkaam.integration import mapping
from sevenkaam.integration.port import WorkerRecord
from sevenkaam.reason_codes import VERIFIED_DECISIONS, Decision
from sevenkaam.schemas import AssessmentResult, WritebackReceipt
from sevenkaam.store import LocalStore

log = logging.getLogger(__name__)

TABLE_VIDEO_ASSESSMENT = "VideoAssessment"


class DbClient(Protocol):
    """Minimal PostgREST surface. Tests substitute a recording fake."""

    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]: ...

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]: ...

    def table_available(self, table: str) -> bool: ...


class NodeClient(Protocol):
    """The single authenticated backend call this module may make."""

    def score_video(self, worker_id: str, score: float, notes: str) -> dict[str, Any]: ...


class WritebackEngine:
    def __init__(
        self,
        settings: Settings,
        db: DbClient | None = None,
        node: NodeClient | None = None,
        store: LocalStore | None = None,
    ) -> None:
        self.settings = settings
        self.db = db
        self.node = node
        self.store = store

    # ── policy ───────────────────────────────────────────────────────────────

    def may_promote(self, decision: Decision) -> bool:
        """Whether this outcome is allowed to move the worker's score.

        Two independent gates must both be open: the policy must permit the
        band, AND node writes must be enabled. Either one closed means the
        score column stays NULL.
        """
        policy = self.settings.writeback_policy
        if policy == "never":
            return False
        if not self.settings.allow_node_writes:
            return False
        if policy == "verified_only":
            return decision in VERIFIED_DECISIONS
        return policy == "all"

    # ── execution ────────────────────────────────────────────────────────────

    def execute(
        self, result: AssessmentResult, worker: WorkerRecord, test_id: str
    ) -> WritebackReceipt:
        if self.db is None:
            return WritebackReceipt(status="skipped", reason="no database client configured")

        if not self.db.table_available(TABLE_VIDEO_ASSESSMENT):
            # Schema drift must not block the deliverable. The assessment is
            # already recorded locally; report honestly and move on.
            log.warning(
                "SCHEMA_DRIFT_TABLE_MISSING: %s is not available on this database; "
                "assessment kept local only",
                TABLE_VIDEO_ASSESSMENT,
            )
            return WritebackReceipt(
                status="degraded",
                reason=f"{TABLE_VIDEO_ASSESSMENT} table unavailable (schema drift)",
                test_id=test_id,
            )

        existing = self._find_existing(result, worker, test_id)
        if existing is not None:
            return WritebackReceipt(
                status="duplicate",
                reason="an assessment with this idempotency key already exists",
                video_assessment_id=existing.get("id"),
                test_id=test_id,
            )

        promote = self.may_promote(result.decision)
        row_id = str(uuid.uuid4())
        video_url = worker.video_url or ""
        note = mapping.note_tag(result, row_id) if promote else None

        row = mapping.video_assessment_row(
            row_id=row_id,
            worker_id=worker.id,
            test_id=test_id,
            video_url=video_url,
            # NULL unless we are actually going to write the ScoringLog row.
            # This is the invariant in code.
            score=result.score_100 if promote else None,
            result=result,
            attempt_number=self._next_attempt(worker.id, test_id),
            scoring_log_written=promote,
            note=note,
        )

        try:
            self.db.insert(TABLE_VIDEO_ASSESSMENT, row)
        except SchemaDriftError:
            # Deliberately fatal, unlike the Node wrapper which silently drops
            # unknown columns and retries. A partial audit row misrepresents
            # what the engine concluded, which is worse than no row.
            raise

        if self.store is not None:
            self.store.mark_video_assessment(result.idempotency_key, row_id)

        if not promote:
            return WritebackReceipt(
                status="written",
                reason=self._withheld_reason(result.decision),
                video_assessment_id=row_id,
                scoring_log_written=False,
                score_sent=None,
                test_id=test_id,
            )

        return self._promote(result, worker, row_id, test_id, note or "")

    def _promote(
        self,
        result: AssessmentResult,
        worker: WorkerRecord,
        row_id: str,
        test_id: str,
        note: str,
    ) -> WritebackReceipt:
        """Call score-video. Only reachable when both gates are open."""
        if self.node is None:
            return WritebackReceipt(
                status="written",
                reason="policy allowed promotion but no backend client is configured",
                video_assessment_id=row_id,
                scoring_log_written=False,
                test_id=test_id,
            )

        self.node.score_video(worker.id, result.score_100, note)
        if self.store is not None:
            self.store.mark_scoring_log(result.idempotency_key, note)

        log.info(
            "promoted worker=%s score=%.1f decision=%s — this moved videoScore, "
            "finalScore, tier and KaamCard version",
            worker.id,
            result.score_100,
            result.decision.value,
        )
        return WritebackReceipt(
            status="written",
            video_assessment_id=row_id,
            scoring_log_written=True,
            score_sent=result.score_100,
            test_id=test_id,
        )

    def _withheld_reason(self, decision: Decision) -> str:
        if self.settings.writeback_policy == "never":
            return (
                "policy=never: assessment filed without a score so the worker's "
                "tier and KaamCard are untouched"
            )
        if not self.settings.allow_node_writes:
            return "node writes disabled (SEVENKAAM_ALLOW_NODE_WRITES=false)"
        return f"policy={self.settings.writeback_policy} does not promote '{decision.value}'"

    # ── helpers ──────────────────────────────────────────────────────────────

    def _find_existing(
        self, result: AssessmentResult, worker: WorkerRecord, test_id: str
    ) -> dict[str, Any] | None:
        """Remote reconciliation, so losing the local SQLite file is survivable.

        Matching happens client-side on the fetched rows rather than through a
        PostgREST JSONB filter: the workerId+testId equality prefilter keeps the
        result set tiny, and this avoids depending on JSONB filter syntax
        behaviour or requiring an index.
        """
        assert self.db is not None
        rows = self.db.select(
            TABLE_VIDEO_ASSESSMENT,
            {
                "workerId": f"eq.{worker.id}",
                "testId": f"eq.{test_id}",
                "select": "id,score,rubricScores",
            },
        )
        for row in rows:
            rubric = row.get("rubricScores") or {}
            ai = rubric.get("ai") if isinstance(rubric, dict) else None
            if isinstance(ai, dict) and ai.get("idempotencyKey") == result.idempotency_key:
                return row
        return None

    def _next_attempt(self, worker_id: str, test_id: str) -> int:
        assert self.db is not None
        rows = self.db.select(
            TABLE_VIDEO_ASSESSMENT,
            {"workerId": f"eq.{worker_id}", "testId": f"eq.{test_id}", "select": "id"},
        )
        return len(rows) + 1
