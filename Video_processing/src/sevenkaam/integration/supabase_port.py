"""Live IntegrationPort, composed from the pieces in this package.

Constructed only when SEVENKAAM_MODE=live. Everything here can fail (network,
missing tables, missing TradeTest rows) and is expected to degrade rather than
crash — the deterministic assessment is the deliverable; the write is a bonus
that must not block it.
"""

from __future__ import annotations

import datetime as dt
import logging
from pathlib import Path

from sevenkaam.config import Settings
from sevenkaam.errors import ConfigError, SevenKaamError, TestIdUnresolvable
from sevenkaam.integration import storage, testid_resolver
from sevenkaam.integration.jwt_mint import BackendClient
from sevenkaam.integration.port import PreflightReport, WorkerRecord
from sevenkaam.integration.postgrest import PostgrestClient
from sevenkaam.integration.writeback import WritebackEngine
from sevenkaam.schemas import AssessmentResult, WritebackReceipt
from sevenkaam.store import LocalStore
from sevenkaam.trade_config import get_trade

log = logging.getLogger(__name__)

_PREFLIGHT_TABLES = ("Worker", "TradeTest", "VideoAssessment", "ScoringLog")
_KNOWN_TRADES = ("ELECTRICIAN", "PLUMBER", "CARPENTER", "AC_TECHNICIAN", "PAINTER", "WELDER")


class SupabaseIntegration:
    def __init__(self, settings: Settings, store: LocalStore | None = None) -> None:
        settings.validate_policy()
        url, key = settings.require_live_credentials()
        self._settings = settings
        self._db = PostgrestClient(url, key)
        self._store = store
        self._node: BackendClient | None = None
        if settings.allow_node_writes:
            secret = settings.jwt_secret
            if not secret:
                raise ConfigError("JWT_SECRET is required when SEVENKAAM_ALLOW_NODE_WRITES=true")
            self._node = BackendClient(settings.backend_base_url, secret, settings.service_admin_id or "")
        self._writeback = WritebackEngine(settings, db=self._db, node=self._node, store=store)

    def close(self) -> None:
        self._db.close()
        if self._node is not None:
            self._node.close()

    # ── IntegrationPort ──────────────────────────────────────────────────────

    def preflight(self) -> PreflightReport:
        tables = {t: self._db.table_available(t) for t in _PREFLIGHT_TABLES}
        video_tests: dict[str, list[str]] = {}
        notes: list[str] = []

        if tables.get("TradeTest"):
            for trade in _KNOWN_TRADES:
                try:
                    rows = self._db.select(
                        "TradeTest",
                        {
                            "trade": f"eq.{trade}",
                            "isVideoAssessment": "is.true",
                            "isActive": "is.true",
                            "select": "id",
                        },
                    )
                except SevenKaamError as exc:
                    # A column the Prisma model declares (e.g. isVideoAssessment)
                    # can still be absent from the live table — schema drift, not
                    # a crash. Preflight's whole point is surfacing this rather
                    # than assuming the model file matches the live database.
                    video_tests[trade] = []
                    notes.append(f"{trade}: could not probe TradeTest ({exc})")
                    continue
                video_tests[trade] = [r["id"] for r in rows]
                if not rows:
                    notes.append(f"{trade}: no active isVideoAssessment TradeTest row — writeback impossible")

        if not tables.get("VideoAssessment"):
            notes.append(
                "VideoAssessment table not found — the consolidated migration "
                "(backend/run_migration_2.js) may not have applied. Writeback will degrade to local-only."
            )

        backend_reachable = self._node.health() if self._node is not None else None

        return PreflightReport(
            mode="live",
            tables=tables,
            video_tests_by_trade=video_tests,
            backend_reachable=backend_reachable,
            notes=notes,
        )

    def fetch_worker(self, worker_id: str) -> WorkerRecord | None:
        rows = self._db.select(
            "Worker",
            {"id": f"eq.{worker_id}", "select": "id,trade,videoUrl,fullName"},
        )
        if not rows:
            return None
        row = rows[0]
        return WorkerRecord(
            id=row["id"],
            trade_db_enum=row.get("trade"),
            video_url=row.get("videoUrl"),
            full_name=row.get("fullName"),
        )

    def fetch_media(self, worker: WorkerRecord) -> str | None:
        if not worker.video_url:
            return None
        max_bytes = self._settings.max_video_bytes
        path = storage.download_to_temp(worker.video_url, max_bytes)
        return str(path)

    def resolve_test_id(self, worker: WorkerRecord, trade_id: str, explicit: str | None) -> str:
        trade = get_trade(trade_id)
        try:
            return testid_resolver.resolve(self._db, trade, worker.trade_db_enum, explicit)
        except TestIdUnresolvable:
            raise
        except SevenKaamError:
            raise

    def write_assessment(self, result: AssessmentResult, worker: WorkerRecord) -> WritebackReceipt:
        try:
            test_id = self.resolve_test_id(worker, result.trade_id, result.requested_test_id)
        except TestIdUnresolvable as exc:
            return WritebackReceipt(status="skipped", reason=str(exc))
        return self._writeback.execute(result, worker, test_id)
