"""configs/trades.json and trade_mapping.json validity."""

from __future__ import annotations

import pytest

from sevenkaam.errors import TradeNotSupported
from sevenkaam.trade_config import all_trade_ids, db_enum_for, get_trade, validate_all


def test_all_configs_load():
    for trade_id in all_trade_ids():
        cfg = get_trade(trade_id)
        assert cfg.trade_id == trade_id


def test_all_eight_trades_present():
    assert set(all_trade_ids()) == {
        "electrician", "plumber", "carpenter", "ac_technician",
        "painter", "welder", "barber", "mechanic",
    }


def test_required_tool_weights_positive():
    for trade_id in all_trade_ids():
        cfg = get_trade(trade_id)
        assert all(t.weight > 0 for t in cfg.required_tools)


def test_mapping_covers_every_trade():
    for trade_id in all_trade_ids():
        # db_enum_for must not raise; None is a valid, explicit answer.
        db_enum_for(trade_id)


def test_barber_and_mechanic_are_unmapped():
    assert db_enum_for("barber") is None
    assert db_enum_for("mechanic") is None
    cfg = get_trade("barber")
    assert cfg.supported_by_db is False


def test_mapped_trades_are_supported():
    for trade_id in ("electrician", "plumber", "carpenter", "ac_technician", "painter", "welder"):
        assert get_trade(trade_id).supported_by_db is True


def test_welder_has_no_invented_rubric():
    cfg = get_trade("welder")
    assert cfg.required_tools == ()
    assert cfg.workspace_tags == ()
    assert cfg.safety_rules == ()


def test_unknown_trade_raises():
    with pytest.raises(TradeNotSupported):
        get_trade("astronaut")


def test_validate_all_does_not_raise_and_returns_warnings():
    warnings = validate_all()
    assert isinstance(warnings, list)
    assert any("barber" in w for w in warnings)
    assert any("welder" in w for w in warnings)
