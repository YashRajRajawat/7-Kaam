"""Settings and config loading.

Design rule that differs deliberately from the Node backend: this module must
*succeed* with a completely empty environment. backend/src/utils/prisma.js and
supabaseStorage.js throw at import time when secrets are missing, which is right
for a server that cannot function without a database. Here, the default mode is
offline and the whole test suite has to run on a clean checkout with no .env, so
secrets are read lazily and only when live mode actually needs them.
"""

from __future__ import annotations

import functools
import json
import os
from pathlib import Path
from typing import Any, Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

from sevenkaam.errors import ConfigError
from sevenkaam.version import config_hash

PACKAGE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_ROOT.parent.parent
CONFIG_DIR = PROJECT_ROOT / "configs"
DATA_DIR = PROJECT_ROOT / "data"
FIXTURE_DIR = DATA_DIR / "fixtures"
REPORT_DIR = PROJECT_ROOT / "reports"

Mode = Literal["offline", "live"]
AdapterMode = Literal["mock", "heuristic", "real"]
WritebackPolicy = Literal["never", "verified_only", "all"]

_dotenv_loaded = False


def _ensure_dotenv_loaded() -> None:
    """Load Video_processing/.env into os.environ, once, lazily.

    pydantic-settings' env_file loading only populates DECLARED Settings
    fields; SUPABASE_URL / SUPABASE_SERVICE_KEY / JWT_SECRET are read as plain
    os.environ properties (never fields) so an offline Settings() cannot see
    them even if a .env file with real secrets exists on disk. This function is
    the one place that bridges the file into the environment, and it only runs
    when a live-mode code path actually asks for one of those three values.
    override=False: a real environment variable always wins over the file.
    """
    global _dotenv_loaded
    if _dotenv_loaded:
        return
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env", override=False)
    _dotenv_loaded = True


class Settings(BaseSettings):
    """Environment-driven settings.

    Field names map to SEVENKAAM_* env vars; SUPABASE_URL / SUPABASE_SERVICE_KEY
    / JWT_SECRET intentionally reuse the backend's existing names because they
    are the same secrets, not new ones.
    """

    model_config = SettingsConfigDict(
        env_prefix="SEVENKAAM_",
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mode: Mode = "offline"

    adapter_detector: AdapterMode = "mock"
    adapter_pose: AdapterMode = "mock"
    adapter_ocr: AdapterMode = "mock"

    # Default `never`: a ScoringLog VIDEO row permanently moves a worker's
    # rolling-average videoScore, tier and KaamCard version, and no delete route
    # exists anywhere in the platform. See README "Why the default is `never`".
    writeback_policy: WritebackPolicy = "never"
    allow_node_writes: bool = False
    i_understand_writeback_risk: bool = False

    backend_base_url: str = "http://localhost:8000/api/v1"
    service_admin_id: str | None = None
    storage_bucket: str = "7kaam-assets"
    max_video_bytes: int = 209_715_200

    db_path: str = "sevenkaam.db"
    api_bind: str = "127.0.0.1"

    @property
    def is_live(self) -> bool:
        return self.mode == "live"

    # Secrets are read on demand, never as fields, so nothing is loaded into
    # memory (or into a repr) while offline. Read directly from the process
    # environment rather than through pydantic-settings' env_file mechanism,
    # which only populates DECLARED model fields — these three are properties,
    # not fields, precisely so an offline Settings() never touches them.
    # _ensure_dotenv_loaded() is what actually gets Video_processing/.env into
    # os.environ for live mode to see.
    @property
    def supabase_url(self) -> str | None:
        _ensure_dotenv_loaded()
        return os.environ.get("SUPABASE_URL") or None

    @property
    def supabase_service_key(self) -> str | None:
        _ensure_dotenv_loaded()
        return os.environ.get("SUPABASE_SERVICE_KEY") or None

    @property
    def jwt_secret(self) -> str | None:
        _ensure_dotenv_loaded()
        return os.environ.get("JWT_SECRET") or None

    def require_live_credentials(self) -> tuple[str, str]:
        if not self.is_live:
            raise ConfigError("live credentials requested while in offline mode")
        url, key = self.supabase_url, self.supabase_service_key
        if not url or not key:
            raise ConfigError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY are required in live mode "
                "(see Video_processing/.env.example)"
            )
        return url, key

    def validate_policy(self) -> None:
        """Guard the dangerous combinations.

        `all` promotes failing outcomes into the rolling average, which can
        demote a worker's tier from a single blurry re-upload. It stays
        implemented so the failure mode is testable, but it cannot be reached in
        live mode by a single env var.
        """
        if self.writeback_policy == "all" and self.is_live and not self.i_understand_writeback_risk:
            raise ConfigError(
                "writeback_policy='all' in live mode also promotes FAILING assessments "
                "into Worker.videoScore, which can irreversibly demote a worker's tier. "
                "Set SEVENKAAM_I_UNDERSTAND_WRITEBACK_RISK=true to proceed."
            )
        if self.allow_node_writes and self.is_live and not self.service_admin_id:
            raise ConfigError(
                "SEVENKAAM_SERVICE_ADMIN_ID must be set explicitly when node writes are "
                "enabled — refusing to impersonate a seeded admin account."
            )

    def adapter_modes(self) -> dict[str, str]:
        return {
            "detector": self.adapter_detector,
            "pose": self.adapter_pose,
            "ocr": self.adapter_ocr,
        }


@functools.lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    """Tests mutate the environment between cases."""
    get_settings.cache_clear()
    load_config.cache_clear()


@functools.lru_cache(maxsize=8)
def load_config(name: str) -> dict[str, Any]:
    """Load and cache a configs/*.json file."""
    path = CONFIG_DIR / f"{name}.json"
    if not path.exists():
        raise ConfigError(f"missing config file: {path}")
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except json.JSONDecodeError as exc:  # pragma: no cover - config authoring error
        raise ConfigError(f"invalid JSON in {path}: {exc}") from exc


def thresholds() -> dict[str, Any]:
    return load_config("thresholds")


def thresholds_hash() -> str:
    return config_hash(thresholds())


def trades_config_hash() -> str:
    return config_hash(load_config("trades"))
