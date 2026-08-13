"""Supabase Storage read.

The platform's bucket is public (backend/src/services/supabaseStorage.js
creates it with { public: true }) — every worker video is world-readable today.
This module must not widen that, and must not log full URLs at INFO, since a
log line is one more place the address could leak from.

Note the upload path is fixed per worker (videos/{workerId}/skill_demo.mp4) and
upserts, so re-fetching a PRIOR attempt is not possible once a new one has been
uploaded — media_hash in the local store is the only durable history.
"""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path

import httpx

from sevenkaam.errors import ConfigError

log = logging.getLogger(__name__)

DEFAULT_BUCKET = "7kaam-assets"
_CHUNK = 1024 * 1024


def default_object_path(worker_id: str) -> str:
    """The path the backend always writes to. See scoringController.js."""
    return f"videos/{worker_id}/skill_demo.mp4"


def public_url(supabase_url: str, bucket: str, object_path: str) -> str:
    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{object_path}"


def download_to_temp(
    url: str,
    max_bytes: int,
    client: httpx.Client | None = None,
) -> Path:
    """Stream a video to a temp file with a hard size cap.

    The cap exists because a malicious or corrupt upload should not be able to
    exhaust disk on the machine running assessments.
    """
    owns_client = client is None
    client = client or httpx.Client(timeout=httpx.Timeout(30.0, connect=5.0))
    try:
        destination = Path(tempfile.mkstemp(suffix=".mp4", prefix="sevenkaam-")[1])
        written = 0
        with client.stream("GET", url) as response:
            if not response.is_success:
                raise ConfigError(f"could not download media (status {response.status_code})")
            with destination.open("wb") as handle:
                for chunk in response.iter_bytes(_CHUNK):
                    written += len(chunk)
                    if written > max_bytes:
                        destination.unlink(missing_ok=True)
                        raise ConfigError(
                            f"media exceeds SEVENKAAM_MAX_VIDEO_BYTES ({max_bytes} bytes); aborted download"
                        )
                    handle.write(chunk)
        log.info("downloaded media (%d bytes) for local processing", written)
        return destination
    finally:
        if owns_client:
            client.close()
