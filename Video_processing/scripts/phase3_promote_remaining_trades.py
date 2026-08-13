"""Phase 3, round 2 — promote the remaining 4 trades.

Run this yourself, from your own terminal — same reasoning as
phase3_promote_worker_ac_001.py: this writes permanent ScoringLog rows and
moves real worker tiers, so a human confirms it, not an agent.

Covers: electrician, plumber, carpenter, painter — one demo worker each,
using an already offline-verified "pass" fixture (all four independently
confirmed to produce strongly_verified before this script was written).

Welder is deliberately NOT included. It has no expert-authored rubric
(configs/trades.json: required_tools=[], challenge_id=null) and therefore no
positive fixture exists for it — only welder_no_validated_config.json, which
correctly produces insufficient_evidence. Promoting a fake "pass" for welder
would be fabricating evidence; the module refuses to do that by design.

Three of these four workers already have ONE prior ScoringLog VIDEO entry
(worker-ravi-001: 88, worker-sunita-001: 75, worker-mohan-001: 58) — this
write will genuinely blend into the platform's existing rolling average, not
just set a fresh value. worker-painter-001 has no prior entry.

Before running:
  - Start the backend yourself, in a separate terminal:
        cd 7kaam/backend
        node src/server.js
  - Run this from Video_processing/ with its own venv:
        .venv\\Scripts\\python.exe scripts\\phase3_promote_remaining_trades.py

This script does NOT modify Video_processing/.env — live-write settings exist
only inside this process, for this run only.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from sevenkaam.config import get_settings  # noqa: E402
from sevenkaam.integration.jwt_mint import BackendClient  # noqa: E402
from sevenkaam.integration.postgrest import PostgrestClient  # noqa: E402
from sevenkaam.integration.supabase_port import SupabaseIntegration  # noqa: E402
from sevenkaam.pipeline import Pipeline  # noqa: E402
from sevenkaam.schemas import FixtureCase, Submission  # noqa: E402
from sevenkaam.store import LocalStore  # noqa: E402

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "data" / "fixtures"

# (worker_id, trade_id, fixture_name) — all four independently confirmed
# offline to produce strongly_verified before this list was written.
TARGETS = [
    ("worker-ravi-001", "electrician", "electrician_pass_001"),
    ("worker-sunita-001", "plumber", "plumber_pass_001"),
    ("worker-mohan-001", "carpenter", "carpenter_pass_001"),
    ("worker-painter-001", "painter", "painter_pass_001"),
]


def worker_snapshot(db: PostgrestClient, worker_id: str) -> dict:
    rows = db.select(
        "Worker",
        {"id": f"eq.{worker_id}", "select": "id,videoScore,finalScore,tier,kaamCardUrl"},
    )
    return rows[0] if rows else {}


def main() -> int:
    base_settings = get_settings()
    read_only_settings = base_settings.model_copy(update={"mode": "live"})

    print("=" * 70)
    print("PHASE 3, ROUND 2 — PROMOTING 4 REMAINING TRADES")
    print("(welder excluded — no expert-reviewed rubric, no positive fixture)")
    print("=" * 70)

    db = PostgrestClient(*read_only_settings.require_live_credentials())
    print("\nBEFORE:")
    for worker_id, trade_id, _ in TARGETS:
        print(f"  {worker_id} ({trade_id}): {worker_snapshot(db, worker_id)}")
    db.close()

    confirm = input(
        "\nThis will write 4 permanent ScoringLog rows and change tiers for all "
        "4 workers above. Type 'promote-all' to continue, anything else to abort: "
    )
    if confirm.strip().lower() != "promote-all":
        print("Aborted. Nothing was written.")
        return 1

    live_settings = base_settings.model_copy(
        update={
            "mode": "live",
            "writeback_policy": "verified_only",
            "allow_node_writes": True,
            "service_admin_id": base_settings.service_admin_id or "sevenkaam-ai-service",
        }
    )

    health_client = BackendClient(
        live_settings.backend_base_url, live_settings.jwt_secret or "", live_settings.service_admin_id or ""
    )
    reachable = health_client.health()
    health_client.close()
    if not reachable:
        print(
            "\nERROR: backend not reachable at "
            f"{live_settings.backend_base_url}. Start it first:\n"
            "    cd 7kaam/backend && node src/server.js"
        )
        return 1

    store = LocalStore("live_phase2_test.db")
    port = SupabaseIntegration(live_settings, store=store)
    try:
        for worker_id, trade_id, fixture_name in TARGETS:
            print(f"\n--- {worker_id} ({trade_id}) ---")
            fixture = FixtureCase.model_validate(
                json.loads((FIXTURE_DIR / f"{fixture_name}.json").read_text(encoding="utf-8"))
            )
            submission = Submission(
                submission_id=f"live-round2-{trade_id}", worker_id=worker_id, trade_id=trade_id
            )
            pipeline = Pipeline(live_settings, port, store=store)
            result = pipeline.assess(submission, fixture=fixture)
            print(f"  decision: {result.decision.value}  score_100: {result.score_100}")
            print(f"  writeback: {json.dumps(result.writeback.model_dump() if result.writeback else None)}")
    finally:
        port.close()

    db = PostgrestClient(*read_only_settings.require_live_credentials())
    print("\nAFTER:")
    for worker_id, trade_id, _ in TARGETS:
        print(f"  {worker_id} ({trade_id}): {worker_snapshot(db, worker_id)}")
    db.close()

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
