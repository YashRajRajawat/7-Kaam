"""Version stamps carried on every decision.

Spec section 17: "Every decision must be versioned with the model version, rule
version, prompt version, and reviewer ID where applicable." These also feed the
idempotency key, so bumping any of them deliberately re-assesses existing
submissions instead of letting results drift silently.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

# Bump when the scoring maths changes.
ENGINE_VERSION = "0.1.0"

# Bump when the hard-rule ladder or band assignment changes.
RULE_VERSION = "0.1.0"

# Bump on any breaking change to the submission/result schemas.
SCHEMA_VERSION = "0.1.0"


def config_hash(payload: Any) -> str:
    """Stable short hash of a config object.

    sort_keys makes this independent of dict ordering, so the same config
    always produces the same hash across processes and platforms — a
    prerequisite for the determinism guarantee in spec section 15.
    """
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def version_block(trade_config_hash: str, thresholds_hash: str) -> dict[str, str]:
    """The version stamp embedded in every result and writeback payload."""
    return {
        "engineVersion": ENGINE_VERSION,
        "ruleVersion": RULE_VERSION,
        "schemaVersion": SCHEMA_VERSION,
        "tradeConfigHash": trade_config_hash,
        "thresholdsHash": thresholds_hash,
    }
