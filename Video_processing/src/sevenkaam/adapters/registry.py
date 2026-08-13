"""Adapter selection.

The single place that maps a mode string to an implementation. Real adapters are
imported lazily inside the factory so `ultralytics`/`mediapipe` are never
imported (or required) unless someone explicitly selects `real`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sevenkaam.adapters import heuristic, mock
from sevenkaam.config import Settings
from sevenkaam.errors import ConfigError
from sevenkaam.schemas import FixtureCase

_VALID_MODES = {"mock", "heuristic", "real"}


@dataclass(frozen=True)
class AdapterBundle:
    detector: Any
    pose: Any
    ocr: Any
    probe: Any

    def modes(self) -> dict[str, str]:
        return {
            "detector": self.detector.mode,
            "pose": self.pose.mode,
            "ocr": self.ocr.mode,
            "probe": self.probe.mode,
        }


def _check(mode: str, name: str) -> None:
    if mode not in _VALID_MODES:
        raise ConfigError(
            f"unknown adapter mode '{mode}' for {name}; expected one of {sorted(_VALID_MODES)}"
        )


def build(settings: Settings, fixture: FixtureCase | None = None) -> AdapterBundle:
    """Construct the adapter set for this run.

    `mock` requires a fixture — that is what makes it deterministic. Selecting
    mock without one is a configuration error, not a silent fallback, because a
    silent fallback would quietly change which evidence a decision was based on.
    """
    for mode, name in (
        (settings.adapter_detector, "detector"),
        (settings.adapter_pose, "pose"),
        (settings.adapter_ocr, "ocr"),
    ):
        _check(mode, name)

    needs_fixture = "mock" in {
        settings.adapter_detector,
        settings.adapter_pose,
        settings.adapter_ocr,
    }
    if needs_fixture and fixture is None:
        raise ConfigError(
            "adapter mode 'mock' requires a fixture bound to the submission "
            "(set SEVENKAAM_ADAPTER_*=heuristic to assess real media)"
        )

    def detector() -> Any:
        if settings.adapter_detector == "mock":
            return mock.MockDetector(fixture)  # type: ignore[arg-type]
        if settings.adapter_detector == "heuristic":
            return heuristic.HeuristicDetector()
        from sevenkaam.adapters.real_stubs import YoloDetector

        return YoloDetector()

    def pose() -> Any:
        if settings.adapter_pose == "mock":
            return mock.MockPoseExtractor(fixture)  # type: ignore[arg-type]
        if settings.adapter_pose == "heuristic":
            return heuristic.HeuristicPoseExtractor()
        from sevenkaam.adapters.real_stubs import MediaPipePoseExtractor

        return MediaPipePoseExtractor()

    def ocr() -> Any:
        if settings.adapter_ocr == "mock":
            return mock.MockOCRProvider(fixture)  # type: ignore[arg-type]
        if settings.adapter_ocr == "heuristic":
            return heuristic.HeuristicOCRProvider()
        from sevenkaam.adapters.real_stubs import TesseractOCRProvider

        return TesseractOCRProvider()

    def probe() -> Any:
        # The probe follows the pose adapter's mode: both read the same media,
        # and mixing a mock probe with a heuristic pose would produce a video
        # description that never existed.
        if settings.adapter_pose == "mock":
            return mock.MockMediaProbe(fixture)  # type: ignore[arg-type]
        return heuristic.HeuristicMediaProbe()

    return AdapterBundle(detector=detector(), pose=pose(), ocr=ocr(), probe=probe())
