"""Short-lived backend tokens.

Holding JWT_SECRET is equivalent to platform admin on every backend route:
backend/src/middleware/auth.js is a bare jwt.verify with no audience, issuer or
revocation check, and requireRole inspects only the `role` claim. Three
mitigations, none of which is a substitute for the others:

  1. Tokens are minted per call with a <=5 minute TTL and never cached or logged.
  2. The role is REVIEWER, not SUPER_ADMIN. routes/scoring.js accepts REVIEWER
     for score-video, so it is the least privilege that works.
  3. The subject id must be configured explicitly. Defaulting to a seeded admin
     account would make every AI action indistinguishable from that human's.
"""

from __future__ import annotations

import datetime as dt
import logging
from typing import Any

import httpx
import jwt

from sevenkaam.errors import ConfigError

log = logging.getLogger(__name__)

#: routes/scoring.js accepts SUPER_ADMIN, CITY_ADMIN or REVIEWER. Least privilege.
SERVICE_ROLE = "REVIEWER"

#: HS256 matches jsonwebtoken's default for a string secret.
ALGORITHM = "HS256"

MAX_TTL_SECONDS = 300


def mint_token(secret: str, subject_id: str, ttl_seconds: int = MAX_TTL_SECONDS) -> str:
    if not secret:
        raise ConfigError("JWT_SECRET is required to call the backend")
    if not subject_id:
        raise ConfigError(
            "SEVENKAAM_SERVICE_ADMIN_ID must be set — refusing to impersonate a seeded admin"
        )
    ttl = min(ttl_seconds, MAX_TTL_SECONDS)
    now = dt.datetime.now(tz=dt.timezone.utc)
    payload: dict[str, Any] = {
        "id": subject_id,
        "role": SERVICE_ROLE,
        "iat": int(now.timestamp()),
        "exp": int((now + dt.timedelta(seconds=ttl)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


class BackendClient:
    """The ONLY authenticated backend caller in this package.

    Exactly one endpoint is reachable: POST /workers/:id/score-video. That
    endpoint already writes the ScoringLog VIDEO row, updates videoScore, and
    calls internalComputeScore — which owns rolling averages, the 35/45/20
    fusion, tier thresholds, KaamCard versioning and KaamCardHistory. None of
    that is reimplemented here; duplicating it would guarantee divergence.

    internalComputeScore is never called on its own. Each call appends a FINAL
    ScoringLog row and bumps KaamCard.version, so "refreshing" pollutes the
    worker's credential history.
    """

    def __init__(self, base_url: str, secret: str, service_admin_id: str, timeout: float = 20.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._secret = secret
        self._service_admin_id = service_admin_id
        self._client = httpx.Client(timeout=httpx.Timeout(timeout, connect=5.0))

    def close(self) -> None:
        self._client.close()

    def _auth_header(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {mint_token(self._secret, self._service_admin_id)}"}

    def score_video(self, worker_id: str, score: float, notes: str) -> dict[str, Any]:
        """Promote a score.

        Side effect worth stating plainly: if the worker has no KaamCard yet and
        their testScore is >= 60, this call issues their first KaamCard PDF and
        QR token (scoringController.js). It mints a credential, not just a number.
        """
        response = self._client.post(
            f"{self._base_url}/workers/{worker_id}/score-video",
            headers=self._auth_header(),
            json={"score": score, "notes": notes},
        )
        response.raise_for_status()
        return response.json()

    def health(self) -> bool:
        try:
            # /health sits at the server root, outside the /api/v1 namespace.
            root = self._base_url.rsplit("/api/", 1)[0]
            return self._client.get(f"{root}/health").is_success
        except httpx.HTTPError:
            return False
