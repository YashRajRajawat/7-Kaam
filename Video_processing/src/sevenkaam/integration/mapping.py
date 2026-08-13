"""Engine result -> platform row shape.

Pure functions. Kept inside `integration` because every constant here is dictated
by the platform's schema (PascalCase tables, camelCase columns, 0-100 scores)
rather than by the engine, and that coupling should live at the boundary.
"""

from __future__ import annotations

import hashlib
from typing import Any

from sevenkaam.reason_codes import Decision
from sevenkaam.schemas import AssessmentResult

#: VideoAssessment.status is a free-text column with no constraint and no
#: reader in the platform today. Prefixing makes AI-produced rows obvious and
#: greppable next to any future human-produced ones.
STATUS_PREFIX = "AI_"


def status_for(decision: Decision) -> str:
    return f"{STATUS_PREFIX}{decision.value.upper()}"


def idempotency_key(
    worker_id: str,
    test_id: str,
    media_sha256: str | None,
    versions: dict[str, str],
) -> str:
    """Stable identity for one unit of assessment work.

    media_sha256 is the true submission identity. The platform overwrites every
    worker's video at one fixed storage path, so identical bytes at that path
    mean a re-run (do not write again) while different bytes mean a genuine new
    attempt (do write). The path itself can never tell those apart.

    Including the engine/rule/config hashes means a deliberate version bump
    re-assesses, which is wanted, while a plain re-run does not.
    """
    parts = [
        worker_id,
        test_id,
        media_sha256 or "no-media-hash",
        versions.get("engineVersion", ""),
        versions.get("ruleVersion", ""),
        versions.get("tradeConfigHash", ""),
        versions.get("thresholdsHash", ""),
    ]
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def note_tag(result: AssessmentResult, video_assessment_id: str) -> str:
    """ScoringLog.notes payload.

    Load-bearing, not decorative. ScoringLog has no foreign key to
    VideoAssessment, so if a POST times out ambiguously the ONLY way to tell
    whether the row landed is to search recent notes for this assessment id.
    Changing this format breaks crash recovery.
    """
    codes = ",".join(c.value for c in result.reason_codes[:5])
    return (
        f"sevenkaam/{result.versions.get('engineVersion', '?')} "
        f"{result.decision.value} assessment={video_assessment_id} rc={codes}"
    )


def rubric_scores_payload(
    result: AssessmentResult,
    *,
    test_id: str,
    scoring_log_written: bool,
    note: str | None = None,
    review: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """The JSONB written to VideoAssessment.rubricScores.

    Namespaced under `ai` so it can never collide with the key conventions used
    by TradeTest.rubrics, which is a different, human-authored object.

    This is the real payload. Under the default `never` policy the numeric
    `score` column stays NULL, so everything a reviewer or an error analysis
    needs has to be recoverable from here.
    """
    return {
        "ai": {
            **result.versions,
            "challengeId": result.challenge_id,
            "tradeId": result.trade_id,
            "testId": test_id,
            "submissionId": result.submission_id,
            "components": result.components.model_dump(),
            "initialScore": result.score,
            "score100": result.score_100,
            "evidenceCoverage": result.evidence_coverage,
            "decision": result.decision.value,
            "reasonCodes": [c.value for c in result.reason_codes],
            "missingEvidence": result.missing_evidence,
            "adapterModes": result.adapter_modes,
            "idempotencyKey": result.idempotency_key,
            "media": {
                "sha256": result.media.sha256,
                "phash": result.media.phash,
            },
            "report": result.report.model_dump(),
            "assessedAt": result.assessed_at,
            "writeback": {
                "scoringLogWritten": scoring_log_written,
                "scoringLogNoteTag": note,
                "policyNote": (
                    "score column is NULL unless a ScoringLog VIDEO row was written; "
                    "see Video_processing/README.md"
                ),
            },
            **({"review": review} if review else {}),
        }
    }


def feedback_text(result: AssessmentResult, max_chars: int = 2000) -> str:
    """VideoAssessment.feedback — human-readable, from the report only."""
    sections: list[str] = []
    if result.report.strengths:
        sections.append("What went well:\n" + "\n".join(f"- {s}" for s in result.report.strengths))
    if result.report.improvements:
        sections.append(
            "What to improve:\n" + "\n".join(f"- {s}" for s in result.report.improvements)
        )
    if result.report.limitations:
        sections.append(
            "Please note:\n" + "\n".join(f"- {s}" for s in result.report.limitations)
        )
    text = "\n\n".join(sections)
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def video_assessment_row(
    *,
    row_id: str,
    worker_id: str,
    test_id: str,
    video_url: str,
    score: float | None,
    result: AssessmentResult,
    attempt_number: int,
    scoring_log_written: bool,
    note: str | None,
) -> dict[str, Any]:
    """Exact VideoAssessment insert payload.

    Column names are the platform's camelCase literals. `id` is supplied because
    the applied DDL (backend/run_migration_2.js) declares it TEXT PRIMARY KEY
    with no default — the Node side generates UUIDs client-side too.
    """
    return {
        "id": row_id,
        "workerId": worker_id,
        "testId": test_id,
        "videoUrl": video_url,
        "score": score,
        "rubricScores": rubric_scores_payload(
            result, test_id=test_id, scoring_log_written=scoring_log_written, note=note
        ),
        "feedback": feedback_text(result),
        "status": status_for(result.decision),
        "attemptNumber": attempt_number,
        "scoredAt": result.assessed_at,
    }
