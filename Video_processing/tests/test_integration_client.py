"""PostgREST client: table names, verbs, error classification, no-retry-on-POST.

Uses respx to fake the HTTP layer — this test module is one of the few allowed
to import network-shaped test tooling, since it is exercising integration/
directly rather than the offline pipeline. It does not open a real socket.
"""

from __future__ import annotations

import httpx
import pytest
import respx

from sevenkaam.errors import SchemaDriftError
from sevenkaam.integration.postgrest import PostgrestClient, validate_id


@pytest.fixture
def client():
    c = PostgrestClient("https://example.supabase.co", "service-key-123")
    yield c
    c.close()


def test_rejects_unknown_table(client):
    with pytest.raises(ValueError):
        client.select("DropTables", {})


@pytest.mark.parametrize("bad", ["'; DROP TABLE Worker;--", "a b", "", "x" * 200])
def test_validate_id_rejects_unsafe_values(bad):
    with pytest.raises(ValueError):
        validate_id(bad)


def test_validate_id_accepts_uuid_like_values():
    assert validate_id("a1b2c3d4-0000-0000-0000-000000000000")


@respx.mock
def test_select_sends_apikey_and_bearer_headers(client):
    route = respx.get("https://example.supabase.co/rest/v1/Worker").mock(
        return_value=httpx.Response(200, json=[{"id": "w1"}])
    )
    rows = client.select("Worker", {"id": "eq.w1"})
    assert rows == [{"id": "w1"}]
    sent = route.calls[0].request
    assert sent.headers["apikey"] == "service-key-123"
    assert sent.headers["Authorization"] == "Bearer service-key-123"


@respx.mock
def test_insert_sends_client_generated_id(client):
    respx.post("https://example.supabase.co/rest/v1/VideoAssessment").mock(
        return_value=httpx.Response(201, json=[{"id": "va-1", "score": None}])
    )
    row = client.insert("VideoAssessment", {"id": "va-1", "workerId": "w1", "testId": "t1", "score": None})
    assert row["id"] == "va-1"


@respx.mock
def test_missing_table_raises_schema_drift_not_generic_error(client):
    respx.get("https://example.supabase.co/rest/v1/VideoAssessment").mock(
        return_value=httpx.Response(
            404, json={"code": "PGRST205", "message": "table not found"}
        )
    )
    with pytest.raises(SchemaDriftError):
        client.select("VideoAssessment", {"select": "id"})


@respx.mock
def test_missing_column_raises_schema_drift_naming_it(client):
    respx.post("https://example.supabase.co/rest/v1/VideoAssessment").mock(
        return_value=httpx.Response(
            400, json={"code": "PGRST204", "message": "Could not find the 'rubricScores' column"}
        )
    )
    with pytest.raises(SchemaDriftError, match="rubricScores"):
        client.insert("VideoAssessment", {"id": "x", "rubricScores": {}})


@respx.mock
def test_table_available_caches_result(client):
    route = respx.get("https://example.supabase.co/rest/v1/ScoringLog").mock(
        return_value=httpx.Response(200, json=[])
    )
    assert client.table_available("ScoringLog") is True
    assert client.table_available("ScoringLog") is True
    assert route.call_count == 1  # cached, not re-probed


@respx.mock
def test_table_available_false_when_missing(client):
    respx.get("https://example.supabase.co/rest/v1/VideoAssessment").mock(
        return_value=httpx.Response(404, json={"code": "PGRST205", "message": "not found"})
    )
    assert client.table_available("VideoAssessment") is False


@respx.mock
def test_post_is_never_retried_on_transport_error(client):
    route = respx.post("https://example.supabase.co/rest/v1/ScoringLog").mock(
        side_effect=httpx.ConnectError("boom")
    )
    with pytest.raises(httpx.ConnectError):
        client.insert("ScoringLog", {"id": "x"})
    assert route.call_count == 1


@respx.mock
def test_get_is_retried_on_transport_error(client):
    route = respx.get("https://example.supabase.co/rest/v1/Worker")
    route.side_effect = [httpx.ConnectError("boom"), httpx.Response(200, json=[])]
    result = client.select("Worker", {"select": "id"})
    assert result == []
    assert route.call_count == 2
