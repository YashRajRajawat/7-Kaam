"""testid_resolver.py: the four-step ladder, all read-only, no invention.

Ambiguity must refuse rather than guess — guessing would attach an assessment
to the wrong TradeTest and corrupt the platform's worker-best-score computation.
"""

from __future__ import annotations

from typing import Any

import pytest

from sevenkaam.errors import TestIdUnresolvable
from sevenkaam.integration import testid_resolver
from sevenkaam.trade_config import get_trade


class FakeDb:
    def __init__(self, rows: dict[str, list[dict[str, Any]]]):
        self._rows = rows

    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        assert table == "TradeTest"
        if "id" in params:
            test_id = params["id"].removeprefix("eq.")
            return [r for r in self._rows.get("by_id", []) if r["id"] == test_id]
        return self._rows.get("discovery", [])


def test_explicit_test_id_validated_and_accepted():
    db = FakeDb({"by_id": [{"id": "t1", "trade": "ELECTRICIAN", "isVideoAssessment": True, "isActive": True}]})
    trade = get_trade("electrician")
    result = testid_resolver.resolve(db, trade, "ELECTRICIAN", "t1")
    assert result == "t1"


def test_explicit_test_id_wrong_trade_rejected():
    db = FakeDb({"by_id": [{"id": "t1", "trade": "PLUMBER", "isVideoAssessment": True, "isActive": True}]})
    trade = get_trade("electrician")
    with pytest.raises(TestIdUnresolvable):
        testid_resolver.resolve(db, trade, "ELECTRICIAN", "t1")


def test_explicit_test_id_not_video_assessment_rejected():
    db = FakeDb({"by_id": [{"id": "t1", "trade": "ELECTRICIAN", "isVideoAssessment": False, "isActive": True}]})
    trade = get_trade("electrician")
    with pytest.raises(TestIdUnresolvable):
        testid_resolver.resolve(db, trade, "ELECTRICIAN", "t1")


def test_config_pinned_test_id_used_when_no_explicit(monkeypatch):
    db = FakeDb({"by_id": [{"id": "test-elec-video-001", "trade": "ELECTRICIAN", "isVideoAssessment": True, "isActive": True}]})
    trade = get_trade("electrician")
    assert trade.db_test_id == "test-elec-video-001"
    result = testid_resolver.resolve(db, trade, "ELECTRICIAN", None)
    assert result == "test-elec-video-001"


def test_discovery_accepts_exactly_one_match():
    db = FakeDb({"by_id": [], "discovery": [{"id": "t-only", "title": "x", "createdAt": "2026-01-01"}]})
    trade = get_trade("carpenter")  # no db_test_id configured
    result = testid_resolver.resolve(db, trade, "CARPENTER", None)
    assert result == "t-only"


def test_discovery_refuses_ambiguous_matches():
    db = FakeDb({
        "by_id": [],
        "discovery": [
            {"id": "t-1", "title": "a", "createdAt": "2026-01-01"},
            {"id": "t-2", "title": "b", "createdAt": "2026-01-02"},
        ],
    })
    trade = get_trade("carpenter")
    with pytest.raises(TestIdUnresolvable, match="AMBIGUOUS"):
        testid_resolver.resolve(db, trade, "CARPENTER", None)


def test_no_candidates_fails_cleanly_not_by_inventing_one():
    db = FakeDb({"by_id": [], "discovery": []})
    trade = get_trade("carpenter")
    with pytest.raises(TestIdUnresolvable, match="NO_VIDEO_TRADETEST_FOR_TRADE"):
        testid_resolver.resolve(db, trade, "CARPENTER", None)


def test_trade_with_no_db_enum_fails_before_any_query():
    db = FakeDb({})
    trade = get_trade("barber")
    with pytest.raises(TestIdUnresolvable, match="TRADE_NOT_SUPPORTED_BY_DB"):
        testid_resolver.resolve(db, trade, None, None)


def test_stale_config_pin_falls_through_to_discovery():
    """db_test_id points at something that no longer validates; discovery must
    still be attempted rather than failing outright on a stale pin."""
    db = FakeDb({
        "by_id": [],  # the pinned id validates to nothing (deleted/deactivated)
        "discovery": [{"id": "fresh-id", "title": "x", "createdAt": "2026-01-01"}],
    })
    trade = get_trade("electrician")  # has a db_test_id configured
    result = testid_resolver.resolve(db, trade, "ELECTRICIAN", None)
    assert result == "fresh-id"
