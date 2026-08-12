"""Real CV adapters — NOT IMPLEMENTED in this build.

These exist so the interface boundary is real and the wiring is proven, while
the prototype stays installable and deterministic. Spec section 5: the prototype
"must have a deterministic fallback mode so the end-to-end product can be tested
before collecting a large real dataset", and spec section 5 lists "training a
large model before the product workflow is validated" as an explicit non-goal.

Nothing here is imported at package import time — registry.py imports lazily, so
`ultralytics` and `mediapipe` never become install dependencies.

A note that matters before anyone wires YOLO up: a pretrained COCO model cannot
detect a multimeter, wire stripper, or manifold gauge. Those classes do not
exist in COCO. Real tool detection needs a custom-trained model on an annotated
7Kaam dataset, per the Ultralytics custom-training workflow the spec cites in
section 6. Swapping in stock weights would silently return zero detections for
every trade tool and read as "no tools present".
"""

from __future__ import annotations

from sevenkaam.errors import AdapterUnavailable
from sevenkaam.schemas import Detection, VideoProbe

_INSTALL_YOLO = (
    "Real object detection is not implemented.\n"
    "  1. pip install ultralytics\n"
    "  2. Train a custom detector on annotated 7Kaam tool images "
    "(https://docs.ultralytics.com/datasets/detect) — stock COCO weights do NOT "
    "contain trade tool classes.\n"
    "  3. Implement detect() here, mapping model class names to the tool ids in "
    "configs/trades.json.\n"
    "Until then use SEVENKAAM_ADAPTER_DETECTOR=mock or heuristic."
)

_INSTALL_MEDIAPIPE = (
    "Real pose extraction is not implemented.\n"
    "  1. pip install mediapipe\n"
    "  2. Download the Pose Landmarker task file "
    "(https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker)\n"
    "  3. Implement extract() here, returning the spec section 9.3 landmark shape.\n"
    "Until then use SEVENKAAM_ADAPTER_POSE=mock or heuristic."
)

_INSTALL_OCR = (
    "Real OCR is not implemented.\n"
    "  1. pip install pytesseract  (and install the Tesseract binary)  OR  pip install easyocr\n"
    "  2. Implement read_text() here, returning the raw string for "
    "scoring.normalize_token() to clean.\n"
    "Until then use SEVENKAAM_ADAPTER_OCR=mock or heuristic."
)


class YoloDetector:
    mode = "real"

    def __init__(self) -> None:
        raise AdapterUnavailable(_INSTALL_YOLO)

    def detect(self, media_path: str | None, trade: str) -> list[Detection]:  # pragma: no cover
        raise AdapterUnavailable(_INSTALL_YOLO)


class MediaPipePoseExtractor:
    mode = "real"

    def __init__(self) -> None:
        raise AdapterUnavailable(_INSTALL_MEDIAPIPE)

    def extract(self, media_path: str | None) -> dict[str, float]:  # pragma: no cover
        raise AdapterUnavailable(_INSTALL_MEDIAPIPE)


class TesseractOCRProvider:
    mode = "real"

    def __init__(self) -> None:
        raise AdapterUnavailable(_INSTALL_OCR)

    def read_text(self, media_path: str | None) -> str | None:  # pragma: no cover
        raise AdapterUnavailable(_INSTALL_OCR)


class RealMediaProbe:
    """No 'real' tier: the OpenCV probe IS the real implementation."""

    mode = "real"

    def __init__(self) -> None:
        raise AdapterUnavailable(
            "There is no separate 'real' media probe — the OpenCV heuristic probe is "
            "the real implementation. Use SEVENKAAM_ADAPTER_POSE=heuristic."
        )

    def probe(self, media_path: str | None) -> VideoProbe:  # pragma: no cover
        raise AdapterUnavailable("unreachable")
