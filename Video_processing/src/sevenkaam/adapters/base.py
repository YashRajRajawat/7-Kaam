"""Adapter interfaces — spec section 6.

Spec section 6: "Every model must sit behind an adapter so the prototype can run
with real models or deterministic mocks... The scoring and report layers must
not know which mode produced the evidence."

Three modes per adapter:
  mock      - returns labels from fixture files; used in unit tests
  heuristic - simple image/video rules; used in demos
  real      - calls the selected computer-vision model (NOT IMPLEMENTED here)
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from sevenkaam.schemas import Detection, VideoProbe


@runtime_checkable
class Detector(Protocol):
    """Object detection over a still frame or video."""

    mode: str

    def detect(self, media_path: str | None, trade: str) -> list[Detection]: ...


@runtime_checkable
class PoseExtractor(Protocol):
    """Body-landmark extraction, reduced to the features the engine consumes.

    The prototype needs only aggregate signals (is a person present, and for how
    much of the recording), so the interface returns a VideoProbe-compatible
    fragment rather than per-frame landmarks. Spec section 9.3 stores full
    landmarks; that is a later phase, once a real extractor exists.
    """

    mode: str

    def extract(self, media_path: str | None) -> dict[str, float]: ...


@runtime_checkable
class OCRProvider(Protocol):
    """Challenge-token reading."""

    mode: str

    def read_text(self, media_path: str | None) -> str | None: ...


@runtime_checkable
class MediaProbe(Protocol):
    """Media quality measurement feeding spec section 12.3."""

    mode: str

    def probe(self, media_path: str | None) -> VideoProbe: ...
