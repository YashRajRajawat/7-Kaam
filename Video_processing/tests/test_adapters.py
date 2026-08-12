"""Adapter contract: mocks are pure functions of fixture content; heuristics
assert relative orderings (never absolute thresholds, so an OpenCV version
bump doesn't break CI); real adapters raise with actionable install text and
are never imported at package import time.
"""

from __future__ import annotations

import sys

import pytest

from sevenkaam.adapters import mock
from sevenkaam.adapters.registry import build
from sevenkaam.config import Settings
from sevenkaam.errors import AdapterUnavailable, ConfigError


def test_mock_detector_returns_exactly_the_fixture_detections(load_fixture):
    fixture = load_fixture("electrician_pass_001")
    detector = mock.MockDetector(fixture)
    assert detector.detect(None, "electrician") == list(fixture.detections)


def test_mock_ocr_returns_none_when_fixture_token_unreadable(load_fixture):
    fixture = load_fixture("electrician_pass_001").model_copy(
        update={"token": load_fixture("electrician_pass_001").token.model_copy(update={"readable": False})}
    )
    provider = mock.MockOCRProvider(fixture)
    assert provider.read_text(None) is None


def test_registry_requires_fixture_for_mock_mode():
    settings = Settings(adapter_detector="mock")
    with pytest.raises(ConfigError):
        build(settings, fixture=None)


def test_registry_builds_heuristic_bundle_without_a_fixture():
    settings = Settings(adapter_detector="heuristic", adapter_pose="heuristic", adapter_ocr="heuristic")
    bundle = build(settings, fixture=None)
    assert bundle.modes() == {"detector": "heuristic", "pose": "heuristic", "ocr": "heuristic", "probe": "heuristic"}


def test_registry_rejects_unknown_mode():
    settings = Settings()
    # pydantic-settings does not re-validate plain attribute assignment, so this
    # exercises the registry's OWN defence-in-depth check, not pydantic's.
    settings.adapter_detector = "quantum"
    with pytest.raises(ConfigError):
        build(settings, fixture=None)


def test_real_adapters_raise_actionable_errors():
    settings = Settings(adapter_detector="real", adapter_pose="mock", adapter_ocr="mock")
    with pytest.raises(AdapterUnavailable, match="pip install ultralytics"):
        build(settings, fixture=_dummy_fixture())


def test_real_adapters_are_not_imported_at_registry_import_time():
    """ultralytics/mediapipe must never become de facto install requirements."""
    for forbidden in ("ultralytics", "mediapipe", "pytesseract", "easyocr"):
        assert forbidden not in sys.modules, f"{forbidden} was imported without being selected"


def test_heuristic_detector_reports_nothing_rather_than_guessing():
    """No honest way to identify a tool with colour/edge heuristics — returning
    a low-confidence guess would feed fabricated evidence into tool_score()."""
    from sevenkaam.adapters.heuristic import HeuristicDetector

    assert HeuristicDetector().detect("nonexistent.mp4", "electrician") == []


def test_heuristic_ocr_never_fabricates_a_token():
    from sevenkaam.adapters.heuristic import HeuristicOCRProvider

    assert HeuristicOCRProvider().read_text("nonexistent.mp4") is None


def test_heuristic_media_probe_handles_missing_file_gracefully():
    from sevenkaam.adapters.heuristic import HeuristicMediaProbe

    probe = HeuristicMediaProbe().probe("this/path/does/not/exist.mp4")
    assert probe.duration_seconds == 0.0
    assert probe.frame_count == 0


def _dummy_fixture():
    from sevenkaam.schemas import FixtureCase, VideoProbe

    return FixtureCase(
        case_id="dummy",
        trade_id="electrician",
        video=VideoProbe(duration_seconds=1, blur_score=1, scene_changes=0, duplicate_frame_ratio=0, person_visible_ratio=1),
    )
