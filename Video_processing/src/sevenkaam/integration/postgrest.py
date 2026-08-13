"""PostgREST client.

The platform's own backend reaches Postgres this way: backend/src/utils/prisma.js
is not Prisma at all but a hand-rolled wrapper over @supabase/supabase-js REST,
and it documents that raw SQL, $queryRaw and exec_sql are unavailable. So this
module speaks the same protocol rather than opening a direct connection —
DIRECT_URL is also frequently firewalled (see backend/run_migration_2.js).

No ORM, no model classes mirroring the platform schema, no DDL. Three verbs.
The schema's source of truth stays backend/prisma/schema.prisma.
"""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from sevenkaam.errors import ConfigError, SchemaDriftError

log = logging.getLogger(__name__)

#: Frozen PascalCase table names. Never interpolated from user input.
TABLES = frozenset({"Worker", "TradeTest", "VideoAssessment", "ScoringLog"})

_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")

_MISSING_TABLE_CODES = {"PGRST205", "42P01"}
_MISSING_COLUMN_CODES = {"PGRST204"}


def validate_id(value: str) -> str:
    """Shape-check an identifier before it reaches a filter."""
    if not _ID_PATTERN.match(value):
        raise ValueError(f"unsafe identifier: {value!r}")
    return value


class PostgrestClient:
    def __init__(self, base_url: str, service_key: str, timeout: float = 20.0) -> None:
        if not base_url or not service_key:
            raise ConfigError("PostgREST client requires SUPABASE_URL and SUPABASE_SERVICE_KEY")
        self._client = httpx.Client(
            base_url=f"{base_url.rstrip('/')}/rest/v1",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            timeout=httpx.Timeout(timeout, connect=5.0),
        )
        self._availability: dict[str, bool] = {}

    def close(self) -> None:
        self._client.close()

    # ── verbs ────────────────────────────────────────────────────────────────

    def _table(self, table: str) -> str:
        if table not in TABLES:
            raise ValueError(f"unknown table {table!r}; expected one of {sorted(TABLES)}")
        return table

    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        """GET. Retried on transport errors — reads are safe to repeat."""
        response = self._request("GET", self._table(table), params=params, retries=2)
        payload = response.json()
        return payload if isinstance(payload, list) else [payload]

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        """POST. NEVER retried.

        A timed-out POST may or may not have landed. Retrying could double-write,
        and for ScoringLog a double write permanently skews a worker's rolling
        average. Ambiguity goes to reconciliation instead (see writeback.py).
        """
        response = self._request("POST", self._table(table), json=[row], retries=0)
        payload = response.json()
        if isinstance(payload, list) and payload:
            return payload[0]
        return payload if isinstance(payload, dict) else {}

    def patch(self, table: str, params: dict[str, str], changes: dict[str, Any]) -> list[dict[str, Any]]:
        response = self._request("PATCH", self._table(table), params=params, json=changes, retries=0)
        payload = response.json()
        return payload if isinstance(payload, list) else [payload]

    # ── transport ────────────────────────────────────────────────────────────

    def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        json: Any = None,
        retries: int = 0,
    ) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(retries + 1):
            try:
                response = self._client.request(method, f"/{table}", params=params, json=json)
            except httpx.TransportError as exc:
                last_error = exc
                if attempt >= retries:
                    raise
                continue

            if response.is_success:
                return response
            self._raise_for_payload(response, table)
        raise last_error or RuntimeError("unreachable")

    def _raise_for_payload(self, response: httpx.Response, table: str) -> None:
        try:
            body = response.json()
        except ValueError:
            body = {"message": response.text}
        code = str(body.get("code", ""))
        message = str(body.get("message", ""))

        if code in _MISSING_TABLE_CODES or "does not exist" in message.lower():
            raise SchemaDriftError(f"table {table!r} is not available: {message}")

        if code in _MISSING_COLUMN_CODES:
            # Hard fail, deliberately unlike prisma.js which drops the unknown
            # column and retries. Silently dropping a field from an audit record
            # makes the row misrepresent what the engine concluded.
            raise SchemaDriftError(
                f"table {table!r} is missing a column this payload requires: {message}"
            )

        response.raise_for_status()

    # ── preflight ────────────────────────────────────────────────────────────

    def table_available(self, table: str) -> bool:
        """Cheap existence probe, cached per process.

        Necessary because the live database has drifted from the schema files
        and VideoAssessment may simply not be there.
        """
        if table in self._availability:
            return self._availability[table]
        try:
            self._request("GET", self._table(table), params={"select": "id", "limit": "0"}, retries=1)
            available = True
        except SchemaDriftError:
            available = False
        except httpx.HTTPError as exc:  # pragma: no cover - environment dependent
            log.warning("could not probe table %s: %s", table, exc)
            available = False
        self._availability[table] = available
        return available
