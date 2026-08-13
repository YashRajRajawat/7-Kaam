"""The frozen reason-code vocabulary.

Reason codes are the interface between the engine and every human-readable
surface. reporting.py may not emit a sentence that does not originate here, and
rules.py may not emit a code that is not defined here — both are asserted in
tests. This is what makes spec section 12.5's "must not invent evidence"
mechanically enforceable rather than a matter of prompt discipline.
"""

from __future__ import annotations

from enum import StrEnum


class Decision(StrEnum):
    """Spec section 11.4 confidence bands.

    Operational labels, deliberately not a raw number pretending to be truth.
    """

    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    NEEDS_RESUBMISSION = "needs_resubmission"
    HUMAN_REVIEW = "human_review"
    PROVISIONALLY_VERIFIED = "provisionally_verified"
    STRONGLY_VERIFIED = "strongly_verified"


#: Bands that represent a passing practical assessment. Only these are ever
#: eligible to promote a score, and only then when policy allows it.
VERIFIED_DECISIONS = frozenset(
    {Decision.PROVISIONALLY_VERIFIED, Decision.STRONGLY_VERIFIED}
)


class ReasonCode(StrEnum):
    """Every code the engine can attach to a decision."""

    # Strengths
    ALL_REQUIRED_TOOLS_VISIBLE = "ALL_REQUIRED_TOOLS_VISIBLE"
    TASK_STEPS_COMPLETED = "TASK_STEPS_COMPLETED"
    SAFETY_STEPS_OBSERVED = "SAFETY_STEPS_OBSERVED"
    MEDIA_QUALITY_GOOD = "MEDIA_QUALITY_GOOD"
    IDENTITY_TOKEN_VERIFIED = "IDENTITY_TOKEN_VERIFIED"
    KNOWLEDGE_CHECK_STRONG = "KNOWLEDGE_CHECK_STRONG"

    # Improvements / failures
    MISSING_REQUIRED_TOOL = "MISSING_REQUIRED_TOOL"
    TOKEN_MISMATCH = "TOKEN_MISMATCH"
    TOKEN_UNREADABLE = "TOKEN_UNREADABLE"
    LOW_MEDIA_QUALITY = "LOW_MEDIA_QUALITY"
    VIDEO_TOO_SHORT = "VIDEO_TOO_SHORT"
    NO_PERSON_DETECTED = "NO_PERSON_DETECTED"
    DUPLICATE_MEDIA = "DUPLICATE_MEDIA"
    SCENE_DISCONTINUITY = "SCENE_DISCONTINUITY"
    METADATA_INCONSISTENT = "METADATA_INCONSISTENT"
    SAFETY_REVIEW_REQUIRED = "SAFETY_REVIEW_REQUIRED"
    PRACTICAL_TASK_NOT_PASSED = "PRACTICAL_TASK_NOT_PASSED"
    LOW_KNOWLEDGE_SCORE = "LOW_KNOWLEDGE_SCORE"
    RESUBMIT_IDENTITY = "RESUBMIT_IDENTITY"
    LOW_EVIDENCE_COVERAGE = "LOW_EVIDENCE_COVERAGE"

    # Limitations (always-on honesty, spec sections 4.2 and 12.5)
    LIMIT_SINGLE_TASK = "LIMIT_SINGLE_TASK"
    LIMIT_NOT_A_LICENCE = "LIMIT_NOT_A_LICENCE"
    LIMIT_TOOLS_ARE_NOT_SKILL = "LIMIT_TOOLS_ARE_NOT_SKILL"
    LIMIT_CONFIG_NOT_EXPERT_REVIEWED = "LIMIT_CONFIG_NOT_EXPERT_REVIEWED"
    LIMIT_HEURISTIC_ADAPTERS = "LIMIT_HEURISTIC_ADAPTERS"
    LIMIT_UNCALIBRATED_SCORE = "LIMIT_UNCALIBRATED_SCORE"

    # Operational (about filing the result, not about the worker)
    TRADE_NOT_SUPPORTED_BY_DB = "TRADE_NOT_SUPPORTED_BY_DB"
    NO_VIDEO_TRADETEST_FOR_TRADE = "NO_VIDEO_TRADETEST_FOR_TRADE"
    AMBIGUOUS_VIDEO_TRADETEST = "AMBIGUOUS_VIDEO_TRADETEST"
    SCHEMA_DRIFT_TABLE_MISSING = "SCHEMA_DRIFT_TABLE_MISSING"
    WRITEBACK_POLICY_WITHHELD_SCORE = "WRITEBACK_POLICY_WITHHELD_SCORE"


#: Limitations attached to every assessment regardless of outcome. Spec section
#: 4.2 ("evidence does not equal truth") and section 22 — the product must never
#: imply the AI has established universal competence.
ALWAYS_ON_LIMITATIONS: tuple[ReasonCode, ...] = (
    ReasonCode.LIMIT_SINGLE_TASK,
    ReasonCode.LIMIT_NOT_A_LICENCE,
    ReasonCode.LIMIT_TOOLS_ARE_NOT_SKILL,
    ReasonCode.LIMIT_UNCALIBRATED_SCORE,
)


def sort_codes(codes: object) -> list[ReasonCode]:
    """Deterministic ordering for any code collection.

    Sorted by name rather than declaration order so results are byte-identical
    across runs and platforms (spec section 15: "the same input produces the
    same result in mock mode").
    """
    return sorted(set(codes), key=lambda c: c.value)  # type: ignore[arg-type]
