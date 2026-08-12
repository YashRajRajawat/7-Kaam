"""
Path resolution
---------------
Single source of truth for every filesystem location the scraper touches.

Nothing here is hard-coded to a developer machine: every path is derived from
this file's own location, so the project can be cloned or moved anywhere and
still find its config, its log file, and the shared Data_Scraped directory
that the 7 Kaam backend reads from.
"""

import os
from pathlib import Path

# .../7-Kaam/business_scraper
SCRAPER_ROOT = Path(__file__).resolve().parents[1]

# .../7-Kaam  — the repository root, shared with 7kaam/ and Data_Scraped/
REPO_ROOT = SCRAPER_ROOT.parent

# Where scraped business records are written. The backend serves the API from
# this same directory, which is what makes scraped data show up in the UI.
DEFAULT_OUTPUT_DIR = REPO_ROOT / "Data_Scraped"

# Default config file shipped with the scraper
DEFAULT_CONFIG_PATH = SCRAPER_ROOT / "config.yaml"

# Rotating run log
LOG_PATH = SCRAPER_ROOT / "scraper.log"


def resolve_output_dir(configured: str | None = None) -> Path:
    """
    Decide where output files go, in priority order:

      1. SCRAPER_OUTPUT_DIR environment variable (used by the backend when it
         launches the scraper, so both sides always agree on the location)
      2. output_dir from config.yaml — relative paths resolve against the repo
         root, not the current working directory
      3. <repo>/Data_Scraped

    The directory is created if it does not exist.
    """
    env_dir = os.environ.get("SCRAPER_OUTPUT_DIR", "").strip()
    if env_dir:
        out = Path(env_dir)
    elif configured and str(configured).strip():
        out = Path(str(configured).strip())
    else:
        out = DEFAULT_OUTPUT_DIR

    if not out.is_absolute():
        out = (REPO_ROOT / out).resolve()

    out.mkdir(parents=True, exist_ok=True)
    return out


def resolve_config_path(config_path: str | None = None) -> Path:
    """
    Resolve a --config argument. A bare filename such as 'config.yaml' is looked
    up next to the scraper package first, so `python main.py` works regardless
    of the directory it was launched from.
    """
    if not config_path:
        return DEFAULT_CONFIG_PATH

    candidate = Path(config_path)
    if candidate.is_absolute():
        return candidate

    # Try cwd first (explicit user intent), then the scraper package directory.
    if candidate.exists():
        return candidate.resolve()

    packaged = SCRAPER_ROOT / candidate
    if packaged.exists():
        return packaged

    # Return the cwd-relative path so the caller raises a clear "not found".
    return candidate.resolve()


def default_chrome_profile_dir() -> str:
    """
    Locate the user's Chrome profile directory without hard-coding a username.
    Returns an empty string when it cannot be found (the scraper then runs in
    stealth-only mode, which is a supported fallback).
    """
    env_dir = os.environ.get("CHROME_PROFILE_DIR", "").strip()
    if env_dir:
        return env_dir

    local_appdata = os.environ.get("LOCALAPPDATA")
    if local_appdata:
        candidate = Path(local_appdata) / "Google" / "Chrome" / "User Data"
        if candidate.exists():
            return str(candidate)

    # macOS / Linux fallbacks
    home = Path.home()
    for rel in (
        "Library/Application Support/Google/Chrome",
        ".config/google-chrome",
    ):
        candidate = home / rel
        if candidate.exists():
            return str(candidate)

    return ""
