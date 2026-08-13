"""Spec section 17: the /v1 API shapes.

Every assessment response must carry engine/rule/config versions — spec
section 17: "every decision must be versioned" — which is also what lets a
reviewer trust and reproduce a result (spec section 15).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    monkeypatch.setenv("SEVENKAAM_DB_PATH", str(tmp_path / "test.db"))
    from sevenkaam.config import reset_settings_cache

    reset_settings_cache()

    import sevenkaam.api as api_module

    if hasattr(api_module.app.state, "store"):
        del api_module.app.state.store
    if hasattr(api_module.app.state, "port"):
        del api_module.app.state.port

    with TestClient(api_module.app) as client:
        yield client


def test_health(api_client):
    response = api_client.get("/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "offline"
    assert "versions" in body
    assert body["versions"]["engineVersion"]


def test_submission_and_assess_round_trip(api_client):
    create = api_client.post(
        "/v1/submissions",
        json={
            "submission_id": "api-sub-1",
            "worker_id": "api-worker-1",
            "trade_id": "electrician",
            "fixture_id": "electrician_pass_001",
        },
    )
    assert create.status_code == 200
    assert create.json()["submission_id"] == "api-sub-1"

    assess = api_client.post("/v1/submissions/api-sub-1/assess")
    assert assess.status_code == 200
    body = assess.json()

    assert body["decision"] == "strongly_verified"
    assert "score" in body
    assert "evidence_coverage" in body
    assert isinstance(body["reason_codes"], list)
    assert set(body["components"].keys()) == {
        "identity", "media", "workspace", "tools", "task", "safety", "knowledge",
    }
    assert body["versions"]["engineVersion"]
    assert body["versions"]["ruleVersion"]
    assert "report" in body
    assert body["report"]["limitations"]


def test_assess_unknown_submission_is_404(api_client):
    response = api_client.post("/v1/submissions/does-not-exist/assess")
    assert response.status_code == 404


def test_invalid_submission_payload_is_422(api_client):
    response = api_client.post(
        "/v1/submissions",
        json={"submission_id": "x", "worker_id": "w", "trade_id": "electrician", "extra_junk_field": True},
    )
    assert response.status_code == 422


def test_review_queue_lists_human_review_outcomes(api_client):
    api_client.post(
        "/v1/submissions",
        json={
            "submission_id": "api-sub-2",
            "worker_id": "api-worker-2",
            "trade_id": "electrician",
            "fixture_id": "electrician_missing_tool",
        },
    )
    api_client.post("/v1/submissions/api-sub-2/assess")

    reviews = api_client.get("/v1/reviews")
    assert reviews.status_code == 200
    body = reviews.json()
    assert len(body) == 1
    assert body[0]["assessment_decision"] == "human_review"
    assert body[0]["review_status"] == "OPEN"


def test_review_decision_requires_reason_and_reviewer(api_client):
    api_client.post(
        "/v1/submissions",
        json={
            "submission_id": "api-sub-3",
            "worker_id": "api-worker-3",
            "trade_id": "electrician",
            "fixture_id": "electrician_missing_tool",
        },
    )
    api_client.post("/v1/submissions/api-sub-3/assess")
    review_id = api_client.get("/v1/reviews").json()[0]["id"]

    bad = api_client.post(f"/v1/reviews/{review_id}/decision", json={"decision": "approve"})
    assert bad.status_code == 422

    good = api_client.post(
        f"/v1/reviews/{review_id}/decision",
        json={"decision": "approve", "reason": "looks fine", "reviewer_id": "reviewer-1"},
    )
    assert good.status_code == 200
    assert good.json()["status"] == "CLOSED"

    again = api_client.post(
        f"/v1/reviews/{review_id}/decision",
        json={"decision": "approve", "reason": "looks fine", "reviewer_id": "reviewer-1"},
    )
    assert again.status_code == 409
