"""Orchestration: submission -> evidence -> score -> decision -> report -> writeback.

Depends only on the IntegrationPort protocol (integration/port.py) and a Clock,
never on a concrete adapter or database implementation. This is the module that
proves the offline/live boundary actually works: the exact same code path runs
whether `port` is NullIntegration or SupabaseIntegration.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Protocol

from sevenkaam.adapters.registry import AdapterBundle, build as build_adapters
from sevenkaam.config import Settings, thresholds_hash, trades_config_hash
from sevenkaam.evidence import Evidence
from sevenkaam.integration.mapping import idempotency_key
from sevenkaam.integration.port import IntegrationPort, WorkerRecord
from sevenkaam.media.hashing import sha256_file
from sevenkaam.reporting import build_report
from sevenkaam.rules import evaluate
from sevenkaam.schemas import (
    FixtureCase,
    IdentityEvidence,
    MediaIdentity,
    Submission,
    TaskEvidence,
    TokenEvidence,
)
from sevenkaam.scoring import initial_score, to_score_100
from sevenkaam.store import LocalStore
from sevenkaam.trade_config import TradeConfig, get_trade
from sevenkaam.version import version_block


class Clock(Protocol):
    def now(self) -> dt.datetime: ...


class SystemClock:
    def now(self) -> dt.datetime:
        return dt.datetime.now(tz=dt.timezone.utc)


@dataclass(frozen=True)
class FrozenClock:
    """Deterministic clock for tests — spec section 15 requires byte-identical
    reruns, which real wall-clock time would break."""

    fixed: dt.datetime

    def now(self) -> dt.datetime:
        return self.fixed


def evidence_from_fixture(trade: TradeConfig, fixture: FixtureCase) -> Evidence:
    """Build Evidence directly from a fixture (mock-mode path).

    Mirrors what adapters.mock returns exactly, so evidence_from_adapters and
    this function must agree — enforced by test_pipeline.py running fixtures
    through both.
    """
    return Evidence(
        trade=trade,
        detections=tuple(fixture.detections),
        token=fixture.token,
        video=fixture.video,
        task=fixture.task,
        identity=fixture.identity,
        workspace_tags_observed=tuple(fixture.workspace_tags_observed),
        knowledge=fixture.knowledge_score,
        media=fixture.media,
        metadata_consistent=fixture.metadata_consistent,
        duplicate_of=fixture.duplicate_of,
    )


def evidence_from_adapters(
    trade: TradeConfig,
    adapters: AdapterBundle,
    media_path: str | None,
    *,
    identity: IdentityEvidence | None = None,
    task: TaskEvidence | None = None,
    workspace_tags_observed: tuple[str, ...] = (),
    knowledge: float | None = None,
    declared_token: str | None = None,
    metadata_consistent: bool = True,
    duplicate_of: str | None = None,
) -> Evidence:
    """Build Evidence by running the configured adapters over real media.

    Identity, task steps and knowledge are not things a video-quality adapter
    can infer — they are supplied by the caller (spec section 9: they come from
    the submission record and the guided-task rubric, not from CV).
    """
    detections = adapters.detector.detect(media_path, trade.trade_id)
    pose = adapters.pose.extract(media_path)
    video = adapters.probe.probe(media_path)
    video = video.model_copy(update={"person_visible_ratio": pose.get("person_visible_ratio", 0.0)})
    observed_token = adapters.ocr.read_text(media_path)

    token = TokenEvidence(
        expected=declared_token,
        observed=observed_token,
        readable=observed_token is not None if declared_token else True,
    )
    media = MediaIdentity(sha256=sha256_file(media_path) if media_path else None)

    return Evidence(
        trade=trade,
        detections=tuple(detections),
        token=token,
        video=video,
        task=task or TaskEvidence(),
        identity=identity or IdentityEvidence(),
        workspace_tags_observed=workspace_tags_observed,
        knowledge=knowledge,
        media=media,
        metadata_consistent=metadata_consistent,
        duplicate_of=duplicate_of,
    )


class Pipeline:
    def __init__(
        self,
        settings: Settings,
        port: IntegrationPort,
        store: LocalStore | None = None,
        clock: Clock | None = None,
    ) -> None:
        self.settings = settings
        self.port = port
        self.store = store
        self.clock = clock or SystemClock()

    def assess(self, submission: Submission, fixture: FixtureCase | None = None):
        from sevenkaam.schemas import AssessmentResult  # local import avoids cycle at module load

        trade = get_trade(submission.trade_id)
        worker = self.port.fetch_worker(submission.worker_id) or WorkerRecord(id=submission.worker_id)

        adapters = build_adapters(self.settings, fixture=fixture)

        if fixture is not None:
            evidence = evidence_from_fixture(trade, fixture)
        else:
            media_path = self.port.fetch_media(worker)
            declared_token = submission.media[0].challenge_token if submission.media else None
            evidence = evidence_from_adapters(trade, adapters, media_path, declared_token=declared_token)

        components = evidence.components()
        score = initial_score(components)
        outcome = evaluate(evidence, score)
        report = build_report(evidence, outcome.reason_codes)

        versions = version_block(trades_config_hash(), thresholds_hash())
        media_sha256 = evidence.media.sha256 or (fixture.media.sha256 if fixture else None)
        test_id_for_key = submission.test_id or submission.challenge_id or trade.trade_id
        key = idempotency_key(submission.worker_id, test_id_for_key, media_sha256, versions)

        result = AssessmentResult(
            submission_id=submission.submission_id,
            worker_id=submission.worker_id,
            trade_id=submission.trade_id,
            challenge_id=submission.challenge_id or trade.challenge_id,
            requested_test_id=submission.test_id,
            decision=outcome.decision,
            score=score,
            score_100=to_score_100(score),
            evidence_coverage=evidence.evidence_coverage(),
            reason_codes=outcome.reason_codes,
            components=components,
            missing_evidence=evidence.missing_evidence(),
            report=report,
            versions=versions,
            adapter_modes=adapters.modes(),
            idempotency_key=key,
            assessed_at=self.clock.now().isoformat(),
            media=MediaIdentity(sha256=media_sha256, phash=evidence.media.phash),
        )

        if self.store is not None:
            already_claimed = not self.store.claim(key, submission.submission_id, result.assessed_at)
            if already_claimed:
                existing = self.store.get_claim(key)
                # Re-run of an already-processed submission: do not touch the
                # platform again. Local record stands; report the prior outcome.
                from sevenkaam.schemas import WritebackReceipt

                receipt = WritebackReceipt(
                    status="duplicate",
                    reason="already assessed (idempotency key matched)",
                    video_assessment_id=(existing or {}).get("video_assessment_id"),
                    scoring_log_written=bool((existing or {}).get("scoring_log_written")),
                )
                return result.model_copy(update={"writeback": receipt})
            local_id = self.store.record_assessment(result)
            self.store.remember_media(submission.worker_id, media_sha256, evidence.media.phash, result.assessed_at)
        else:
            local_id = None

        receipt = self.port.write_assessment(result, worker)
        result = result.model_copy(update={"writeback": receipt})

        if self.store is not None and local_id is not None and result.decision.value == "human_review":
            self.store.open_review(local_id, result.assessed_at)

        return result
