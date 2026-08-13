"""Trade configuration access and the spec/DB trade reconciliation.

Spec section 8: "Use configuration rather than hard-coding every trade in
Python." Nothing in this module knows a trade name; it all comes from
configs/trades.json.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sevenkaam.config import load_config
from sevenkaam.errors import ConfigError, TradeNotSupported


@dataclass(frozen=True)
class RequiredTool:
    id: str
    weight: float
    required: bool = True


@dataclass(frozen=True)
class TradeConfig:
    trade_id: str
    display_name: str
    required_tools: tuple[RequiredTool, ...]
    optional_tools: tuple[str, ...]
    workspace_tags: tuple[str, ...]
    challenge_id: str | None
    knowledge_questions: tuple[str, ...]
    safety_rules: tuple[str, ...]
    expert_reviewed: bool = False
    db_test_id: str | None = None
    db_enum: str | None = field(default=None)

    @property
    def supported_by_db(self) -> bool:
        """False for trades absent from the platform's `Trade` enum.

        Such trades assess normally offline; only live writeback is refused.
        """
        return self.db_enum is not None

    @property
    def required_tool_ids(self) -> tuple[str, ...]:
        return tuple(t.id for t in self.required_tools)


def _parse(trade_id: str, raw: dict[str, Any], db_enum: str | None) -> TradeConfig:
    try:
        tools = tuple(
            RequiredTool(id=t["id"], weight=float(t["weight"]), required=bool(t.get("required", True)))
            for t in raw.get("required_tools", [])
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ConfigError(f"malformed required_tools for trade '{trade_id}': {exc}") from exc

    if any(t.weight <= 0 for t in tools):
        raise ConfigError(f"trade '{trade_id}' has a non-positive required_tool weight")

    return TradeConfig(
        trade_id=trade_id,
        display_name=raw.get("display_name", trade_id.title()),
        required_tools=tools,
        optional_tools=tuple(raw.get("optional_tools", [])),
        workspace_tags=tuple(raw.get("workspace_tags", [])),
        challenge_id=raw.get("challenge_id"),
        knowledge_questions=tuple(raw.get("knowledge_questions", [])),
        safety_rules=tuple(raw.get("safety_rules", [])),
        expert_reviewed=bool(raw.get("expert_reviewed", False)),
        db_test_id=raw.get("db_test_id"),
        db_enum=db_enum,
    )


def _mapping() -> dict[str, str | None]:
    return load_config("trade_mapping")["mapping"]


def all_trade_ids() -> tuple[str, ...]:
    return tuple(sorted(load_config("trades")["trades"].keys()))


def get_trade(trade_id: str) -> TradeConfig:
    """Load one trade's config.

    Raises TradeNotSupported when the trade has no config at all — distinct from
    having a config but no DB enum value, which is a writeback concern only.
    """
    trades = load_config("trades")["trades"]
    key = trade_id.strip().lower()
    if key not in trades:
        raise TradeNotSupported(
            f"no trade config for '{trade_id}'. Known: {', '.join(sorted(trades))}"
        )
    return _parse(key, trades[key], _mapping().get(key))


def db_enum_for(trade_id: str) -> str | None:
    """Postgres `Trade` enum value, or None when the trade is not in the enum."""
    return _mapping().get(trade_id.strip().lower())


def trade_id_for_db_enum(db_enum: str) -> str | None:
    """Reverse lookup. In live mode Worker.trade is the source of truth."""
    target = db_enum.strip().upper()
    for trade_id, mapped in _mapping().items():
        if mapped == target:
            return trade_id
    return None


def validate_all() -> list[str]:
    """Validate every trade config. Returns human-readable warnings.

    Raises on anything structurally broken; warns on things that are merely
    incomplete (unmapped trade, unreviewed rubric), because incompleteness is
    the honest current state rather than an error.
    """
    warnings: list[str] = []
    mapping = _mapping()
    known_enum_values = {v for v in mapping.values() if v is not None}

    for trade_id in all_trade_ids():
        cfg = get_trade(trade_id)
        if trade_id not in mapping:
            raise ConfigError(f"trade '{trade_id}' is missing from trade_mapping.json")
        if cfg.db_enum is not None and cfg.db_enum not in known_enum_values:
            raise ConfigError(f"trade '{trade_id}' maps to unknown enum value {cfg.db_enum}")
        if not cfg.supported_by_db:
            warnings.append(f"{trade_id}: not in the platform Trade enum — offline assessment only")
        if not cfg.required_tools:
            warnings.append(f"{trade_id}: no required tools defined — will report insufficient evidence")
        if not cfg.expert_reviewed:
            warnings.append(f"{trade_id}: rubric not reviewed by a trade expert")
    return warnings
