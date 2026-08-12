"""Deterministic mock adapters — spec section 6, `mock` mode.

Each returns exactly what the bound fixture declares. No randomness, no clock,
no filesystem reads beyond the fixture itself, so the same fixture always
produces the same evidence (spec section 15: "the same input produces the same
result in mock mode").

These are what make the end-to-end product testable before a real dataset
exists, which spec section 5 lists as the whole point of the prototype.
"""

from __future__ import annotations

from sevenkaam.schemas import Detection, FixtureCase, VideoProbe


class MockDetector:
    mode = "mock"

    def __init__(self, fixture: FixtureCase) -> None:
        self._fixture = fixture

    def detect(self, media_path: str | None, trade: str) -> list[Detection]:
        return list(self._fixture.detections)


class MockPoseExtractor:
    mode = "mock"

    def __init__(self, fixture: FixtureCase) -> None:
        self._fixture = fixture

    def extract(self, media_path: str | None) -> dict[str, float]:
        return {"person_visible_ratio": self._fixture.video.person_visible_ratio}


class MockOCRProvider:
    mode = "mock"

    def __init__(self, fixture: FixtureCase) -> None:
        self._fixture = fixture

    def read_text(self, media_path: str | None) -> str | None:
        token = self._fixture.token
        if not token.readable:
            return None
        return token.observed


class MockMediaProbe:
    mode = "mock"

    def __init__(self, fixture: FixtureCase) -> None:
        self._fixture = fixture

    def probe(self, media_path: str | None) -> VideoProbe:
        return self._fixture.video
