"""Hard safety rules and band assignment — spec sections 11.2 and 11.4.

This is the safety-critical module. Two properties matter more than anything
else here and are asserted directly in tests:

1. The ladder is ORDERED and first-match-wins for the decision. Spec section
   11.2 gives the order identity -> token -> safety -> task; additional checks
   are interleaved at documented positions.
2. A severe safety failure CANNOT be averaged away by strong evidence
   elsewhere. Spec section 11.2: "A high tool score must never override a severe
   safety failure." The ladder runs before any band assignment, so the weighted
   score is never consulted for these cases.

Reason codes are collected from every applicable check, not just the one that
decided the outcome, so a reviewer sees the whole picture (spec section 14).
"""

from __future__ import annotations

from dataclasses import dataclass

from sevenkaam.config import thresholds
from sevenkaam.evidence import Evidence
from sevenkaam.reason_codes import Decision, ReasonCode, sort_codes


@dataclass(frozen=True)
class RuleOutcome:
    decision: Decision
    reason_codes: list[ReasonCode]
    triggered_rule: str | None


def _advisory_codes(evidence: Evidence, score: float) -> list[ReasonCode]:
    """Codes that describe the submission but never decide it on their own."""
    codes: list[ReasonCode] = []
    cfg = thresholds()
    filled = evidence.filled_slots()
    components = evidence.components()

    # Strengths
    if evidence.trade.required_tools and not evidence.missing_required_tools():
        codes.append(ReasonCode.ALL_REQUIRED_TOOLS_VISIBLE)
    if filled["task"] and not evidence.incomplete_steps():
        codes.append(ReasonCode.TASK_STEPS_COMPLETED)
    if filled["safety"] and components.safety >= cfg["hard_rules"]["safety_review_below"]:
        codes.append(ReasonCode.SAFETY_STEPS_OBSERVED)
    if evidence.video is not None and components.media >= cfg["media_quality"]["min_acceptable_quality"]:
        codes.append(ReasonCode.MEDIA_QUALITY_GOOD)
    if evidence.token_state() is True:
        codes.append(ReasonCode.IDENTITY_TOKEN_VERIFIED)

    # Notes
    if evidence.knowledge is not None:
        if evidence.knowledge < cfg["knowledge"]["low_knowledge_below"]:
            # Spec section 10.2: "Good video with low quiz score -> mixed
            # confidence; do not automatically fail." This is a note only.
            codes.append(ReasonCode.LOW_KNOWLEDGE_SCORE)
        else:
            codes.append(ReasonCode.KNOWLEDGE_CHECK_STRONG)
    if evidence.missing_required_tools():
        codes.append(ReasonCode.MISSING_REQUIRED_TOOL)
    if evidence.token_state() is None and evidence.token.attempted:
        codes.append(ReasonCode.TOKEN_UNREADABLE)
    if evidence.video is not None and evidence.video.scene_changes > cfg["media_quality"]["max_scene_changes"]:
        codes.append(ReasonCode.SCENE_DISCONTINUITY)
    if evidence.video is not None and evidence.video.duration_seconds < cfg["media_quality"]["min_duration_seconds"]:
        codes.append(ReasonCode.VIDEO_TOO_SHORT)
    if not evidence.trade.expert_reviewed:
        codes.append(ReasonCode.LIMIT_CONFIG_NOT_EXPERT_REVIEWED)
    if not evidence.trade.supported_by_db:
        codes.append(ReasonCode.TRADE_NOT_SUPPORTED_BY_DB)
    return codes


def evaluate(evidence: Evidence, score: float) -> RuleOutcome:
    """Run the ladder, then assign a band.

    `score` is the spec section 11.1 weighted score. It is used ONLY for band
    assignment at the end — never to soften a hard rule.
    """
    cfg = thresholds()
    hard = cfg["hard_rules"]
    media_cfg = cfg["media_quality"]
    bands = cfg["bands"]

    components = evidence.components()
    coverage = evidence.evidence_coverage()
    filled = evidence.filled_slots()
    codes = _advisory_codes(evidence, score)

    def outcome(decision: Decision, rule: str, *extra: ReasonCode) -> RuleOutcome:
        return RuleOutcome(decision, sort_codes([*codes, *extra]), rule)

    # 1. Identity (spec section 11.2, first branch).
    if not evidence.identity_passed():
        return outcome(Decision.NEEDS_RESUBMISSION, "identity", ReasonCode.RESUBMIT_IDENTITY)

    # 2. Authentic capture. Only an actual MISMATCH fails here. An unreadable
    #    token is handled further down as a quality problem, because spec
    #    section 12.2 requires OCR failure to lead to resubmission rather than
    #    an automatic fraud accusation.
    if evidence.token_state() is False:
        return outcome(Decision.NEEDS_RESUBMISSION, "token", ReasonCode.TOKEN_MISMATCH)

    # 3. Safety. Checked only when the trade actually has an authored safety
    #    rubric — you cannot fail a check that was never defined. A trade with
    #    no rubric falls through to the coverage gate instead.
    if filled["safety"] and components.safety < hard["safety_review_below"]:
        return outcome(Decision.HUMAN_REVIEW, "safety", ReasonCode.SAFETY_REVIEW_REQUIRED)

    # 4. Media authenticity signals -> mandatory human review (spec section 14).
    if evidence.is_duplicate():
        return outcome(Decision.HUMAN_REVIEW, "duplicate", ReasonCode.DUPLICATE_MEDIA)
    if not evidence.metadata_consistent:
        return outcome(Decision.HUMAN_REVIEW, "metadata", ReasonCode.METADATA_INCONSISTENT)

    # 5. Nobody in frame: there is no practical evidence at all, which is a
    #    different thing from evidence that looks bad.
    if evidence.video is not None and evidence.video.person_visible_ratio < media_cfg["no_person_below"]:
        return outcome(Decision.INSUFFICIENT_EVIDENCE, "no_person", ReasonCode.NO_PERSON_DETECTED)

    # 6. Coverage gate (spec section 11.3). A high score over thin evidence is
    #    exactly the misleading number the spec warns about.
    if coverage < bands["min_coverage_for_any_verdict"]:
        return outcome(Decision.INSUFFICIENT_EVIDENCE, "coverage", ReasonCode.LOW_EVIDENCE_COVERAGE)

    # 7. Unusable recording -> resubmit.
    if evidence.video is not None and components.media < media_cfg["min_acceptable_quality"]:
        return outcome(Decision.NEEDS_RESUBMISSION, "media_quality", ReasonCode.LOW_MEDIA_QUALITY)

    # 8. Practical task not passed (spec section 11.2, final branch).
    if filled["task"] and components.task < hard["task_not_passed_below"]:
        return outcome(
            Decision.NEEDS_RESUBMISSION, "task", ReasonCode.PRACTICAL_TASK_NOT_PASSED
        )

    # 9. A missing REQUIRED tool is material but not disqualifying on its own —
    #    spec section 10.2: "Missing required tool -> reduced tool score and
    #    review if critical". A human decides.
    if evidence.missing_required_tools():
        return outcome(Decision.HUMAN_REVIEW, "missing_tool")

    # 10. Bands (spec section 11.4).
    if score >= bands["strongly_verified_min_score"] and coverage >= bands["strongly_verified_min_coverage"]:
        return outcome(Decision.STRONGLY_VERIFIED, None)
    if score >= bands["provisionally_verified_min_score"]:
        return outcome(Decision.PROVISIONALLY_VERIFIED, None)

    # Enough evidence, nothing disqualifying, but not a confident pass.
    return outcome(Decision.HUMAN_REVIEW, "below_band")
