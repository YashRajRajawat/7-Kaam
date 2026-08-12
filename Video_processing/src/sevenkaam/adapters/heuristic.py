"""OpenCV heuristic adapters — spec section 6, `heuristic` mode.

Honest scope: these measure properties of a recording. They do not recognise
tools, they do not read text, and they do not identify people. Where a heuristic
cannot answer a question, it returns "unknown" rather than a guess — an
invented answer here would be attributed to a worker as a verification failure.

Spec section 12.3: "Do not market these heuristics as robust deepfake
detection. They are prototype quality gates."
"""

from __future__ import annotations

import math

import cv2
import numpy as np

from sevenkaam.config import thresholds
from sevenkaam.schemas import Detection, VideoProbe

#: Frames sampled evenly across the recording. Enough to characterise quality
#: without decoding everything; bounded so a long video cannot stall a request.
_MAX_SAMPLES = 32


def _sample_frames(path: str, max_samples: int = _MAX_SAMPLES) -> tuple[list[np.ndarray], float, int]:
    """Evenly sample frames. Returns (frames, duration_seconds, frame_count)."""
    capture = cv2.VideoCapture(path)
    if not capture.isOpened():
        return [], 0.0, 0
    try:
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        duration = frame_count / fps if fps > 0 and frame_count > 0 else 0.0

        if frame_count <= 0:
            # Some containers do not report a frame count; fall back to reading
            # sequentially rather than reporting an empty video.
            frames = []
            while len(frames) < max_samples:
                ok, frame = capture.read()
                if not ok:
                    break
                frames.append(frame)
            return frames, duration, len(frames)

        indices = np.linspace(0, max(frame_count - 1, 0), num=min(max_samples, frame_count))
        frames = []
        for index in indices:
            capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
            ok, frame = capture.read()
            if ok:
                frames.append(frame)
        return frames, duration, frame_count
    finally:
        capture.release()


def _blur_score(frames: list[np.ndarray]) -> float:
    """Variance of Laplacian, squashed to 0..1.

    Higher variance means more edge detail, i.e. less blur. The squash constant
    is a prototype calibration, not a measured one.
    """
    if not frames:
        return 0.0
    variances = [
        cv2.Laplacian(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var() for f in frames
    ]
    mean_variance = float(np.mean(variances))
    return float(min(1.0, math.log1p(mean_variance) / math.log1p(500.0)))


def _duplicate_frame_ratio(frames: list[np.ndarray]) -> float:
    """Fraction of consecutive sampled frames that are near-identical."""
    if len(frames) < 2:
        return 0.0
    duplicates = 0
    for previous, current in zip(frames, frames[1:]):
        a = cv2.cvtColor(previous, cv2.COLOR_BGR2GRAY)
        b = cv2.cvtColor(current, cv2.COLOR_BGR2GRAY)
        if a.shape != b.shape:
            continue
        if float(np.mean(cv2.absdiff(a, b))) < 1.0:
            duplicates += 1
    return duplicates / (len(frames) - 1)


def _scene_changes(frames: list[np.ndarray]) -> int:
    """Count abrupt cuts via histogram correlation between sampled frames."""
    if len(frames) < 2:
        return 0
    changes = 0
    for previous, current in zip(frames, frames[1:]):
        hist_a = cv2.calcHist([cv2.cvtColor(previous, cv2.COLOR_BGR2HSV)], [0], None, [50], [0, 180])
        hist_b = cv2.calcHist([cv2.cvtColor(current, cv2.COLOR_BGR2HSV)], [0], None, [50], [0, 180])
        cv2.normalize(hist_a, hist_a)
        cv2.normalize(hist_b, hist_b)
        if cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_CORREL) < 0.5:
            changes += 1
    return changes


class HeuristicMediaProbe:
    mode = "heuristic"

    def probe(self, media_path: str | None) -> VideoProbe:
        if not media_path:
            return VideoProbe(
                duration_seconds=0.0,
                blur_score=0.0,
                scene_changes=0,
                duplicate_frame_ratio=0.0,
                person_visible_ratio=0.0,
            )
        frames, duration, frame_count = _sample_frames(media_path)
        return VideoProbe(
            duration_seconds=duration,
            blur_score=_blur_score(frames),
            scene_changes=_scene_changes(frames),
            duplicate_frame_ratio=_duplicate_frame_ratio(frames),
            # Person detection needs a real model; the pose adapter fills this in.
            person_visible_ratio=0.0,
            frame_count=frame_count,
        )


class HeuristicPoseExtractor:
    """Foreground-motion proxy for "is someone doing something in frame".

    This is NOT pose estimation. It cannot produce landmarks and must never be
    described as measuring technique. It answers one narrow question — does the
    frame contain sustained localised motion — which is the only pose-derived
    input the prototype scoring actually consumes.
    """

    mode = "heuristic"

    def extract(self, media_path: str | None) -> dict[str, float]:
        if not media_path:
            return {"person_visible_ratio": 0.0}
        frames, _, _ = _sample_frames(media_path)
        if len(frames) < 2:
            return {"person_visible_ratio": 0.0}

        active = 0
        for previous, current in zip(frames, frames[1:]):
            a = cv2.cvtColor(previous, cv2.COLOR_BGR2GRAY)
            b = cv2.cvtColor(current, cv2.COLOR_BGR2GRAY)
            if a.shape != b.shape:
                continue
            diff = cv2.absdiff(a, b)
            _, mask = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
            moving_fraction = float(np.count_nonzero(mask)) / mask.size
            # A moving subject occupies a meaningful but not overwhelming part
            # of the frame; near-total change is a cut, not a person.
            if 0.02 <= moving_fraction <= 0.60:
                active += 1
        return {"person_visible_ratio": active / (len(frames) - 1)}


class HeuristicDetector:
    """Deliberately returns nothing.

    There is no honest way to identify a multimeter or a pipe wrench with colour
    and edge heuristics. Returning low-confidence guesses would feed
    tool_score() with fabricated evidence and could promote or demote a worker
    on noise. Absence of evidence is reported as absence of evidence; the
    coverage gate in rules.py then routes the submission to human review.
    """

    mode = "heuristic"

    def detect(self, media_path: str | None, trade: str) -> list[Detection]:
        return []


class HeuristicOCRProvider:
    """Detects whether a high-contrast text region is plausibly present.

    It cannot read characters, so it never returns a token string. Returning
    None means "unreadable", which spec section 12.2 routes to a resubmission
    path rather than a fraud accusation.
    """

    mode = "heuristic"

    def read_text(self, media_path: str | None) -> str | None:
        return None


def token_region_present(media_path: str | None) -> bool:
    """Best-effort check that *something* text-like is on screen.

    Exposed separately from read_text so the pipeline can distinguish "no token
    shown at all" from "token shown but unreadable" without either being
    mistaken for a successful read.
    """
    if not media_path:
        return False
    frames, _, _ = _sample_frames(media_path, max_samples=8)
    min_frames = thresholds()["media_forensics"]["min_frames_sampled"]
    if len(frames) < min(min_frames, 2):
        return False
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        if float(np.count_nonzero(edges)) / edges.size > 0.02:
            return True
    return False
