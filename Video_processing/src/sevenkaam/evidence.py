"""Evidence assembly and coverage — spec section 11.3.

Spec section 11.3: "A score without evidence coverage is misleading."

Coverage is counted over fixed slots rather than over whatever happened to
arrive, so a submission cannot score well simply by supplying less. A trade with
no authored rubric (welder) therefore lands at low coverage automatically, with
no special-casing anywhere in the rules.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sevenkaam import scoring
from sevenkaam.config import thresholds
from sevenkaam.schemas import (
    ComponentScores,
    Detection,
    IdentityEvidence,
    MediaIdentity,
    TaskEvidence,
    TokenEvidence,
    VideoProbe,
)
from sevenkaam.trade_config import TradeConfig

#: The evidence a complete submission is expected to carry. Every slot is
#: required for every trade; a trade that cannot fill one (because its rubric
#: was never authored) is genuinely short of evidence, and the coverage maths
#: should say so rather than hide it.
EVIDENCE_SLOTS: tuple[str, ...] = (
    "identity",
    "media",
    "token",
    "tools",
    "task",
    "safety",
    "workspace",
    "knowledge",
)


@dataclass(frozen=True)
class Evidence:
    """Everything the engine knows about one submission."""

    trade: TradeConfig
    detections: tuple[Detection, ...] = ()
    token: TokenEvidence = field(default_factory=TokenEvidence)
    video: VideoProbe | None = None
    task: TaskEvidence = field(default_factory=TaskEvidence)
    identity: IdentityEvidence = field(default_factory=IdentityEvidence)
    workspace_tags_observed: tuple[str, ...] = ()
    knowledge: float | None = None
    media: MediaIdentity = field(default_factory=MediaIdentity)
    metadata_consistent: bool = True
    duplicate_of: str | None = None

    # ── slot filling ─────────────────────────────────────────────────────────

    def filled_slots(self) -> dict[str, bool]:
        """Which evidence slots actually carry usable evidence."""
        trade = self.trade
        detected = {d.label for d in self.detections}

        return {
            "identity": (
                self.identity.declared_valid is not None
                or self.identity.document_present
                or self.identity.face_match is not None
                or self.identity.liveness is not None
            ),
            "media": self.video is not None and self.video.duration_seconds > 0,
            # Unreadable counts as attempted-but-unfilled: we know a token was
            # required and we could not confirm it.
            "token": self.token.attempted and self.token.readable and self.token.observed is not None,
            "tools": bool(trade.required_tools) and bool(detected & set(trade.required_tool_ids)),
            "task": bool(self.task.step_completion),
            "safety": bool(trade.safety_rules),
            "workspace": bool(trade.workspace_tags) and bool(set(self.workspace_tags_observed) & set(trade.workspace_tags)),
            "knowledge": self.knowledge is not None,
        }

    def evidence_coverage(self) -> float:
        """completed_required_evidence / total_required_evidence."""
        filled = self.filled_slots()
        return scoring._round(sum(1 for slot in EVIDENCE_SLOTS if filled[slot]) / len(EVIDENCE_SLOTS))

    def missing_evidence(self) -> list[str]:
        filled = self.filled_slots()
        return [slot for slot in EVIDENCE_SLOTS if not filled[slot]]

    # ── component scores ─────────────────────────────────────────────────────

    def components(self) -> ComponentScores:
        """All seven spec section 11.1 components."""
        video = self.video
        return ComponentScores(
            identity=scoring.identity_score(self.identity),
            media=scoring.media_quality(video) if video is not None else 0.0,
            workspace=scoring.workspace_score(self.trade, self.workspace_tags_observed),
            tools=scoring.tool_score(self.trade, self.detections),
            task=scoring.task_score(
                self.task.step_completion, self.task.quality_score, self.task.safety_score
            ),
            # Safety is scored separately from the task it appears in, so a
            # strong task cannot dilute a safety failure before the hard rules
            # in rules.py ever see it (spec section 11.2).
            safety=self.task.safety_score,
            knowledge=scoring.knowledge_score(self.knowledge),
        )

    # ── derived flags used by the rule ladder ────────────────────────────────

    def identity_passed(self) -> bool:
        limit = thresholds()["hard_rules"]["identity_pass_min"]
        return scoring.identity_score(self.identity) >= limit

    def token_state(self) -> bool | None:
        """True matched / False mismatched / None not attempted or unreadable."""
        return scoring.token_verified(self.token)

    def is_duplicate(self) -> bool:
        return self.duplicate_of is not None

    def missing_required_tools(self) -> list[str]:
        return scoring.missing_required_tools(self.trade, self.detections)

    def incomplete_steps(self) -> list[str]:
        return scoring.incomplete_steps(self.task)
