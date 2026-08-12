"""The safety-critical test in this build.

Table-driven over every (band, policy) combination against a recording fake
DbClient/NodeClient, asserting EXACTLY which calls were made. The central claim
under test: under the default policy ('never'), NO band — not even a strong
pass — ever calls score-video, so ScoringLog is never touched and a worker's
tier can never move as a side effect of running this module.
"""

from __future__ import annotations

from typing import Any

import pytest

from sevenkaam.config import Settings
from sevenkaam.integration.port import WorkerRecord
from sevenkaam.integration.writeback import WritebackEngine
from sevenkaam.reason_codes import Decision
from sevenkaam.schemas import AssessmentResult, ComponentScores, AssessmentReport


class FakeDb:
    def __init__(self, table_exists: bool = True):
        self.table_exists = table_exists
        self.inserts: list[tuple[str, dict[str, Any]]] = []
        self.selects: list[tuple[str, dict[str, str]]] = []

    def table_available(self, table: str) -> bool:
        return self.table_exists

    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        self.selects.append((table, params))
        return []

    def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        self.inserts.append((table, row))
        return row


class FakeNode:
    def __init__(self):
        self.calls: list[tuple[str, float, str]] = []

    def score_video(self, worker_id: str, score: float, notes: str) -> dict[str, Any]:
        self.calls.append((worker_id, score, notes))
        return {"videoScore": score}


def _result(decision: Decision) -> AssessmentResult:
    return AssessmentResult(
        submission_id="s1",
        worker_id="w1",
        trade_id="electrician",
        decision=decision,
        score=0.9,
        score_100=90.0,
        evidence_coverage=1.0,
        reason_codes=[],
        components=ComponentScores(identity=1, media=1, workspace=1, tools=1, task=1, safety=1, knowledge=1),
        report=AssessmentReport(strengths=[], improvements=[], limitations=["x"]),
        versions={"engineVersion": "0.1.0", "ruleVersion": "0.1.0", "schemaVersion": "0.1.0"},
        adapter_modes={"detector": "mock", "pose": "mock", "ocr": "mock"},
        idempotency_key="k" * 64,
        assessed_at="2026-01-01T00:00:00Z",
    )


ALL_DECISIONS = list(Decision)
ALL_POLICIES = ["never", "verified_only", "all"]


@pytest.mark.parametrize("decision", ALL_DECISIONS)
@pytest.mark.parametrize("policy", ALL_POLICIES)
def test_writeback_policy_matrix(decision, policy):
    settings = Settings(writeback_policy=policy, allow_node_writes=True)
    db, node = FakeDb(), FakeNode()
    engine = WritebackEngine(settings, db=db, node=node)
    worker = WorkerRecord(id="w1", video_url="http://example/video.mp4")

    receipt = engine.execute(_result(decision), worker, test_id="t1")

    should_promote = {
        "never": False,
        "verified_only": decision in (Decision.PROVISIONALLY_VERIFIED, Decision.STRONGLY_VERIFIED),
        "all": True,
    }[policy]

    assert len(db.inserts) == 1, "exactly one VideoAssessment row must always be written"
    if should_promote:
        assert len(node.calls) == 1
        called_worker, called_score, notes = node.calls[0]
        assert called_worker == "w1"
        assert called_score == 90.0
        assert "sevenkaam/" in notes
    else:
        assert node.calls == []
    assert receipt.scoring_log_written is should_promote
    assert (db.inserts[0][1]["score"] is not None) is should_promote


@pytest.mark.parametrize("decision", ALL_DECISIONS)
def test_default_policy_never_promotes_any_band(decision):
    """The default configuration. If this test fails, the default is unsafe."""
    settings = Settings()  # no overrides — this IS what ships
    assert settings.writeback_policy == "never"
    db, node = FakeDb(), FakeNode()
    engine = WritebackEngine(settings, db=db, node=node)
    worker = WorkerRecord(id="w1", video_url="http://example/video.mp4")

    engine.execute(_result(decision), worker, test_id="t1")

    assert node.calls == []


def test_node_writes_disabled_blocks_promotion_even_under_policy_all():
    settings = Settings(writeback_policy="all", allow_node_writes=False)
    db, node = FakeDb(), FakeNode()
    engine = WritebackEngine(settings, db=db, node=node)
    worker = WorkerRecord(id="w1")

    engine.execute(_result(Decision.STRONGLY_VERIFIED), worker, test_id="t1")

    assert node.calls == []


def test_policy_all_refused_in_live_mode_without_explicit_ack():
    from sevenkaam.errors import ConfigError

    settings = Settings(mode="live", writeback_policy="all", i_understand_writeback_risk=False)
    with pytest.raises(ConfigError):
        settings.validate_policy()

    settings = Settings(mode="live", writeback_policy="all", i_understand_writeback_risk=True)
    settings.validate_policy()  # must not raise


def test_missing_table_degrades_instead_of_crashing():
    settings = Settings(writeback_policy="verified_only", allow_node_writes=True)
    db, node = FakeDb(table_exists=False), FakeNode()
    engine = WritebackEngine(settings, db=db, node=node)
    worker = WorkerRecord(id="w1")

    receipt = engine.execute(_result(Decision.STRONGLY_VERIFIED), worker, test_id="t1")

    assert receipt.status == "degraded"
    assert db.inserts == []
    assert node.calls == []


def test_no_database_client_configured_skips_cleanly():
    settings = Settings()
    engine = WritebackEngine(settings)  # db=None
    worker = WorkerRecord(id="w1")

    receipt = engine.execute(_result(Decision.STRONGLY_VERIFIED), worker, test_id="t1")
    assert receipt.status == "skipped"


def test_service_admin_id_required_when_node_writes_enabled_live():
    from sevenkaam.errors import ConfigError

    settings = Settings(mode="live", allow_node_writes=True, service_admin_id=None)
    with pytest.raises(ConfigError):
        settings.validate_policy()
