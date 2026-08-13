"""Content hashing for duplicate detection — spec section 13.

Two layers, as the spec requires:
  - cryptographic hash for exact duplicates
  - perceptual hash for resized or lightly edited duplicates

This matters more here than it would elsewhere. The platform uploads every
worker video to the SAME storage path (videos/{workerId}/skill_demo.mp4, see
backend/src/controllers/scoringController.js), upserting over the previous
attempt. So the storage path can never identify an attempt — the content hash
is the only stable submission identity, and it is what the idempotency key is
built from.

Spec section 13 is also explicit that no single forensic check reliably proves
media is genuine. These are duplicate-detection signals, not proof of fraud.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

_CHUNK = 1024 * 1024


def sha256_file(path: str | Path) -> str:
    """Streaming SHA-256 so a large video is never held in memory."""
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        while chunk := handle.read(_CHUNK):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def average_hash(frame) -> str:  # type: ignore[no-untyped-def]
    """64-bit perceptual average hash of a single frame.

    cv2/numpy are imported lazily: this module is imported by the idempotency
    path, which must stay usable without OpenCV present.
    """
    import cv2
    import numpy as np

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
    small = cv2.resize(gray, (8, 8), interpolation=cv2.INTER_AREA)
    mean = small.mean()
    bits = (small > mean).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bool(bit))
    return f"{value:016x}"


def hamming(a: str, b: str) -> int:
    """Bit distance between two hex perceptual hashes."""
    if len(a) != len(b):
        raise ValueError("perceptual hashes must be the same length to compare")
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def is_perceptual_duplicate(a: str | None, b: str | None, max_distance: int) -> bool:
    if not a or not b:
        return False
    try:
        return hamming(a, b) <= max_distance
    except ValueError:
        return False
