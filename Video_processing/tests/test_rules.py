"""Spec section 11.2: the hard-rule ladder, order, and the safety invariant.

test_safety_cannot_be_overridden_by_high_average is the single most important
test in this build: spec section 11.2 states plainly that "a high tool score
must never override a severe safety failure," and this is where that promise
either holds or breaks.
"""

from __future__ import annotations

from sevenkaam.evidence import Evidence
from sevenkaam.reason_codes import Decision, ReasonCode
from sevenkaam.rules import evaluate
from sevenkaam.schemas import (
    Detection,
    IdentityEvidence,
    TaskEvidence,
    TokenEvidence,
    VideoProbe,
)
from sevenkaam.scoring import initial_score
from sevenkaam.trade_config import get_trade

GOOD_VIDEO = VideoProbe(
    duration_seconds=15, blur_score=0.9, scene_changes=0,
    duplicate_frame_ratio=0.01, person_visible_ratio=0.95,
)


def _full_evidence(trade_id: str = "electrician", **overrides) -> Evidence:
    trade = get_trade(trade_id)
    detections = tuple(Detection(label=t.id, confidence=0.95) for t in trade.required_tools)
    defaults = dict(
        trade=trade,
        detections=detections,
        token=TokenEvidence(expected="KC-1", observed="KC-1", readable=True),
        video=GOOD_VIDEO,
        task=TaskEvidence(
            step_ids=["a", "b", "c"],
            step_completion=[1, 1, 1],
            quality_score=1.0,
            safety_score=1.0,
        ),
        identity=IdentityEvidence(declared_valid=True),
        workspace_tags_observed=trade.workspace_tags,
        knowledge=1.0,
    )
    defaults.update(overrides)
    return Evidence(**defaults)


def _run(evidence: Evidence):
    score = initial_score(evidence.components())
    return evaluate(evidence, score), score


def test_safety_cannot_be_overridden_by_high_average():
    """Every OTHER component is perfect; safety alone fails. Must still be
    routed to human review, never averaged into a passing band."""
    evidence = _full_evidence(
        task=TaskEvidence(
            step_ids=["a", "b", "c"], step_completion=[1, 1, 1],
            quality_score=1.0, safety_score=0.39,
        )
    )
    outcome, score = _run(evidence)
    assert score > 0.8, "sanity check: the weighted average alone would pass"
    assert outcome.decision == Decision.HUMAN_REVIEW
    assert ReasonCode.SAFETY_REVIEW_REQUIRED in outcome.reason_codes


def test_identity_failure_beats_everything_else():
    evidence = _full_evidence(identity=IdentityEvidence(declared_valid=False))
    outcome, _ = _run(evidence)
    assert outcome.decision == Decision.NEEDS_RESUBMISSION
    assert ReasonCode.RESUBMIT_IDENTITY in outcome.reason_codes
    assert outcome.triggered_rule == "identity"


def test_identity_checked_before_token():
    """Both identity and token are broken; identity must win (spec order)."""
    evidence = _full_evidence(
        identity=IdentityEvidence(declared_valid=False),
        token=TokenEvidence(expected="KC-1", observed="KC-9", readable=True),
    )
    outcome, _ = _run(evidence)
    assert outcome.triggered_rule == "identity"


def test_token_mismatch_before_safety():
    evidence = _full_evidence(
        token=TokenEvidence(expected="KC-1", observed="KC-9", readable=True),
        task=TaskEvidence(
            step_ids=["a"], step_completion=[1], quality_score=1.0, safety_score=0.1
        ),
    )
    outcome, _ = _run(evidence)
    assert outcome.triggered_rule == "token"


def test_unreadable_token_is_not_a_fraud_accusation():
    """Spec section 12.2: OCR failure -> resubmission path, not automatic fraud."""
    evidence = _full_evidence(token=TokenEvidence(expected="KC-1", observed=None, readable=False))
    outcome, _ = _run(evidence)
    assert ReasonCode.TOKEN_MISMATCH not in outcome.reason_codes
    assert ReasonCode.TOKEN_UNREADABLE in outcome.reason_codes


def test_duplicate_media_forces_human_review():
    evidence = _full_evidence(duplicate_of="sub_existing_001")
    outcome, _ = _run(evidence)
    assert outcome.decision == Decision.HUMAN_REVIEW
    assert ReasonCode.DUPLICATE_MEDIA in outcome.reason_codes


def test_inconsistent_metadata_forces_human_review():
    evidence = _full_evidence(metadata_consistent=False)
    outcome, _ = _run(evidence)
    assert outcome.decision == Decision.HUMAN_REVIEW
    assert ReasonCode.METADATA_INCONSISTENT in outcome.reason_codes


def test_no_person_is_insufficient_evidence_not_a_quality_problem():
    video = GOOD_VIDEO.model_copy(update={"person_visible_ratio": 0.05})
    evidence = _full_evidence(video=video)
    outcome, _ = _run(evidence)
    assert outcome.decision == Decision.INSUFFICIENT_EVIDENCE
    assert ReasonCode.NO_PERSON_DETECTED in outcome.reason_codes


def test_missing_required_tool_is_reviewed_not_auto_failed():
    """Spec section 10.2: missing tool -> reduced score AND review, not a hard fail."""
    trade = get_trade("electrician")
    detections = tuple(
        Detection(label=t.id, confidence=0.95) for t in trade.required_tools[:-1]
    )
    evidence = _full_evidence(detections=detections)
    outcome, _ = _run(evidence)
    assert outcome.decision == Decision.HUMAN_REVIEW
    assert ReasonCode.MISSING_REQUIRED_TOOL in outcome.reason_codes


def test_low_knowledge_does_not_automatically_fail():
    """Spec section 10.2: good video, low quiz -> mixed confidence, not a fail."""
    evidence = _full_evidence(knowledge=0.1)
    outcome, _ = _run(evidence)
    assert outcome.decision in (Decision.PROVISIONALLY_VERIFIED, Decision.STRONGLY_VERIFIED)
    assert ReasonCode.LOW_KNOWLEDGE_SCORE in outcome.reason_codes


def test_strongly_verified_requires_high_score_and_high_coverage():
    evidence = _full_evidence()
    outcome, score = _run(evidence)
    assert score >= 0.8
    assert evidence.evidence_coverage() >= 0.9
    assert outcome.decision == Decision.STRONGLY_VERIFIED


def test_low_coverage_routes_to_insufficient_evidence_before_scoring_matters():
    trade = get_trade("welder")  # empty rubric -> low coverage by construction
    evidence = Evidence(
        trade=trade,
        token=TokenEvidence(expected="KC-1", observed="KC-1", readable=True),
        video=GOOD_VIDEO,
        task=TaskEvidence(step_ids=["a"], step_completion=[1], quality_score=1.0, safety_score=1.0),
        identity=IdentityEvidence(declared_valid=True),
        knowledge=1.0,
    )
    outcome, _ = _run(evidence)
    assert outcome.decision == Decision.INSUFFICIENT_EVIDENCE
    assert ReasonCode.LOW_EVIDENCE_COVERAGE in outcome.reason_codes


def test_all_emitted_codes_are_sorted_and_deduplicated():
    evidence = _full_evidence(duplicate_of="x")
    outcome, _ = _run(evidence)
    assert outcome.reason_codes == sorted(set(outcome.reason_codes), key=lambda c: c.value)
