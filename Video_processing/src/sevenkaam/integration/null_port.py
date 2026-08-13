"""Offline integration — the default.

Contacts nothing. Media comes from a local path, and writeback is a no-op that
reports honestly rather than pretending to have filed something.
"""

from __future__ import annotations

from pathlib import Path

from sevenkaam.errors import OfflineViolation
from sevenkaam.integration.port import PreflightReport, WorkerRecord
from sevenkaam.schemas import AssessmentResult, WritebackReceipt


class NullIntegration:
    """Offline IntegrationPort implementation."""

    def __init__(self, media_root: str | Path | None = None) -> None:
        self._media_root = Path(media_root) if media_root else None

    def preflight(self) -> PreflightReport:
        return PreflightReport(
            mode="offline",
            tables={},
            video_tests_by_trade={},
            backend_reachable=None,
            notes=["offline mode: no platform contact attempted"],
        )

    def fetch_worker(self, worker_id: str) -> WorkerRecord | None:
        # Offline, the caller supplies the trade; there is no worker record to
        # read and inventing one would let a live-only code path pass tests.
        return WorkerRecord(id=worker_id)

    def fetch_media(self, worker: WorkerRecord) -> str | None:
        if not worker.video_url:
            return None
        candidate = Path(worker.video_url)
        if not candidate.is_absolute() and self._media_root:
            candidate = self._media_root / candidate
        if candidate.exists():
            return str(candidate)
        if str(worker.video_url).startswith(("http://", "https://")):
            raise OfflineViolation(
                f"refusing to download {worker.video_url!r} in offline mode "
                "(set SEVENKAAM_MODE=live to enable network access)"
            )
        return None

    def resolve_test_id(self, worker: WorkerRecord, trade_id: str, explicit: str | None) -> str:
        return explicit or f"offline-{trade_id}"

    def write_assessment(self, result: AssessmentResult, worker: WorkerRecord) -> WritebackReceipt:
        return WritebackReceipt(
            status="skipped_offline",
            reason="offline mode — assessment recorded locally only",
        )
