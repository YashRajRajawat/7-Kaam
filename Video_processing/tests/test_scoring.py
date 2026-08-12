"""Spec sections 12.1-12.4 and 11.1, at boundary values.

Boundary tests matter more than mid-range tests here: the media_quality
booleans in thresholds.json are all "if x >= threshold", so the interesting
bugs live exactly at the threshold value, not away from it.
"""

from __future__ import annotations

import pytest

from sevenkaam.config import load_config
from sevenkaam.schemas import Detection, VideoProbe
from sevenkaam.scoring import (
    _weights,
    media_quality,
    normalize_token,
    task_score,
    to_score_100,
    token_match,
    tool_score,
)
from sevenkaam.trade_config import get_trade


def test_score_weights_sum_to_one():
    assert sum(_weights().values()) == pytest.approx(1.0)


def test_tool_score_all_detected_full_confidence():
    trade = get_trade("electrician")
    detections = [Detection(label=t.id, confidence=1.0) for t in trade.required_tools]
    assert tool_score(trade, detections) == pytest.approx(1.0)


def test_tool_score_none_detected():
    trade = get_trade("electrician")
    assert tool_score(trade, []) == 0.0


def test_tool_score_no_required_tools_is_zero_not_free_pass():
    trade = get_trade("welder")
    assert tool_score(trade, [Detection(label="anything", confidence=1.0)]) == 0.0


def test_tool_score_duplicate_detections_take_max_confidence():
    trade = get_trade("electrician")
    detections = [
        Detection(label="multimeter", confidence=0.2),
        Detection(label="multimeter", confidence=0.9),
    ]
    partial = tool_score(trade, detections)
    assert partial == pytest.approx(0.25 * 0.9 / sum(t.weight for t in trade.required_tools))


@pytest.mark.parametrize(
    ("expected", "observed", "match"),
    [
        ("KC-48391", "KC-48391", True),
        ("kc-48391", "KC-48391", True),
        # Spec section 12.2's normalize_token keeps '-' but strips whitespace —
        # it does NOT treat a space and a dash as equivalent separators, so a
        # space-typed token deliberately does not match a dashed one.
        ("KC 48391", "KC-48391", False),
        ("KC-48391", "KC-48392", False),
        ("KC-48391", "", False),
    ],
)
def test_token_match(expected, observed, match):
    assert token_match(expected, observed) is match


def test_normalize_token_strips_whitespace_and_punctuation_but_keeps_dash():
    assert normalize_token("kc 483-91!!") == "KC483-91"


def _cfg():
    return load_config("thresholds")["media_quality"]


def _full_quality_video() -> VideoProbe:
    cfg = _cfg()
    return VideoProbe(
        duration_seconds=cfg["min_duration_seconds"],
        blur_score=cfg["min_blur_score"],
        scene_changes=cfg["max_scene_changes"],
        duplicate_frame_ratio=cfg["max_duplicate_frame_ratio"],
        person_visible_ratio=cfg["min_person_visible_ratio"],
    )


def test_media_quality_at_every_threshold_boundary_scores_full():
    """Spec section 12.3 uses >= and <= — the boundary value must count."""
    assert media_quality(_full_quality_video()) == pytest.approx(1.0)


def test_media_quality_just_below_each_threshold_loses_that_award():
    cfg = _cfg()
    base = _full_quality_video()

    below_duration = base.model_copy(update={"duration_seconds": cfg["min_duration_seconds"] - 0.01})
    assert media_quality(below_duration) == pytest.approx(1.0 - cfg["duration_award"])

    below_blur = base.model_copy(update={"blur_score": cfg["min_blur_score"] - 0.001})
    assert media_quality(below_blur) == pytest.approx(1.0 - cfg["blur_award"])

    below_person = base.model_copy(update={"person_visible_ratio": cfg["min_person_visible_ratio"] - 0.001})
    assert media_quality(below_person) == pytest.approx(1.0 - cfg["person_award"])

    above_dup = base.model_copy(update={"duplicate_frame_ratio": cfg["max_duplicate_frame_ratio"] + 0.001})
    assert media_quality(above_dup) == pytest.approx(1.0 - cfg["duplicate_award"])

    above_scenes = base.model_copy(update={"scene_changes": cfg["max_scene_changes"] + 1})
    assert media_quality(above_scenes) == pytest.approx(1.0 - cfg["scene_award"])


def test_media_quality_worst_case_is_zero():
    video = VideoProbe(
        duration_seconds=0, blur_score=0, scene_changes=99,
        duplicate_frame_ratio=1.0, person_visible_ratio=0,
    )
    assert media_quality(video) == 0.0


@pytest.mark.parametrize(
    ("completion", "quality", "safety", "expected"),
    [
        ([1, 1, 1, 1, 1], 1.0, 1.0, 1.0),
        ([0, 0, 0, 0, 0], 0.0, 0.0, 0.0),
        ([1, 1, 1, 1, 0], 1.0, 1.0, 0.45 * 0.8 + 0.30 * 1.0 + 0.25 * 1.0),
    ],
)
def test_task_score_formula(completion, quality, safety, expected):
    assert task_score(completion, quality, safety) == pytest.approx(expected, abs=1e-6)


def test_task_score_empty_steps_is_not_a_free_pass():
    assert task_score([], 1.0, 1.0) == pytest.approx(0.30 + 0.25)


def test_to_score_100_matches_backend_rounding_convention():
    assert to_score_100(0.78491234) == 78.5
    assert to_score_100(0.0) == 0.0
    assert to_score_100(1.0) == 100.0
