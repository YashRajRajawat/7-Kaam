"""FastAPI /v1 layer — spec section 17.

Binds 127.0.0.1 by default (see cli.py) and is unauthenticated. That is
acceptable for a local prototype; it must change before any shared deployment
(see README "Known limitations").

Note the path prefix is `/v1`, not `/api/v1` — deliberately distinct from the
Node backend's namespace, since this is a separate service, not a route added
to that one. Bodies are snake_case per spec section 17, the opposite of the
Node backend's camelCase; integration/mapping.py is the only place that
translates into the platform's convention.
"""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from sevenkaam.config import Settings, get_settings, thresholds_hash, trades_config_hash
from sevenkaam.errors import SevenKaamError
from sevenkaam.integration.null_port import NullIntegration
from sevenkaam.pipeline import Pipeline
from sevenkaam.schemas import FixtureCase, ReviewDecisionRequest, Submission
from sevenkaam.store import LocalStore
from sevenkaam.trade_config import validate_all
from sevenkaam.version import version_block

app = FastAPI(title="7Kaam Trust Engine", version="0.1.0")

_submissions: dict[str, Submission] = {}
_fixtures_by_submission: dict[str, FixtureCase] = {}


def _settings() -> Settings:
    return get_settings()


def _store() -> LocalStore:
    if not hasattr(app.state, "store"):
        app.state.store = LocalStore(_settings().db_path)
    return app.state.store


def _port():
    if not hasattr(app.state, "port"):
        settings = _settings()
        if settings.is_live:
            from sevenkaam.integration.supabase_port import SupabaseIntegration

            app.state.port = SupabaseIntegration(settings, store=_store())
        else:
            app.state.port = NullIntegration()
    return app.state.port


@app.exception_handler(SevenKaamError)
async def _handle_engine_error(request: Any, exc: SevenKaamError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"error": exc.__class__.__name__, "detail": str(exc)})


@app.get("/v1/health")
def health() -> dict[str, Any]:
    settings = _settings()
    warnings = validate_all()
    body: dict[str, Any] = {
        "mode": settings.mode,
        "adapters": settings.adapter_modes(),
        "writeback_policy": settings.writeback_policy,
        "allow_node_writes": settings.allow_node_writes,
        "versions": version_block(trades_config_hash(), thresholds_hash()),
        "config_warnings": warnings,
    }
    if settings.is_live:
        body["preflight"] = _port().preflight().__dict__
    return body


@app.post("/v1/submissions")
def create_submission(submission: Submission) -> dict[str, Any]:
    # Letting FastAPI parse the body directly as the Pydantic model (rather
    # than accepting dict[str, Any] and calling model_validate manually) means
    # a malformed body — including an extra field, since Submission forbids
    # them — is rejected with a 422 by FastAPI's own request handling, before
    # this function body ever runs. A ValidationError raised manually inside a
    # handler is NOT auto-converted to 422; it surfaces as a 500.
    _submissions[submission.submission_id] = submission
    return {"submission_id": submission.submission_id}


@app.post("/v1/submissions/{submission_id}/assess")
def assess_submission(submission_id: str) -> dict[str, Any]:
    submission = _submissions.get(submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="submission not found")

    fixture = None
    if submission.fixture_id:
        fixture = _load_fixture(submission.fixture_id)

    pipeline = Pipeline(_settings(), _port(), store=_store())
    result = pipeline.assess(submission, fixture=fixture)
    return result.to_api()


@app.get("/v1/reviews")
def list_reviews() -> list[dict[str, Any]]:
    return _store().review_queue()


@app.post("/v1/reviews/{review_id}/decision")
def decide_review(review_id: str, request: ReviewDecisionRequest) -> dict[str, Any]:
    store = _store()
    review = store.get_review(review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="review not found")
    if review["review_status"] != "OPEN":
        raise HTTPException(status_code=409, detail="review already decided")

    now = dt.datetime.now(tz=dt.timezone.utc).isoformat()
    store.decide_review(review_id, request.decision, request.reason, request.reviewer_id, now)

    # This is the ONLY path by which a human_review outcome can ever promote a
    # worker's score. It reuses the same writeback engine and the same
    # double-gate (policy + SEVENKAAM_ALLOW_NODE_WRITES) as the automatic path;
    # approving a review does not bypass either gate.
    promoted = False
    if request.decision == "approve" and _settings().allow_node_writes:
        # A full re-promotion requires the original AssessmentResult, which the
        # local store does not reconstruct here in this build (see README
        # "Review approval and promotion" for the manual follow-up today).
        promoted = False

    return {
        "review_id": review_id,
        "status": "CLOSED",
        "decision": request.decision,
        "reviewer_id": request.reviewer_id,
        "promoted": promoted,
    }


def _load_fixture(fixture_id: str) -> FixtureCase:
    import json

    from sevenkaam.config import FIXTURE_DIR

    path = FIXTURE_DIR / f"{fixture_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"fixture {fixture_id!r} not found")
    with path.open(encoding="utf-8") as handle:
        return FixtureCase.model_validate(json.load(handle))
