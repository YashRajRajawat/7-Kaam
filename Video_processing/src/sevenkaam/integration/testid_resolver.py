"""TradeTest.id resolution — no invention, read-only.

VideoAssessment.testId is NOT NULL and FKs to TradeTest. The Python
`challenge_id` (e.g. "safe_wire_connection_v1") is not a TradeTest row and never
will be without a schema change this build does not make. The Flutter app's
video cards use client-side fabricated ids (v-plumb-01, v-carp-01, ...) that do
not exist in TradeTest either — following them would violate the FK.

Four-step ladder, all read-only:
  1. caller-supplied, validated
  2. config-pinned (configs/trades.json db_test_id)
  3. discovery — accepted ONLY if exactly one row matches
  4. fail cleanly

Guessing at step 3 would attach an assessment to the wrong TradeTest and corrupt
the platform's worker-best-score computation (backend/src/controllers/
testController.js), so ambiguity is refused rather than resolved by a heuristic.
"""

from __future__ import annotations

from sevenkaam.errors import TestIdUnresolvable
from sevenkaam.integration.postgrest import PostgrestClient
from sevenkaam.reason_codes import ReasonCode
from sevenkaam.trade_config import TradeConfig


def resolve(
    db: PostgrestClient,
    trade: TradeConfig,
    worker_trade_enum: str | None,
    explicit_test_id: str | None,
) -> str:
    """Return a validated TradeTest.id, or raise TestIdUnresolvable."""
    target_trade = worker_trade_enum or trade.db_enum
    if target_trade is None:
        raise TestIdUnresolvable(
            f"{ReasonCode.TRADE_NOT_SUPPORTED_BY_DB.value}: "
            f"'{trade.trade_id}' has no Trade enum value on this platform"
        )

    # 1. Explicit, validated.
    if explicit_test_id:
        row = _validated(db, explicit_test_id, target_trade)
        if row is not None:
            return row["id"]
        raise TestIdUnresolvable(
            f"supplied test_id {explicit_test_id!r} is not a valid, active, "
            f"isVideoAssessment TradeTest for trade {target_trade!r}"
        )

    # 2. Config-pinned.
    if trade.db_test_id:
        row = _validated(db, trade.db_test_id, target_trade)
        if row is not None:
            return row["id"]
        # A stale config pin is a configuration problem, not silently ignorable —
        # but it should not block discovery, so fall through rather than raise.

    # 3. Discovery — exactly one match only.
    candidates = db.select(
        "TradeTest",
        {
            "trade": f"eq.{target_trade}",
            "isVideoAssessment": "is.true",
            "isActive": "is.true",
            "select": "id,title,createdAt",
            "order": "createdAt.asc",
            "limit": "2",
        },
    )
    if len(candidates) == 1:
        return candidates[0]["id"]
    if len(candidates) > 1:
        raise TestIdUnresolvable(
            f"{ReasonCode.AMBIGUOUS_VIDEO_TRADETEST.value}: {len(candidates)} active video "
            f"TradeTest rows exist for {target_trade!r}; supply test_id explicitly"
        )

    # 4. Nothing to file against.
    raise TestIdUnresolvable(
        f"{ReasonCode.NO_VIDEO_TRADETEST_FOR_TRADE.value}: no active isVideoAssessment "
        f"TradeTest exists for {target_trade!r}. This must be created by hand — "
        "this module does not create TradeTest rows."
    )


def _validated(db: PostgrestClient, test_id: str, target_trade: str) -> dict | None:
    rows = db.select(
        "TradeTest",
        {
            "id": f"eq.{test_id}",
            "select": "id,trade,isVideoAssessment,isActive",
        },
    )
    if not rows:
        return None
    row = rows[0]
    if row.get("trade") != target_trade:
        return None
    if not row.get("isVideoAssessment"):
        return None
    if not row.get("isActive", True):
        return None
    return row
