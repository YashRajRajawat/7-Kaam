"""Command-line entry points.

`assess-fixture` and `preflight` are the two commands actually exercised by the
verification steps in this build; `assess-worker` and `sync` are provided for
completeness but need a reachable backend to do anything meaningful.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sevenkaam.config import FIXTURE_DIR, get_settings
from sevenkaam.integration.null_port import NullIntegration
from sevenkaam.pipeline import Pipeline
from sevenkaam.schemas import FixtureCase, Submission
from sevenkaam.store import LocalStore
from sevenkaam.trade_config import validate_all


def _cmd_assess_fixture(args: argparse.Namespace) -> int:
    path = Path(args.fixture) if Path(args.fixture).exists() else FIXTURE_DIR / f"{args.fixture}.json"
    fixture = FixtureCase.model_validate(json.loads(path.read_text(encoding="utf-8")))

    submission = Submission(
        submission_id=f"cli-{fixture.case_id}",
        worker_id=args.worker_id or f"cli-worker-{fixture.case_id}",
        trade_id=fixture.trade_id,
        challenge_id=None,
        fixture_id=None,
    )

    settings = get_settings()
    store = LocalStore(":memory:") if args.no_store else LocalStore(settings.db_path)
    pipeline = Pipeline(settings, NullIntegration(), store=store)
    result = pipeline.assess(submission, fixture=fixture)

    print(json.dumps(result.to_api(), indent=2, default=str))
    return 0


def _cmd_preflight(args: argparse.Namespace) -> int:
    settings = get_settings()
    warnings = validate_all()
    for w in warnings:
        print(f"[config] {w}", file=sys.stderr)

    if not settings.is_live:
        print(json.dumps({"mode": "offline", "note": "set SEVENKAAM_MODE=live to probe the platform"}, indent=2))
        return 0

    from sevenkaam.integration.supabase_port import SupabaseIntegration

    port = SupabaseIntegration(settings)
    try:
        report = port.preflight()
    finally:
        port.close()

    print(json.dumps(report.__dict__, indent=2))
    return 0


def _cmd_export_schemas(args: argparse.Namespace) -> int:
    from sevenkaam.config import DATA_DIR
    from sevenkaam.schemas import AssessmentResult, FixtureCase, Submission

    out_dir = DATA_DIR / "schemas"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, model in (
        ("submission", Submission),
        ("fixture_case", FixtureCase),
        ("assessment_result", AssessmentResult),
    ):
        (out_dir / f"{name}.schema.json").write_text(
            json.dumps(model.model_json_schema(), indent=2), encoding="utf-8"
        )
    print(f"wrote schemas to {out_dir}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="sevenkaam")
    sub = parser.add_subparsers(dest="command", required=True)

    p_fixture = sub.add_parser("assess-fixture", help="run the pipeline against a fixture, offline")
    p_fixture.add_argument("fixture", help="fixture id (e.g. electrician_pass_001) or a path to a JSON file")
    p_fixture.add_argument("--worker-id")
    p_fixture.add_argument("--no-store", action="store_true", help="use an in-memory store")
    p_fixture.set_defaults(func=_cmd_assess_fixture)

    p_preflight = sub.add_parser("preflight", help="probe the live platform (SEVENKAAM_MODE=live)")
    p_preflight.set_defaults(func=_cmd_preflight)

    p_schemas = sub.add_parser("export-schemas", help="write JSON Schema for the core models")
    p_schemas.set_defaults(func=_cmd_export_schemas)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
