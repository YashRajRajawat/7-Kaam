"""Spec section 15: "the same input produces the same result in mock mode."

Checked two ways: repeated calls in-process, and a fresh subprocess with a
different PYTHONHASHSEED — set iteration order or dict hashing bugs would show
up as a mismatch between processes but not within one.
"""

from __future__ import annotations

import json
import subprocess
import sys

import pytest

FIXTURES_TO_CHECK = [
    "electrician_pass_001",
    "plumber_high_quiz_poor_task",
    "welder_no_validated_config",
    "barber_offline_only",
]


@pytest.mark.parametrize("case_id", FIXTURES_TO_CHECK)
def test_repeated_in_process_runs_are_byte_identical(case_id, load_fixture, make_submission, frozen_clock):
    """Two independent pipelines (fresh stores) assessing the same fixture for
    DIFFERENT workers must produce byte-identical results apart from the
    worker/submission identifiers themselves.

    Deliberately not reusing one store for both runs: doing so would hit the
    idempotency guard (tests/test_idempotency.py) and return a "duplicate"
    receipt instead of a second real assessment, which would defeat the point
    of this test rather than proving determinism.
    """
    from sevenkaam.config import get_settings
    from sevenkaam.integration.null_port import NullIntegration
    from sevenkaam.pipeline import Pipeline
    from sevenkaam.store import LocalStore

    fixture = load_fixture(case_id)
    results = []
    for suffix in ("a", "b"):
        store = LocalStore(":memory:")
        p = Pipeline(get_settings(), NullIntegration(), store=store, clock=frozen_clock)
        submission = make_submission(fixture, submission_id=f"{case_id}-{suffix}", worker_id=f"worker-{suffix}")
        results.append(p.assess(submission, fixture=fixture))
        store.close()

    a = results[0].model_dump(exclude={"submission_id", "worker_id", "assessed_at", "idempotency_key"})
    b = results[1].model_dump(exclude={"submission_id", "worker_id", "assessed_at", "idempotency_key"})
    assert a == b


@pytest.mark.parametrize("case_id", FIXTURES_TO_CHECK)
def test_subprocess_with_varied_hashseed_matches(case_id):
    script = (
        "import sys; sys.path.insert(0, 'src'); "
        "from sevenkaam.cli import _cmd_assess_fixture; "
        "import argparse; "
        f"ns = argparse.Namespace(fixture={case_id!r}, worker_id='det-worker', no_store=True); "
        "_cmd_assess_fixture(ns)"
    )
    import os

    outputs = []
    for seed in ("1", "999999"):
        env = dict(os.environ)
        env["PYTHONHASHSEED"] = seed
        env["SEVENKAAM_MODE"] = "offline"
        env.pop("SUPABASE_URL", None)
        env.pop("SUPABASE_SERVICE_KEY", None)
        env.pop("JWT_SECRET", None)
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            env=env,
            cwd=_project_root(),
            timeout=60,
        )
        assert result.returncode == 0, result.stderr
        payload = json.loads(result.stdout)
        payload.pop("assessed_at", None)
        outputs.append(payload)

    assert outputs[0] == outputs[1]


def _project_root() -> str:
    from pathlib import Path

    return str(Path(__file__).resolve().parent.parent)
