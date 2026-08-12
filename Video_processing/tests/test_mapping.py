"""integration/mapping.py: engine result -> platform row shape."""

from __future__ import annotations

import pytest

from sevenkaam.integration import mapping
from sevenkaam.reason_codes import Decision
from sevenkaam.scoring import to_score_100


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(0.0, 0.0), (1.0, 100.0), (0.7849, 78.5), (0.005, 0.5), (0.649, 64.9)],
)
def test_score_rounding_table(raw, expected):
    assert to_score_100(raw) == expected


@pytest.mark.parametrize(
    "decision",
    list(Decision),
)
def test_status_for_every_decision(decision):
    status = mapping.status_for(decision)
    assert status.startswith("AI_")
    assert status == status.upper()


def test_idempotency_key_stable_for_same_inputs():
    versions = {"engineVersion": "0.1.0", "ruleVersion": "0.1.0", "tradeConfigHash": "a", "thresholdsHash": "b"}
    k1 = mapping.idempotency_key("w1", "t1", "sha-a", versions)
    k2 = mapping.idempotency_key("w1", "t1", "sha-a", versions)
    assert k1 == k2
    assert len(k1) == 64


def test_idempotency_key_changes_with_media_hash():
    versions = {"engineVersion": "0.1.0", "ruleVersion": "0.1.0", "tradeConfigHash": "a", "thresholdsHash": "b"}
    k1 = mapping.idempotency_key("w1", "t1", "sha-a", versions)
    k2 = mapping.idempotency_key("w1", "t1", "sha-b", versions)
    assert k1 != k2


def test_idempotency_key_changes_with_engine_version():
    v1 = {"engineVersion": "0.1.0", "ruleVersion": "0.1.0", "tradeConfigHash": "a", "thresholdsHash": "b"}
    v2 = {**v1, "engineVersion": "0.2.0"}
    k1 = mapping.idempotency_key("w1", "t1", "sha-a", v1)
    k2 = mapping.idempotency_key("w1", "t1", "sha-a", v2)
    assert k1 != k2


def test_idempotency_key_stable_without_media_hash():
    """A submission with no media hash yet must still get a deterministic key
    (not crash, not silently use a random/None-derived value)."""
    versions = {"engineVersion": "0.1.0", "ruleVersion": "0.1.0", "tradeConfigHash": "a", "thresholdsHash": "b"}
    k1 = mapping.idempotency_key("w1", "t1", None, versions)
    k2 = mapping.idempotency_key("w1", "t1", None, versions)
    assert k1 == k2


def test_rubric_scores_payload_is_namespaced_under_ai(fixture_ids, load_fixture, make_submission, pipeline):
    fixture = load_fixture(fixture_ids[0])
    result = pipeline.assess(make_submission(fixture), fixture=fixture)
    payload = mapping.rubric_scores_payload(result, test_id="t1", scoring_log_written=False)
    assert set(payload.keys()) == {"ai"}
    assert payload["ai"]["idempotencyKey"] == result.idempotency_key
    assert payload["ai"]["writeback"]["scoringLogWritten"] is False


def test_feedback_text_respects_max_chars(fixture_ids, load_fixture, make_submission, pipeline):
    fixture = load_fixture(fixture_ids[0])
    result = pipeline.assess(make_submission(fixture), fixture=fixture)
    text = mapping.feedback_text(result, max_chars=20)
    assert len(text) <= 20


def test_video_assessment_row_score_null_when_not_promoted(fixture_ids, load_fixture, make_submission, pipeline):
    fixture = load_fixture(fixture_ids[0])
    result = pipeline.assess(make_submission(fixture), fixture=fixture)
    row = mapping.video_assessment_row(
        row_id="va-1", worker_id="w1", test_id="t1", video_url="http://x/video.mp4",
        score=None, result=result, attempt_number=1, scoring_log_written=False, note=None,
    )
    assert row["score"] is None
    assert row["id"] == "va-1"
    assert row["workerId"] == "w1"
    assert row["testId"] == "t1"
