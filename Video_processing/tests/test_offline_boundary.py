"""Enforces the structural offline/live boundary described in
integration/__init__.py: only that package may import a network-capable module.

An AST walk rather than a runtime import check, so this catches "imported but
unused" violations too — the mere presence of the import is the risk, since it
means the module COULD reach the network under some code path.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

SRC_ROOT = Path(__file__).resolve().parent.parent / "src" / "sevenkaam"

#: Modules that reach outside the process. httpx and PyJWT's network-adjacent
#: bits are the ones this package actually uses; socket is the underlying
#: primitive everything else is built on.
FORBIDDEN_IMPORTS = {"httpx", "socket", "urllib", "requests", "aiohttp"}

#: The only package permitted to import them.
ALLOWED_PACKAGE = "integration"


def _imported_names(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module.split(".")[0])
    return names


def _all_python_files() -> list[Path]:
    return sorted(SRC_ROOT.rglob("*.py"))


def test_only_integration_package_imports_network_modules():
    violations = []
    for path in _all_python_files():
        relative = path.relative_to(SRC_ROOT)
        if relative.parts[0] == ALLOWED_PACKAGE:
            continue
        found = _imported_names(path) & FORBIDDEN_IMPORTS
        if found:
            violations.append((str(relative), sorted(found)))
    assert not violations, f"network imports outside integration/: {violations}"


def test_offline_pipeline_never_constructs_a_live_client(monkeypatch):
    """Building a NullIntegration-backed pipeline must not read any secret."""
    import sevenkaam.config as config_module

    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    config_module.reset_settings_cache()

    from sevenkaam.integration.null_port import NullIntegration
    from sevenkaam.config import get_settings
    from sevenkaam.pipeline import Pipeline

    settings = get_settings()
    assert settings.mode == "offline"
    pipeline = Pipeline(settings, NullIntegration())
    assert pipeline is not None  # constructed with zero secrets present


def test_reset_settings_cache_is_available_for_tests():
    from sevenkaam.config import reset_settings_cache

    reset_settings_cache()  # must not raise
