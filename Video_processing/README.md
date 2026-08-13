# 7Kaam Trust Engine (Video_processing)

A deterministic, explainable **Practical Skill Verification and Trust Engine**
for 7Kaam worker video submissions, per `7kaam_ai_context_and_prototype_spec.md`
and `7Kaam_Master_System_Prompt_v2.md` in this directory.

This is not an object detector. It combines identity, media-quality, tool,
task, and safety evidence into a weighted score, applies hard safety rules that
cannot be averaged away, and produces an operational decision band plus a
plain-language report — never a bare confidence number presented as truth.

**Everything in this module lives under `Video_processing/`.** Nothing outside
this directory is read, written, or modified. It does not duplicate the Node
backend's scoring (`7kaam/backend/src/services/scoringEngine.js`) or the
`VideoAssessment`/`ScoringLog` tables it owns — it produces evidence for them.

## Status

**Phase 0 complete: the offline engine.** Runs entirely against fixtures with
zero network contact. 153 tests passing, 22 fixtures (10 positive, 12 negative)
covering every case in spec section 10.2 plus identity failure and an
unvalidated trade config.

**Phases 1–3 (live Supabase/backend integration) are built but require real
credentials to exercise** — see "Live mode" below. They have not been run
against the actual platform.

## Quickstart (offline, no credentials needed)

```bash
cd Video_processing
python -m venv .venv
./.venv/Scripts/pip install -e ".[dev]"          # Windows
# source .venv/bin/activate && pip install -e ".[dev]"   # macOS/Linux

python -m pytest -q                               # 153 tests, no network
python -m sevenkaam.cli assess-fixture electrician_pass_001 --no-store
```

Run the API:

```bash
uvicorn sevenkaam.api:app --port 8100
curl http://127.0.0.1:8100/v1/health
```

## Why the default writeback policy is `never`

`backend/src/controllers/scoringController.js` derives `Worker.videoScore` as
the **rolling average of every `ScoringLog` row with `signalType='VIDEO'`**,
then recomputes `finalScore`, `tier`, bumps `KaamCard.version`, and appends
`KaamCardHistory`. **There is no delete route for `ScoringLog` anywhere in the
platform.** A single low score from this engine would be a permanent,
unappealable demotion.

So by default (`SEVENKAAM_WRITEBACK_POLICY=never`), this module writes a full
`VideoAssessment` row — components, decision, reason codes, report, all of it —
but **never** writes a `ScoringLog` row and leaves `VideoAssessment.score` NULL.
Existing code already handles that correctly (`testController.js` filters
`v.score != null`). Nothing is lost; the irreversible lever is simply never
pulled automatically.

The invariant, enforced and tested (`tests/test_writeback_policy.py`):

> `VideoAssessment.score` is non-NULL **if and only if** a `ScoringLog` VIDEO
> row was written for that assessment.

Two independent gates must both be open before that can happen:
`SEVENKAAM_WRITEBACK_POLICY` (`never` / `verified_only` / `all`) **and**
`SEVENKAAM_ALLOW_NODE_WRITES=true`. Both default to the safe side.

## Architecture

```
configs/            trades.json, thresholds.json, trade_mapping.json, reason_codes.json
                     — every number and every user-visible sentence lives here, not in code
src/sevenkaam/
  scoring.py         spec §12 algorithms — pure, no I/O
  evidence.py        evidence assembly + coverage (spec §11.3)
  rules.py           hard safety rules (spec §11.2) + band assignment (§11.4)
  reporting.py       strengths/improvements/limitations from reason codes only
  pipeline.py        orchestrates the above; depends only on IntegrationPort
  api.py / cli.py    FastAPI /v1 (spec §17) and command-line entry points
  adapters/          Detector/PoseExtractor/OCRProvider — mock / heuristic / real (stub)
  media/             content hashing (duplicate detection)
  store/              local SQLite — idempotency, media history, review queue
  integration/        THE ONLY PACKAGE THAT MAY TOUCH THE NETWORK
data/fixtures/       22 JSON test cases
tests/               153 tests
```

**Structural offline/live boundary**, not scattered `if offline:` checks: only
`integration/` may import `httpx` or `socket`. `tests/test_offline_boundary.py`
AST-walks every other module and fails the build if that's violated.
`pipeline.py` depends on the `IntegrationPort` protocol only, so the exact same
code path runs whether it's backed by `NullIntegration` (offline, default) or
`SupabaseIntegration` (live).

## Adapters

Three modes per adapter (spec section 6), selected via
`SEVENKAAM_ADAPTER_{DETECTOR,POSE,OCR}`:

- **`mock`** (default) — deterministic, reads straight from the fixture bound
  to the submission. This is what the test suite runs against.
- **`heuristic`** — real OpenCV over real media: blur (Laplacian variance),
  duplicate-frame ratio, scene cuts (histogram correlation), a foreground-motion
  proxy for "is someone in frame." Honest about its limits: `HeuristicDetector`
  returns no detections at all rather than guessing at a tool, and
  `HeuristicOCRProvider` never fabricates a token — both would otherwise feed
  invented evidence into a worker's score.
- **`real`** — **not implemented.** Stubs raise `AdapterUnavailable` with exact
  install steps (`adapters/real_stubs.py`). `ultralytics` and `mediapipe` are
  deliberately **not** install dependencies — they're imported lazily only if
  `real` is selected. Note before wiring YOLO up for real: a pretrained COCO
  model does not contain trade-tool classes (multimeter, pipe wrench, …); real
  tool detection needs a custom-trained model on an annotated 7Kaam dataset.

## Trades

`configs/trades.json` carries all eight trades the product spec names
(including Barber and Mechanic), because the spec itself calls the original
seven "a starting hypothesis." The platform's Postgres `Trade` enum has six
values and neither Barber nor Mechanic. `configs/trade_mapping.json` represents
that mismatch explicitly rather than coercing one onto the other — an unmapped
trade assesses fully offline and only refuses **live writeback**
(`TRADE_NOT_SUPPORTED_BY_DB`). Welder ships with an empty rubric (spec section 8
provides none, and states challenges must be expert-designed); its low evidence
coverage routes it to `insufficient_evidence` with no special-casing required.

## Live mode

`SEVENKAAM_MODE=live` activates `SupabaseIntegration`
(`integration/supabase_port.py`), which:

1. Reads `Worker`/`TradeTest` and writes `VideoAssessment` over PostgREST —
   the same protocol the Node backend itself uses
   (`backend/src/utils/prisma.js` is a hand-rolled Supabase REST wrapper, not
   Prisma; raw SQL is unavailable there too).
2. Resolves a `VideoAssessment.testId` via a four-step, read-only ladder
   (`integration/testid_resolver.py`) — never invents or creates a `TradeTest`
   row, and refuses rather than guesses when more than one candidate matches.
3. Optionally (`SEVENKAAM_ALLOW_NODE_WRITES=true`) calls the **one**
   authenticated backend endpoint, `POST /workers/:id/score-video`, with a
   short-TTL (≤5 min) `REVIEWER`-role JWT minted from `JWT_SECRET`. That
   endpoint already owns rolling averages, the 35/45/20 fusion, tier
   thresholds, `KaamCard` versioning and history — none of it is reimplemented
   here. Side effect worth knowing: if the worker has no `KaamCard` yet and
   `testScore >= 60`, this call issues their first one.

**Before any live write**, run:

```bash
SEVENKAAM_MODE=live python -m sevenkaam.cli preflight
```

This probes whether `VideoAssessment` actually exists on the live database
(the consolidated migration, `backend/run_migration_2.js`, documents that it
may never have applied) and which trades have a seeded
`isVideoAssessment=true` `TradeTest` row — currently only Electrician and
Plumber. Nothing assumes either without checking first.

## Known limitations

- **Review approval does not yet re-promote a score.** `POST
  /v1/reviews/{id}/decision` records the decision, but reconstructing the
  original `AssessmentResult` to run it back through the writeback engine on
  `approve` is not wired up in this build (`api.py::decide_review`). Today,
  promoting a reviewed submission is a manual follow-up call.
- **The FastAPI service binds `127.0.0.1` by default and `/v1` is
  unauthenticated.** Fine for a local prototype; needs auth before any shared
  deployment.
- **No calibration.** `initial_score` is a transparent weighted average (spec
  section 11), not a measured probability — spec section 7 forbids calling it
  one until calibration is measured against real outcomes, which needs a real
  pilot dataset this build does not have.
- **`score_weights` and the band cutoffs are product hypotheses**, not
  expert-reviewed values (every trade config ships `expert_reviewed: false`).

## What was deliberately not assumed

No table, column, enum value, index, constraint, RPC, storage bucket, or
endpoint was added, altered, or invented anywhere in the platform. Not assumed:
that `VideoAssessment` exists live; that a `TradeTest` video row exists for a
given trade; that the Next.js dashboard will change to read `VideoAssessment`
(it currently doesn't — see `dashboard/app/assessments/page.tsx`); that
`DATABASE_URL`/`DIRECT_URL` is reachable (PostgREST only); that a service
`Admin` row exists.
