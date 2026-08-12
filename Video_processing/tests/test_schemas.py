"""Spec section 9 schema round-trips and the extra="forbid" contract."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from sevenkaam.schemas import FixtureCase, Submission, TaskEvidence


def test_fixture_round_trip(load_fixture, fixture_ids):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        again = FixtureCase.model_validate_json(fixture.model_dump_json())
        assert again == fixture


def test_extra_fields_forbidden():
    with pytest.raises(ValidationError):
        Submission(
            submission_id="s1",
            worker_id="w1",
            trade_id="electrician",
            unexpected_field="nope",
        )


def test_task_evidence_step_length_mismatch_rejected():
    with pytest.raises(ValidationError):
        TaskEvidence(step_ids=["a", "b"], step_completion=[1])


def test_unit_scores_are_bounded():
    with pytest.raises(ValidationError):
        TaskEvidence(quality_score=1.5)
    with pytest.raises(ValidationError):
        TaskEvidence(safety_score=-0.1)
