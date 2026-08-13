"""Evidence scoring — spec sections 11.1 and 12.

Pure functions only: no I/O, no clock, no randomness, no adapter awareness. This
is what makes the determinism guarantee in spec section 15 testable, and it is
why the scoring layer cannot tell whether evidence came from a mock, a heuristic
or a real model (spec section 6).

Every component returns 0..1. None of them is a probability — spec section 7 is
explicit that a score may not be called one until calibration has been measured
on held-out data.
"""

from __future__ import annotations

import functools
import re
from collections.abc import Iterable, Sequence

from sevenkaam.config import thresholds
from sevenkaam.errors import ConfigError
from sevenkaam.schemas import (
    ComponentScores,
    Detection,
    IdentityEvidence,
    TaskEvidence,
    TokenEvidence,
    VideoProbe,
)
from sevenkaam.trade_config import TradeConfig

#: Components are rounded to this many places before comparison or serialisation
#: so golden fixtures do not drift across platforms on float noise.
PRECISION = 6


def _round(value: float) -> float:
    return round(min(1.0, max(0.0, value)), PRECISION)


@functools.lru_cache(maxsize=1)
def _weights() -> dict[str, float]:
    raw = thresholds()["score_weights"]
    weights = {k: float(v) for k, v in raw.items() if not k.startswith("_")}
    total = sum(weights.values())
    if abs(total - 1.0) > 1e-9:
        raise ConfigError(
            f"score_weights must sum to 1.0, got {total:.6f}. "
            "A partial weighting silently rescales every score."
        )
    return weights


# ── Spec section 12.1: tool coverage ──────────────────────────────────────────


def tool_score(trade: TradeConfig, detections: Iterable[Detection]) -> float:
    """Weighted coverage of the trade's required tools.

    Measures visual evidence that tools were present, nothing more. Spec section
    12.1: "This measures visual evidence of tools, not ownership or skill."
    """
    best: dict[str, float] = {}
    for detection in detections:
        best[detection.label] = max(best.get(detection.label, 0.0), detection.confidence)

    total_weight = sum(t.weight for t in trade.required_tools)
    if total_weight <= 0:
        # No required tools configured (e.g. welder, which has no expert-authored
        # rubric). Zero rather than a free 1.0: absence of a rubric is absence of
        # evidence, and evidence_coverage will route this to insufficient_evidence.
        return 0.0

    earned = sum(t.weight * best.get(t.id, 0.0) for t in trade.required_tools)
    return _round(earned / total_weight)


def missing_required_tools(trade: TradeConfig, detections: Iterable[Detection]) -> list[str]:
    """Required tool ids with no detection at all. Sorted for determinism."""
    seen = {d.label for d in detections}
    return sorted(t.id for t in trade.required_tools if t.id not in seen)


# ── Spec section 12.2: token verification ─────────────────────────────────────

_TOKEN_STRIP = re.compile(r"[^A-Z0-9-]")


def normalize_token(value: str) -> str:
    return _TOKEN_STRIP.sub("", value.upper())


def token_match(expected: str, observed: str) -> bool:
    return normalize_token(expected) == normalize_token(observed)


def token_verified(token: TokenEvidence) -> bool | None:
    """True/False when a token was attempted and read; None when unreadable.

    The None case matters: spec section 12.2 says OCR failure should produce a
    resubmission path, "not an automatic fraud accusation".
    """
    if not token.attempted:
        return None
    if not token.readable or token.observed is None:
        return None
    return token_match(token.expected or "", token.observed)


# ── Spec section 12.3: media quality ──────────────────────────────────────────


def media_quality(video: VideoProbe) -> float:
    """Prototype quality gate.

    Spec section 12.3: "Do not market these heuristics as robust deepfake
    detection. They are prototype quality gates."
    """
    cfg = thresholds()["media_quality"]
    score = 0.0
    if video.duration_seconds >= cfg["min_duration_seconds"]:
        score += cfg["duration_award"]
    if video.blur_score >= cfg["min_blur_score"]:
        score += cfg["blur_award"]
    if video.person_visible_ratio >= cfg["min_person_visible_ratio"]:
        score += cfg["person_award"]
    if video.duplicate_frame_ratio <= cfg["max_duplicate_frame_ratio"]:
        score += cfg["duplicate_award"]
    if video.scene_changes <= cfg["max_scene_changes"]:
        score += cfg["scene_award"]
    return _round(score)


# ── Spec section 12.4: task steps ─────────────────────────────────────────────


def task_score(step_completion: Sequence[int], quality_score: float, safety_score: float) -> float:
    cfg = thresholds()["task_score"]
    if not step_completion:
        # No rubric steps means no practical evidence, not a free pass.
        completion = 0.0
    else:
        completion = sum(step_completion) / len(step_completion)
    return _round(
        cfg["completion_weight"] * completion
        + cfg["quality_weight"] * quality_score
        + cfg["safety_weight"] * safety_score
    )


def incomplete_steps(task: TaskEvidence) -> list[str]:
    """Ids of steps not evidenced. Falls back to positional labels."""
    if not task.step_completion:
        return []
    ids = task.step_ids or [f"step_{i + 1}" for i in range(len(task.step_completion))]
    return [ids[i] for i, done in enumerate(task.step_completion) if not done]


# ── Remaining components ──────────────────────────────────────────────────────


def identity_score(identity: IdentityEvidence) -> float:
    """Weak-by-design identity signal.

    Spec section 4.2: identity verification shows the person is probably the
    account holder; it does not prove competence. Spec section 5 lists facial
    recognition as the sole identity mechanism as a non-goal, so a document
    plus any corroborating signal is enough to pass the gate.
    """
    if identity.declared_valid is not None:
        return 1.0 if identity.declared_valid else 0.0

    signals: list[float] = []
    if identity.document_present:
        signals.append(1.0)
    if identity.face_match is not None:
        signals.append(identity.face_match)
    if identity.liveness is not None:
        signals.append(identity.liveness)
    if not signals:
        return 0.0
    return _round(sum(signals) / len(signals))


def workspace_score(trade: TradeConfig, observed_tags: Iterable[str]) -> float:
    """Scene-context compatibility.

    Spec section 7: "Scene context is supporting evidence only." It carries the
    smallest weight of the practical components for that reason.
    """
    expected = set(trade.workspace_tags)
    if not expected:
        return 0.0
    matched = expected & set(observed_tags)
    return _round(len(matched) / len(expected))


def knowledge_score(raw: float | None) -> float:
    """Validated quiz score, or 0.0 when the check was not taken."""
    return 0.0 if raw is None else _round(raw)


# ── Spec section 11.1: weighted fusion ────────────────────────────────────────


def initial_score(components: ComponentScores) -> float:
    """Transparent weighted model.

    Spec section 11: "Start with a transparent weighted model. Do not begin with
    an opaque neural network." The weights are product hypotheses (spec section
    11.1) and live in configs/thresholds.json for exactly that reason.
    """
    w = _weights()
    return _round(
        w["identity"] * components.identity
        + w["media"] * components.media
        + w["workspace"] * components.workspace
        + w["tool"] * components.tools
        + w["task"] * components.task
        + w["safety"] * components.safety
        + w["knowledge"] * components.knowledge
    )


def to_score_100(score: float) -> float:
    """Map 0..1 to the platform's 0-100 scale.

    One decimal place, matching the backend's Math.round(x*10)/10 convention in
    scoringController.js and scoringEngine.js.
    """
    return round(score * 100, 1)
