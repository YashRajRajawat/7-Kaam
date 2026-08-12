"""Re-running the same submission must not double-write.

A ScoringLog VIDEO row skews a worker's rolling average; a double VideoAssessment
insert would double-count in any downstream aggregate. The local store's
INSERT-OR-IGNORE claim is what prevents both.
"""

from __future__ import annotations

from sevenkaam.store import LocalStore


def test_claim_is_atomic_first_writer_wins():
    store = LocalStore(":memory:")
    first = store.claim("key-1", "sub-1", "2026-01-01T00:00:00Z")
    second = store.claim("key-1", "sub-1", "2026-01-01T00:00:01Z")
    assert first is True
    assert second is False


def test_claim_is_independent_per_key():
    store = LocalStore(":memory:")
    assert store.claim("key-a", "sub-a", "t") is True
    assert store.claim("key-b", "sub-b", "t") is True


def test_scoring_log_flag_tracked_separately_from_video_assessment_id():
    """Simulates a crash between the two remote writes: the claim exists, a
    VideoAssessment id is recorded, but scoring_log_written is still 0 — a
    resume must redo only the missing half."""
    store = LocalStore(":memory:")
    store.claim("key-1", "sub-1", "t")
    store.mark_video_assessment("key-1", "va-123")

    claim = store.get_claim("key-1")
    assert claim["video_assessment_id"] == "va-123"
    assert claim["scoring_log_written"] == 0

    store.mark_scoring_log("key-1", "note-tag")
    claim = store.get_claim("key-1")
    assert claim["scoring_log_written"] == 1
    assert claim["note_tag"] == "note-tag"


def test_pipeline_rerun_of_same_submission_is_reported_as_duplicate(
    fixture_ids, load_fixture, make_submission, pipeline
):
    fixture = load_fixture(fixture_ids[0])
    submission = make_submission(fixture, submission_id="dup-test")

    first = pipeline.assess(submission, fixture=fixture)
    assert first.writeback.status != "duplicate"

    second = pipeline.assess(submission, fixture=fixture)
    assert second.writeback.status == "duplicate"
    assert second.idempotency_key == first.idempotency_key


def test_different_worker_same_fixture_is_not_a_duplicate(
    fixture_ids, load_fixture, make_submission, pipeline
):
    fixture = load_fixture(fixture_ids[0])
    a = pipeline.assess(make_submission(fixture, submission_id="s-a", worker_id="worker-A"), fixture=fixture)
    b = pipeline.assess(make_submission(fixture, submission_id="s-b", worker_id="worker-B"), fixture=fixture)
    assert a.idempotency_key != b.idempotency_key
    assert b.writeback.status != "duplicate"
