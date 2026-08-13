"""The integration boundary.

pipeline.py depends on this protocol and nothing else, so it cannot tell whether
it is running offline against fixtures or live against Supabase. That is what
makes the deterministic tests meaningful: they exercise the same code path
production would.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from sevenkaam.schemas import AssessmentResult, WritebackReceipt


@dataclass(frozen=True)
class WorkerRecord:
    """The subset of the platform's Worker row this module reads."""

    id: str
    trade_db_enum: str | None = None
    video_url: str | None = None
    full_name: str | None = None


@dataclass(frozen=True)
class PreflightReport:
    """What the live environment actually supports right now.

    Necessary because the live database has drifted from the schema files: the
    consolidated migration (backend/run_migration_2.js) documents that it may
    never have applied, since DIRECT_URL's port can be firewalled. Nothing may
    assume VideoAssessment exists.
    """

    mode: str
    tables: dict[str, bool] = field(default_factory=dict)
    video_tests_by_trade: dict[str, list[str]] = field(default_factory=dict)
    backend_reachable: bool | None = None
    notes: list[str] = field(default_factory=list)

    @property
    def can_write_assessments(self) -> bool:
        return self.tables.get("VideoAssessment", False)


@runtime_checkable
class IntegrationPort(Protocol):
    """Everything the pipeline may ask of the outside world."""

    def preflight(self) -> PreflightReport: ...

    def fetch_worker(self, worker_id: str) -> WorkerRecord | None: ...

    def fetch_media(self, worker: WorkerRecord) -> str | None:
        """Return a local filesystem path to the media, or None."""

    def resolve_test_id(self, worker: WorkerRecord, trade_id: str, explicit: str | None) -> str: ...

    def write_assessment(self, result: AssessmentResult, worker: WorkerRecord) -> WritebackReceipt: ...
