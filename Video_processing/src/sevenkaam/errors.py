"""Typed errors.

Kept in one place so callers can distinguish "the engine refused for a good
reason" (which is normal operation and must not crash a batch) from "the
environment is broken" (which must be loud).
"""

from __future__ import annotations


class SevenKaamError(Exception):
    """Base for everything this package raises."""


class ConfigError(SevenKaamError):
    """Malformed or missing configuration."""


class TradeNotSupported(SevenKaamError):
    """Trade has no config, or is not present in the platform's Trade enum.

    Not a crash: offline assessment still runs, only live writeback is refused.
    """


class TradeMismatch(SevenKaamError):
    """Caller-supplied trade disagrees with the worker's trade on record.

    Hard error by design — scoring a plumber against electrician required_tools
    produces a garbage tool_score that would then move their record.
    """


class AdapterUnavailable(SevenKaamError):
    """A real CV adapter was selected but is not installed in this build."""


class OfflineViolation(SevenKaamError):
    """Something tried to reach the network while in offline mode."""


class SchemaDriftError(SevenKaamError):
    """The live database is missing a column the writeback payload needs.

    Deliberately fatal for the write. The Node wrapper (backend/src/utils/
    prisma.js) silently drops unknown columns and retries; for an audit record
    that is worse than not writing at all, because the row then misrepresents
    what the engine concluded.
    """


class TestIdUnresolvable(SevenKaamError):
    """No unambiguous TradeTest row to file this VideoAssessment against."""

    # Not a pytest test case — the name just starts with "Test" because it
    # names the platform's TradeTest.id concept. Silences a collection warning.
    __test__ = False


class WritebackRefused(SevenKaamError):
    """A write was blocked by policy or by a safety gate."""
