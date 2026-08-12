"""Phase 3 — promote the already-computed AC Technician assessment.

Run this yourself, from your own terminal. It was written because an
automated attempt to run it was correctly blocked: this is the one call in the
whole module that can move a real worker's tier, so it deserves a human
actually pressing enter, not an agent doing it silently.

What it does, in order:
  1. Reads Worker.videoScore/finalScore/tier for worker-ac-001 (before).
  2. Runs the SAME assessment that was computed offline earlier this session
     (fixture data/fixtures/ac_technician_pass_002.json) — deterministic,
     already known to produce: decision=provisionally_verified, score=74.1.
  3. Writes a VideoAssessment row AND calls the real score-video endpoint,
     which writes a ScoringLog VIDEO row and recomputes videoScore/finalScore/
     tier. This step is irreversible — there is no delete route for
     ScoringLog anywhere in the platform.
  4. Reads Worker state again (after), so you can see exactly what moved.

Before running:
  - Start the backend yourself, in a separate terminal:
        cd 7kaam/backend
        node src/server.js
    (leave it running; this script expects http://localhost:8000)
  - Run this from the Video_processing/ directory with its own venv active,
    e.g.:  .venv\\Scripts\\python.exe scripts\\phase3_promote_worker_ac_001.py

This script does NOT modify Video_processing/.env. The live-write settings
(writeback_policy=verified_only, allow_node_writes=true) are set only inside
this process, for this one call — the shared .env stays at its safe default
(policy=never, node writes off) the entire time.
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

WORKER_ID = "worker-ac-001"
FIXTURE_PATH = Path(__file__).resolve().parent.parent / "data" / "fixtures" / "ac_technician_pass_002.json"
SUBMISSION_ID = "live-e2e-test-002-phase3"


def worker_snapshot(db: PostgrestClient) -> dict:
    rows = db.select(
        "Worker",
        {"id": f"eq.{WORKER_ID}", "select": "id,videoScore,finalScore,tier,kaamCardUrl"},
    )
    return rows[0] if rows else {}


def main() -> int:
    base_settings = get_settings()

    print("=" * 70)
    print("PHASE 3 — LIVE SCORE PROMOTION")
    print(f"Worker: {WORKER_ID}")
    print(f"Fixture: {FIXTURE_PATH.name} (offline-verified: provisionally_verified, 74.1)")
    print("=" * 70)

    read_only_settings = base_settings.model_copy(update={"mode": "live"})
    db = PostgrestClient(*read_only_settings.require_live_credentials())
    before = worker_snapshot(db)
    db.close()
    print("\nBEFORE:")
    print(json.dumps(before, indent=2))

    confirm = input(
        "\nThis will write a permanent ScoringLog row and may change the tier "
        f"above for {WORKER_ID}. Type 'promote' to continue, anything else to abort: "
    )
    if confirm.strip().lower() != "promote":
        print("Aborted. Nothing was written.")
        return 1

    # Live-write settings exist ONLY in this local object — Video_processing/.env
    # is never touched by this script.
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

    store = LocalStore("live_phase2_test.db")  # same store Phase 2 used
    port = SupabaseIntegration(live_settings, store=store)
    try:
        fixture = FixtureCase.model_validate(json.loads(FIXTURE_PATH.read_text(encoding="utf-8")))
        submission = Submission(submission_id=SUBMISSION_ID, worker_id=WORKER_ID, trade_id="ac_technician")

        pipeline = Pipeline(live_settings, port, store=store)
        result = pipeline.assess(submission, fixture=fixture)

        print("\nRESULT:")
        print(f"  decision: {result.decision.value}")
        print(f"  score: {result.score} / score_100: {result.score_100}")
        print(f"  writeback: {json.dumps(result.writeback.model_dump() if result.writeback else None, indent=2)}")
    finally:
        port.close()

    db = PostgrestClient(*read_only_settings.require_live_credentials())
    after = worker_snapshot(db)
    db.close()
    print("\nAFTER:")
    print(json.dumps(after, indent=2))
    print("\nDone. If a KaamCard PDF was issued, kaamCardUrl above will now be set.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
