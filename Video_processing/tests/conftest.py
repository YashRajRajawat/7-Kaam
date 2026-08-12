"""Shared fixtures.

Two guarantees enforced here for every test in the suite:
  1. SEVENKAAM_MODE is pinned to offline before anything imports settings.
  2. socket.socket raises. An accidental network call fails loudly and
     immediately, instead of hanging until a CI timeout — see spec section 15's
     "same input produces the same result in mock mode" and the module's
     structural offline/live boundary (integration/__init__.py).
"""

from __future__ import annotations

import json
import os
import socket
from pathlib import Path

import pytest

os.environ.setdefault("SEVENKAAM_MODE", "offline")
os.environ.pop("SUPABASE_URL", None)
os.environ.pop("SUPABASE_SERVICE_KEY", None)
os.environ.pop("JWT_SECRET", None)

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "data" / "fixtures"


@pytest.fixture(autouse=True)
def _clean_settings():
    from sevenkaam.config import reset_settings_cache

    reset_settings_cache()
    yield
    reset_settings_cache()


@pytest.fixture(autouse=True)
def _block_network(monkeypatch):
    """Block real outbound connections to anything but loopback.

    Patching socket.socket() itself is too broad: FastAPI's TestClient runs its
    event loop in a background thread via anyio, and on Windows asyncio's
    ProactorEventLoop emulates socketpair() with a loopback TCP connect for its
    internal self-pipe — that's in-process plumbing, not network access, and
    Windows lacks a native AF_UNIX socketpair to avoid it. Loopback destinations
    are allowed through to the real connect(); anything else — which is what an
    accidental Supabase or backend call would actually be — still raises.
    """
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    loopback_hosts = {"127.0.0.1", "::1", "localhost"}

    def _guard(original):
        def _call(self, address, *args, **kwargs):
            host = address[0] if isinstance(address, tuple) else address
            if host in loopback_hosts:
                return original(self, address, *args, **kwargs)
            raise AssertionError(
                f"a test tried to open a real network connection to {address!r} — "
                "offline tests must not touch the network"
            )

        return _call

    monkeypatch.setattr(socket.socket, "connect", _guard(original_connect))
    monkeypatch.setattr(socket.socket, "connect_ex", _guard(original_connect_ex))


@pytest.fixture
def fixture_ids() -> list[str]:
    return sorted(p.stem for p in FIXTURE_DIR.glob("*.json"))


@pytest.fixture
def load_fixture():
    from sevenkaam.schemas import FixtureCase

    def _load(case_id: str) -> FixtureCase:
        path = FIXTURE_DIR / f"{case_id}.json"
        return FixtureCase.model_validate(json.loads(path.read_text(encoding="utf-8")))

    return _load


@pytest.fixture
def frozen_clock():
    import datetime as dt

    from sevenkaam.pipeline import FrozenClock

    return FrozenClock(dt.datetime(2026, 8, 8, tzinfo=dt.timezone.utc))


@pytest.fixture
def make_submission():
    from sevenkaam.schemas import Submission

    def _make(fixture, **overrides):
        payload = dict(
            submission_id=f"sub-{fixture.case_id}",
            worker_id=f"worker-{fixture.case_id}",
            trade_id=fixture.trade_id,
        )
        payload.update(overrides)
        return Submission(**payload)

    return _make


@pytest.fixture
def pipeline(frozen_clock):
    from sevenkaam.config import get_settings
    from sevenkaam.integration.null_port import NullIntegration
    from sevenkaam.pipeline import Pipeline
    from sevenkaam.store import LocalStore

    store = LocalStore(":memory:")
    p = Pipeline(get_settings(), NullIntegration(), store=store, clock=frozen_clock)
    yield p
    store.close()
