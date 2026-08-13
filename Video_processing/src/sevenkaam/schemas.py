"""Pydantic models for spec section 9 records and the assessment result.

`extra="forbid"` everywhere on purpose: a typo'd fixture key must fail loudly
rather than silently score as missing evidence, which would look like a real
verification failure and be attributed to the worker.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from sevenkaam.reason_codes import Decision, ReasonCode

Unit = Annotated[float, Field(ge=0.0, le=1.0)]
"""A 0..1 score. Never call one of these a probability — spec section 7 forbids
it until calibration has been measured on held-out data."""


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


# ── Spec section 9.2: object annotation ───────────────────────────────────────


class Detection(Strict):
    label: str
    confidence: Unit
    bbox: list[float] | None = None
    occluded: bool = False


# ── Media evidence ────────────────────────────────────────────────────────────


class VideoProbe(Strict):
    """Measured media properties feeding spec section 12.3."""

    duration_seconds: float = Field(ge=0.0)
    blur_score: Unit
    scene_changes: int = Field(ge=0)
    duplicate_frame_ratio: Unit
    person_visible_ratio: Unit
    frame_count: int = Field(default=0, ge=0)


class MediaIdentity(Strict):
    """Hashes used for duplicate detection (spec section 13)."""

    sha256: str | None = None
    phash: str | None = None


class TokenEvidence(Strict):
    """Dynamic challenge token, spec section 12.2."""

    expected: str | None = None
    observed: str | None = None
    readable: bool = True

    @property
    def attempted(self) -> bool:
        return self.expected is not None


# ── Spec section 9.4: task annotation ─────────────────────────────────────────


class TaskEvidence(Strict):
    step_ids: list[str] = Field(default_factory=list)
    step_completion: list[Literal[0, 1]] = Field(default_factory=list)
    quality_score: Unit = 0.0
    safety_score: Unit = 0.0

    @model_validator(mode="after")
    def _steps_align(self) -> TaskEvidence:
        if self.step_ids and len(self.step_ids) != len(self.step_completion):
            raise ValueError("step_ids and step_completion must be the same length")
        return self


class IdentityEvidence(Strict):
    """Spec section 4.2: identity evidence suggests the account holder is
    present. It never implies competence."""

    document_present: bool = False
    face_match: Unit | None = None
    liveness: Unit | None = None
    declared_valid: bool | None = None


# ── Spec section 9.1: submission ──────────────────────────────────────────────


class MediaRecord(Strict):
    media_id: str
    type: Literal["video", "image"] = "video"
    path: str | None = None
    duration_seconds: float | None = None
    sha256: str | None = None
    capture_mode: Literal["in_app", "gallery", "unknown"] = "unknown"
    challenge_token: str | None = None


class Submission(Strict):
    submission_id: str
    worker_id: str
    trade_id: str
    challenge_id: str | None = None
    created_at: str | None = None
    media: list[MediaRecord] = Field(default_factory=list)
    declared_tools: list[str] = Field(default_factory=list)
    fixture_id: str | None = None
    test_id: str | None = None


# ── Fixture (spec section 10.3, extended) ─────────────────────────────────────


class FixtureExpectation(Strict):
    """What a test asserts about this case. Not consumed by the engine.

    All fixtures run through NullIntegration in tests, which always reports
    "skipped_offline" regardless of trade support — that branch of logic lives
    in the live SupabaseIntegration/testid_resolver path, exercised separately
    in test_testid_resolver.py, not here.
    """

    decision: Decision
    reason_codes_include: list[ReasonCode] = Field(default_factory=list)
    writeback: Literal["skipped_offline"] = "skipped_offline"


class FixtureCase(Strict):
    case_id: str
    trade_id: str
    detections: list[Detection] = Field(default_factory=list)
    token: TokenEvidence = Field(default_factory=TokenEvidence)
    video: VideoProbe
    task: TaskEvidence = Field(default_factory=TaskEvidence)
    identity: IdentityEvidence = Field(default_factory=IdentityEvidence)
    workspace_tags_observed: list[str] = Field(default_factory=list)
    knowledge_score: Unit | None = None
    media: MediaIdentity = Field(default_factory=MediaIdentity)
    metadata_consistent: bool = True
    duplicate_of: str | None = None
    expected: FixtureExpectation | None = None


# ── Results ───────────────────────────────────────────────────────────────────


class ComponentScores(Strict):
    """All seven spec section 11.1 components.

    Spec section 17's example response shows only five (media, tools, task,
    safety, knowledge) — a superset is emitted so section 17 consumers keep
    working while the section 11.1 weights still sum to 1.0. Note the section 17
    spelling is `tools`, not `tool`.
    """

    identity: Unit
    media: Unit
    workspace: Unit
    tools: Unit
    task: Unit
    safety: Unit
    knowledge: Unit


class AssessmentReport(Strict):
    """Spec section 12.5."""

    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class WritebackReceipt(Strict):
    status: Literal["written", "skipped", "skipped_offline", "degraded", "duplicate"]
    reason: str | None = None
    video_assessment_id: str | None = None
    scoring_log_written: bool = False
    score_sent: float | None = None
    test_id: str | None = None


class AssessmentResult(Strict):
    """The engine's output. Everything a reviewer needs, per spec section 14."""

    submission_id: str
    worker_id: str
    trade_id: str
    challenge_id: str | None = None
    #: Caller-supplied TradeTest.id from the submission, if any. This is
    #: distinct from challenge_id: challenge_id names the Python rubric,
    #: requested_test_id (when present) names the platform catalogue row the
    #: worker actually tapped. See integration/testid_resolver.py.
    requested_test_id: str | None = None

    decision: Decision
    score: Unit
    score_100: float
    evidence_coverage: Unit
    reason_codes: list[ReasonCode]
    components: ComponentScores
    missing_evidence: list[str] = Field(default_factory=list)
    report: AssessmentReport

    versions: dict[str, str]
    adapter_modes: dict[str, str]
    idempotency_key: str
    assessed_at: str
    media: MediaIdentity = Field(default_factory=MediaIdentity)
    writeback: WritebackReceipt | None = None

    def to_api(self) -> dict[str, Any]:
        """Spec section 17 response shape."""
        return {
            "submission_id": self.submission_id,
            "decision": self.decision.value,
            "score": self.score,
            "evidence_coverage": self.evidence_coverage,
            "reason_codes": [c.value for c in self.reason_codes],
            "components": self.components.model_dump(),
            "report": self.report.model_dump(),
            "versions": self.versions,
            "adapter_modes": self.adapter_modes,
            "assessed_at": self.assessed_at,
            "writeback": self.writeback.model_dump() if self.writeback else None,
        }


# ── Review (spec section 17) ──────────────────────────────────────────────────


class ReviewDecisionRequest(Strict):
    decision: Literal["approve", "reject", "request_resubmission", "escalate"]
    reason: str = Field(min_length=1)
    reviewer_id: str = Field(min_length=1)
