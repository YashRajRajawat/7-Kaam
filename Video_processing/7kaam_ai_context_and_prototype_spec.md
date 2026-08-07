# 7Kaam AI Trust and Practical Skill Verification

## Context File for an Agentic LLM

**Document status:** Product, UX, data, and engineering context for a functional prototype  
**Primary audience:** Agentic LLMs, product designers, ML engineers, full-stack developers, and reviewers  
**Current product focus:** Customer landing page, while designing the worker-verification foundation  
**Important limitation:** This document describes a prototype for experimentation and workflow validation. It must not be presented as a final, legally valid professional certification system.

---

## 1. Product identity

### 1.1 Product name

**7Kaam** is a local-services marketplace that helps customers find and book reliable blue-collar professionals.

The name should communicate two related ideas:

- **Saat kaam — सात काम:** seven essential service categories.
- **Saath kaam — साथ काम:** working together with trusted professionals.

Do not describe the brand as “7 in Hindi is Sath Kaam.” The precise distinction is that *saat* means seven, while *saath* suggests together/with. The ambiguity can be used intentionally as a brand device.

### 1.2 Initial service categories

The first seven categories are proposed as:

1. Barber.
2. Electrician.
3. Plumber.
4. Mechanic.
5. AC technician.
6. Carpenter.
7. Painter.

These are a starting hypothesis, not a final business decision. The final categories should be selected using local supply, customer demand, repeat-job potential, operational feasibility, and the ability to verify service quality.

### 1.3 Core mission

7Kaam’s mission is:

> To make it easier for customers to find dependable local professionals, while helping skilled workers earn more trust, visibility, and repeat work.

### 1.4 Marketplace promise

> **For every job, a trusted professional.**

Alternative Hindi/Hinglish directions:

- **Har kaam ke liye, apna trusted expert.**
- **Saat services. Saath bharosa.**
- **Kaam sahi, bharosa pakka.**
- **Aapka kaam, hamari zimmedari.**

Do not claim “guaranteed expert” until the marketplace has a real guarantee, clear eligibility rules, and a support process.

---

## 2. Product boundaries

7Kaam consists of multiple dashboards and experiences:

### Customer experience

Customers should be able to:

- Select a service category.
- Describe a problem or request.
- Upload or capture relevant photos.
- See available professionals.
- Compare trust signals, price estimates, and availability.
- Book a professional.
- Track the job.
- Approve payment.
- Rate the completed work.
- Request support or report a problem.

### Worker experience

Workers should be able to:

- Create a professional profile.
- Select trades and sub-skills.
- Submit identity evidence.
- Complete guided verification tasks.
- Receive feedback and improvement suggestions.
- Accept or reject jobs.
- Manage availability and service areas.
- Build a long-term reputation.

### Operations and reviewer dashboard

Internal teams should be able to:

- Review flagged evidence.
- Resolve identity or fraud issues.
- Approve, reject, or request resubmission.
- Audit model decisions.
- Handle customer complaints.
- View worker performance and safety incidents.
- Correct labels and send examples to the training pipeline.

### Current design priority

The immediate design priority is the **customer landing page**. The AI verification engine should be communicated through simple customer-facing proof points, not technical model names.

Customer-facing language should say:

- “Identity verified.”
- “Practical skills reviewed.”
- “Trusted by local customers.”
- “Clear estimates before work begins.”
- “Support if something goes wrong.”

Avoid showing:

- YOLO version numbers.
- Raw confidence percentages without explanation.
- “AI-certified” as if AI alone proves professional competence.
- An unexplained trust score.

---

## 3. Core strategic insight

7Kaam is not fundamentally building an object-detection product.

It is building a **Practical Skill Verification and Marketplace Trust Engine**.

The central question is not:

> Can a computer detect a wrench, pipe, comb, or multimeter?

The central question is:

> What evidence increases our confidence that this person can perform this type of work safely and professionally?

Object detection is only one evidence source. A stronger system combines:

- Identity evidence.
- Authenticity of submitted media.
- Workspace context.
- Tool familiarity.
- Trade-specific task performance.
- Safety behaviour.
- Basic domain knowledge.
- Customer outcomes over time.
- Human review for uncertain or high-impact decisions.

The result should be a **confidence assessment with explanations**, not an absolute claim of skill.

---

## 4. Trust model

### 4.1 Evidence stages

```text
Worker profile
    -> Identity verification
    -> Media authenticity checks
    -> Workspace/context verification
    -> Tool verification
    -> Guided practical task
    -> Knowledge check
    -> Human review when needed
    -> Initial trust profile
    -> Real job outcomes
    -> Reputation improvement over time
```

### 4.2 Evidence does not equal truth

Each stage is a signal with limitations:

- Identity verification shows that a person is probably the account holder; it does not prove competence.
- A workspace can support trade context; it does not prove that the person owns the workspace.
- A detected tool shows visual presence; it does not prove correct use.
- A video challenge shows performance in one controlled situation; it does not prove performance on every job.
- A knowledge quiz shows theoretical understanding; it does not prove practical ability.
- Customer ratings can be biased, sparse, or affected by price expectations.

The engine must combine signals and preserve uncertainty.

### 4.3 Public trust profile

A customer-facing profile should expose understandable evidence:

```json
{
  "identity_status": "verified",
  "trade": "electrician",
  "practical_review": "completed",
  "safety_review": "passed",
  "jobs_completed": 37,
  "repeat_customer_rate": null,
  "rating": 4.8,
  "review_count": 24,
  "badges": [
    "Identity verified",
    "Practical task reviewed",
    "Reliable arrival"
  ],
  "last_reviewed_at": "2026-08-01"
}
```

Do not display internal model probabilities as facts. If a score is displayed, label it clearly, explain its evidence, and avoid implying a government or legally recognized certificate.

---

## 5. Prototype objective

Build a small, reproducible prototype that can run on test datasets and demonstrate the following workflow:

1. Load worker submissions containing images, short videos, metadata, task labels, and ground truth.
2. Detect trade-relevant tools in images.
3. Extract human pose landmarks from videos or image frames.
4. Verify a dynamic challenge token using OCR or a simulated token reader.
5. Check basic media quality and consistency.
6. Calculate evidence-level scores.
7. Produce an explainable trust assessment.
8. Route low-quality, contradictory, or borderline cases to human review.
9. Evaluate the system on synthetic and manually labelled test data.

The prototype should work even if advanced models are unavailable. It must have a deterministic fallback mode so the end-to-end product can be tested before collecting a large real dataset.

### Prototype non-goals

- Issuing legally valid trade licenses.
- Proving that a worker can safely perform every real-world job.
- Fully automated worker rejection.
- Facial recognition as the only identity mechanism.
- Detecting every type of edited or AI-generated media.
- Using customer ratings as a direct substitute for practical assessment.
- Training a large model before the product workflow is validated.

---

## 6. Functional architecture

```text
Client application
    |
    v
Submission API
    |
    +--> File validation and secure storage
    +--> Metadata and media-quality checks
    +--> Object detection service
    +--> Pose extraction service
    +--> OCR/challenge service
    +--> Task-rule engine
    +--> Score aggregation service
    +--> Human-review queue
    +--> Report generator
    |
    v
Worker trust profile and audit log
```

### Recommended prototype stack

- Python 3.11.
- FastAPI for the API layer.
- Pydantic for request and result schemas.
- OpenCV for video frame extraction and image checks.
- MediaPipe Pose Landmarker for pose landmarks.
- Ultralytics YOLO or a mock detector for object detection.
- Tesseract, EasyOCR, or a mock OCR adapter for challenge tokens.
- scikit-learn for baseline scoring and calibration experiments.
- SQLite for a local prototype database.
- JSON files for fixtures and reproducible test cases.
- pytest for unit and integration tests.
- Docker later, after the local workflow functions.

Ultralytics documents a custom object-detection workflow based on annotated datasets, a dataset YAML file, training, validation, and prediction. [web:20][web:21] MediaPipe Pose Landmarker can return body landmarks in image and world coordinates, which is suitable for a prototype pose-feature extractor. [web:16][web:17]

### Adapter design

Every model must sit behind an adapter so the prototype can run with real models or deterministic mocks.

```python
class Detector:
    def detect(self, image_path: str, trade: str) -> list[dict]:
        raise NotImplementedError

class PoseExtractor:
    def extract(self, video_path: str) -> dict:
        raise NotImplementedError

class OCRProvider:
    def read_text(self, image_path: str) -> str:
        raise NotImplementedError
```

Implement these modes:

- `mock`: returns labels from fixture files; used in unit tests.
- `heuristic`: uses simple image/video rules; used in demos.
- `real`: calls the selected computer-vision model.

The scoring and report layers must not know which mode produced the evidence.

---

## 7. Domain language explained

### Object detection

Object detection identifies objects and returns a class, bounding box, and confidence. For example:

```json
{
  "label": "multimeter",
  "confidence": 0.91,
  "box": [120, 80, 310, 240]
}
```

It answers “what appears to be present and where?” It does not answer “does the worker know how to use it?”

### Pose estimation

Pose estimation identifies body landmarks such as shoulders, elbows, wrists, hips, knees, and ankles. It can help measure broad movement patterns, posture, reach, and whether the hands interact with a work area. It should not be treated as a complete measure of professional technique.

### Action recognition

Action recognition attempts to classify a sequence, such as “picking up a tool,” “turning a wrench,” or “joining two wires.” A prototype can begin with rule-based temporal features rather than training a deep video model.

### Scene classification

Scene classification estimates whether an image or video is consistent with a claimed workspace, such as a garage, salon, workshop, or electrical work area. Scene context is supporting evidence only.

### OCR

Optical character recognition converts visible text into machine-readable text. In the prototype, a generated challenge token can be shown to the worker and required in the captured frame.

### Liveness detection

Liveness detection attempts to distinguish a live person from a photo, replay, or presentation attack. It is a security control, not a guarantee. Use a specialist provider and legal/privacy review before production deployment.

### Face verification

Face verification compares a live capture with an identity document or previously enrolled reference. It should be optional where legally and operationally appropriate, consent-based, protected, and accompanied by a manual fallback.

### Image forensics

Image forensics refers to checks for suspicious files, such as duplicate media, obvious screenshots, inconsistent metadata, edits, or perceptual similarity to previously submitted material. No single forensic check reliably proves that media is genuine.

### Temporal consistency

Temporal consistency checks whether a video’s frames form a plausible continuous sequence. Useful signals include abrupt cuts, repeated frames, inconsistent timestamps, missing audio, impossible token visibility, and sudden scene changes.

### Confidence score

A confidence score is an estimate of how strongly the available evidence supports a conclusion. It is not the same as competence, truth, or safety. The score must include evidence coverage, uncertainty, and a review state.

### Calibration

Calibration asks whether predicted probabilities match observed outcomes. If cases predicted at 80% succeed only 55% of the time, the model is poorly calibrated. Do not call a score a probability until calibration has been measured on suitable held-out data.

### Human review

Human review is a controlled escalation path for ambiguous or high-impact decisions. The reviewer should see the evidence, model outputs, reason codes, and policy—not just a model verdict.

---

## 8. Trade configuration schema

Use configuration rather than hard-coding every trade in Python.

```json
{
  "trade_id": "electrician",
  "display_name": "Electrician",
  "required_tools": [
    {"id": "multimeter", "weight": 0.25, "required": true},
    {"id": "insulated_screwdriver", "weight": 0.20, "required": true},
    {"id": "wire_stripper", "weight": 0.20, "required": true},
    {"id": "voltage_tester", "weight": 0.20, "required": true}
  ],
  "optional_tools": ["crimping_tool", "electrical_tape"],
  "workspace_tags": ["distribution_board", "cable", "junction_box"],
  "challenge_id": "safe_wire_connection_v1",
  "knowledge_questions": ["neutral_vs_earth", "circuit_isolation"],
  "safety_rules": ["isolate_power", "use_insulated_tools", "avoid_exposed_live_contact"]
}
```

Example tools by trade:

| Trade | Required evidence examples | Practical challenge example |
|---|---|---|
| Barber | Scissors, comb, trimmer, cape, mirror or salon context | Demonstrate safe tool handling and sectioning a mannequin or willing model |
| Electrician | Multimeter, insulated screwdriver, wire stripper, tester | Demonstrate isolation, testing, stripping, and insulated joining on a safe training setup |
| Plumber | Pipe wrench, fittings, seal tape, cutter, PVC/CPVC materials | Prepare and thread or join a controlled pipe fitting |
| Mechanic | Ratchet, sockets, jack or stand, torque tool, diagnostic meter | Demonstrate a controlled inspection or removal task |
| AC technician | Manifold gauge, vacuum pump context, spanners, electrical tester | Demonstrate a safe diagnostic workflow on a training unit |
| Carpenter | Tape measure, square, saw, drill, clamps | Measure, mark, and assemble a simple controlled joint |
| Painter | Roller, brush, tray, masking tape, surface preparation tools | Prepare a small surface and apply an even test coat |

The practical challenge must be designed by a qualified trade expert. It must not require unsafe live electrical work, unsupported lifting, pressurized systems, dangerous blades, refrigerant release, or customer property.

---

## 9. Submission and dataset schema

### 9.1 Submission record

```json
{
  "submission_id": "sub_000123",
  "worker_id": "worker_001",
  "trade_id": "electrician",
  "challenge_id": "safe_wire_connection_v1",
  "created_at": "2026-08-08T00:00:00+05:30",
  "media": [
    {
      "media_id": "media_001",
      "type": "video",
      "path": "fixtures/worker_001/video.mp4",
      "duration_seconds": 18.4,
      "sha256": "...",
      "capture_mode": "in_app",
      "challenge_token": "KC-48391"
    }
  ],
  "declared_tools": ["multimeter", "wire_stripper"],
  "ground_truth": {
    "identity_valid": true,
    "media_authentic": true,
    "task_quality": 0.82,
    "human_review_label": "pass"
  }
}
```

### 9.2 Object annotation

Use one row per visible object:

```json
{
  "image_id": "img_001",
  "objects": [
    {
      "class": "multimeter",
      "bbox": [120, 80, 310, 240],
      "visibility": "clear",
      "condition": "usable",
      "occluded": false
    }
  ]
}
```

If using YOLO-format detection labels, each row contains:

```text
class_id x_center y_center width height
```

All coordinates are normalized between 0 and 1. Keep training, validation, and test workers separate to prevent identity leakage.

### 9.3 Pose annotation

For the prototype, store extracted landmarks rather than manually labelling every frame:

```json
{
  "video_id": "video_001",
  "frames": [
    {
      "timestamp_ms": 0,
      "landmarks": [
        {"name": "left_wrist", "x": 0.42, "y": 0.61, "z": -0.03, "visibility": 0.94}
      ]
    }
  ]
}
```

### 9.4 Task annotation

```json
{
  "task_id": "safe_wire_connection_v1",
  "steps": [
    {"id": "isolate", "label": 1},
    {"id": "test", "label": 1},
    {"id": "strip", "label": 1},
    {"id": "join", "label": 1},
    {"id": "insulate", "label": 0}
  ],
  "safety_score": 0.70,
  "overall_quality": 0.65,
  "reviewer_confidence": 0.90
}
```

---

## 10. Test datasets

### 10.1 Dataset types

Create three dataset layers:

1. **Synthetic fixture dataset:** deterministic examples used for software tests.
2. **Pilot dataset:** consented recordings from a small number of workers and reviewers.
3. **Production-like evaluation set:** held-out workers, lighting conditions, phone types, languages, backgrounds, and task variants.

Do not use the same worker in train and test sets. Otherwise, the model may learn the person, clothing, workshop, or phone instead of the skill.

### 10.2 Synthetic cases

Create at least these cases:

| Case | Expected outcome |
|---|---|
| All required tools, valid token, clear video, correct steps | High evidence score |
| Missing required tool | Reduced tool score and review if critical |
| Correct tools but invalid token | Authenticity failure or resubmission |
| Duplicate image hash | Fraud flag |
| Blurry video | Low quality and resubmission |
| No visible person | Identity/task failure |
| Correct task but unsafe step | Safety penalty and mandatory review |
| Contradictory metadata | Fraud or review flag |
| Good video with low quiz score | Mixed confidence; do not automatically fail |
| Excellent quiz with poor task performance | Practical score remains low |

### 10.3 Example fixture file

```json
{
  "case_id": "electrician_pass_001",
  "trade_id": "electrician",
  "detections": [
    {"label": "multimeter", "confidence": 0.95},
    {"label": "wire_stripper", "confidence": 0.93},
    {"label": "insulated_screwdriver", "confidence": 0.89}
  ],
  "token": {"expected": "KC-48391", "observed": "KC-48391", "match": true},
  "video": {
    "duration_seconds": 18,
    "blur_score": 0.88,
    "scene_changes": 0,
    "duplicate_frame_ratio": 0.01,
    "person_visible_ratio": 0.96
  },
  "task": {
    "step_completion": [1, 1, 1, 1, 1],
    "safety_score": 0.92,
    "quality_score": 0.84
  },
  "knowledge_score": 0.80
}
```

---

## 11. Baseline scoring model

Start with a transparent weighted model. Do not begin with an opaque neural network.

### 11.1 Evidence components

```text
identity_score       = identity validity and liveness evidence
media_score          = quality, token, duplicate, and continuity evidence
workspace_score      = scene/context compatibility
tool_score           = required tool coverage weighted by importance
task_score           = completed steps and task quality
safety_score         = trade-specific safety checks
knowledge_score      = validated quiz score
history_score        = real job outcomes after launch
```

For an initial worker review before marketplace history exists:

```text
initial_score =
    0.20 * identity_score +
    0.15 * media_score +
    0.10 * workspace_score +
    0.15 * tool_score +
    0.25 * task_score +
    0.10 * safety_score +
    0.05 * knowledge_score
```

The weights are product hypotheses, not scientific truth. A qualified trade expert must review them.

### 11.2 Hard safety rules

Some conditions should not be averaged away:

```python
if not identity_score_passed:
    decision = "RESUBMIT_IDENTITY"
elif not media_token_match:
    decision = "RESUBMIT_AUTHENTIC_CAPTURE"
elif safety_score < 0.40:
    decision = "HUMAN_REVIEW_SAFETY"
elif task_score < 0.45:
    decision = "PRACTICAL_TASK_NOT_PASSED"
else:
    decision = "CONTINUE_TO_REVIEW"
```

A high tool score must never override a severe safety failure.

### 11.3 Evidence coverage

A score without evidence coverage is misleading. Calculate:

```text
evidence_coverage = completed_required_evidence / total_required_evidence
```

Example:

```json
{
  "initial_score": 0.78,
  "evidence_coverage": 0.86,
  "decision": "human_review",
  "reason_codes": ["MISSING_REQUIRED_TOOL", "SAFETY_REVIEW_REQUIRED"]
}
```

### 11.4 Confidence bands

Use operational labels instead of pretending the number is an objective skill truth:

- `insufficient_evidence`: required evidence missing or media unusable.
- `needs_resubmission`: technical or authenticity failure.
- `human_review`: contradictory, borderline, or safety-sensitive evidence.
- `provisionally_verified`: sufficient evidence for a limited badge.
- `strongly_verified`: strong practical evidence plus acceptable history.

---

## 12. Prototype algorithms

### 12.1 Tool coverage

```python
def tool_score(required_tools, detections):
    best = {}
    for detection in detections:
        label = detection["label"]
        confidence = detection["confidence"]
        best[label] = max(best.get(label, 0.0), confidence)

    total_weight = sum(t["weight"] for t in required_tools)
    earned = sum(
        item["weight"] * best.get(item["id"], 0.0)
        for item in required_tools
    )
    return earned / total_weight if total_weight else 0.0
```

This measures visual evidence of tools, not ownership or skill. A real system should add dynamic capture and repeated evidence over time.

### 12.2 Token verification

```python
import re

def normalize_token(value: str) -> str:
    return re.sub(r"[^A-Z0-9-]", "", value.upper())

def token_match(expected: str, observed: str) -> bool:
    return normalize_token(expected) == normalize_token(observed)
```

The prototype can use a generated token such as `KC-48391`. In production, the token should be short-lived, tied to the submission, and visible in the live capture. OCR failure should produce a resubmission path, not an automatic fraud accusation.

### 12.3 Media quality

Prototype signals:

- Minimum duration.
- Minimum frame count.
- Basic blur score.
- Person visibility ratio.
- Excessive duplicate frames.
- Abrupt scene changes.
- Required token visible in one or more frames.

```python
def media_quality(video):
    score = 0.0
    score += 0.25 if video["duration_seconds"] >= 10 else 0.0
    score += 0.25 if video["blur_score"] >= 0.60 else 0.0
    score += 0.20 if video["person_visible_ratio"] >= 0.70 else 0.0
    score += 0.15 if video["duplicate_frame_ratio"] <= 0.20 else 0.0
    score += 0.15 if video["scene_changes"] <= 2 else 0.0
    return score
```

Do not market these heuristics as robust deepfake detection. They are prototype quality gates.

### 12.4 Task-step score

```python
def task_score(step_completion, quality_score, safety_score):
    completion = sum(step_completion) / len(step_completion)
    return 0.45 * completion + 0.30 * quality_score + 0.25 * safety_score
```

In a real system, task steps should be labelled by qualified reviewers and tested for agreement between reviewers.

### 12.5 Report generation

The report generator should receive structured evidence, not raw untrusted text. It may convert reason codes into clear language:

```json
{
  "strengths": [
    "Required electrical tools were visible.",
    "The isolation and testing steps were completed."
  ],
  "improvements": [
    "Show the insulation step more clearly in the next submission."
  ],
  "limitations": [
    "This review evaluates one guided task and does not guarantee performance on every job."
  ]
}
```

The LLM must not invent detected tools, completed steps, customer reviews, or safety outcomes.

---

## 13. Fraud and abuse controls

Use layered controls, not one “AI detector.”

### Capture controls

- Prefer in-app capture over gallery upload.
- Generate a short-lived challenge token.
- Ask for a randomized physical arrangement or action.
- Require a continuous short video for selected tasks.
- Show recording instructions in the worker’s preferred language.

### File and duplication controls

- Calculate cryptographic hashes for exact duplicates.
- Calculate perceptual hashes for resized or lightly edited duplicates.
- Compare against the worker’s previous submissions.
- Store capture time and device metadata where lawful and consented.
- Flag impossible or contradictory timestamps.

### Behavioural controls

- Require the worker to narrate or identify the next step where appropriate.
- Ask for a live response to a random instruction.
- Check that the token, worker, tools, and workspace appear in the same capture.
- Escalate suspicious cases to human review.

### Policy controls

- Tell workers what evidence is collected and why.
- Provide resubmission and appeal routes.
- Separate “suspicious” from “fraud proven.”
- Minimize data retention.
- Encrypt sensitive media.
- Restrict reviewer access.
- Keep an audit trail of model and human decisions.

---

## 14. Human review policy

Mandatory review should be triggered by:

- Identity mismatch or liveness uncertainty.
- Severe safety concern.
- Conflicting model outputs.
- Low image or video quality.
- Possible duplicate or manipulated media.
- High-impact rejection.
- A worker appeal.
- A new trade or challenge with insufficient validation data.

Reviewer screen requirements:

- Original evidence and relevant frames.
- Model outputs and thresholds.
- Reason codes.
- Expected task rubric.
- Worker’s prior decision history.
- Controls for approve, reject, resubmit, or escalate.
- Required explanation for the decision.

NIST guidance recommends defined oversight functions and risk management across the AI lifecycle; use that as a governance reference rather than treating the model as an unquestionable authority. [web:23][web:25]

---

## 15. Evaluation plan

### Detection metrics

- Precision: how many detected objects are correct.
- Recall: how many relevant objects are found.
- mAP: aggregate object-detection performance across classes and thresholds.
- Per-class performance: avoid hiding weak performance in an average.

### Video and task metrics

- Step-level accuracy.
- Safety-event recall.
- False-negative rate for critical safety events.
- Agreement between reviewers.
- Video quality failure rate.

### Trust-system metrics

- Calibration error.
- False approval rate.
- False rejection rate.
- Human-review rate.
- Resubmission success rate.
- Time to decision.
- Customer complaint rate after verification.
- Job completion and repeat-booking outcomes.

### Fairness and robustness slices

Evaluate by:

- Device type.
- Lighting condition.
- Indoor/outdoor setting.
- Language and instruction mode.
- Skin tone and clothing variation where relevant.
- Workshop type.
- Urban/rural connectivity conditions.
- Worker experience level.

Never report only one overall accuracy number.

### Acceptance criteria for the prototype

The prototype is successful when:

- A new synthetic submission can be processed end to end.
- Every evidence component returns a structured result.
- At least ten positive and ten negative fixture cases pass deterministic tests.
- Missing evidence creates a resubmission or review outcome.
- Severe safety failures cannot be overridden by a high average score.
- The report cites only evidence present in the structured result.
- The same input produces the same result in mock mode.
- A reviewer can understand why the result was produced.

---

## 16. Suggested repository structure

```text
7kaam-trust-prototype/
├── README.md
├── pyproject.toml
├── .env.example
├── configs/
│   ├── trades.json
│   └── thresholds.json
├── src/
│   └── sevenkaam/
│       ├── api.py
│       ├── schemas.py
│       ├── pipeline.py
│       ├── scoring.py
│       ├── rules.py
│       ├── reporting.py
│       └── adapters/
│           ├── detector_mock.py
│           ├── detector_yolo.py
│           ├── pose_mock.py
│           ├── pose_mediapipe.py
│           └── ocr_mock.py
├── data/
│   ├── fixtures/
│   │   ├── positive.json
│   │   ├── missing_tool.json
│   │   ├── invalid_token.json
│   │   └── unsafe_task.json
│   └── schemas/
├── tests/
│   ├── test_scoring.py
│   ├── test_rules.py
│   ├── test_pipeline.py
│   └── test_reports.py
└── reports/
```

---

## 17. API design

### Create a submission

```http
POST /v1/submissions
Content-Type: application/json
```

```json
{
  "worker_id": "worker_001",
  "trade_id": "electrician",
  "challenge_id": "safe_wire_connection_v1",
  "media_ids": ["media_001"],
  "expected_token": "KC-48391"
}
```

### Run assessment

```http
POST /v1/submissions/sub_000123/assess
```

Response:

```json
{
  "submission_id": "sub_000123",
  "decision": "human_review",
  "score": 0.78,
  "evidence_coverage": 0.86,
  "reason_codes": ["SAFETY_REVIEW_REQUIRED"],
  "components": {
    "media": 0.91,
    "tools": 0.88,
    "task": 0.70,
    "safety": 0.45,
    "knowledge": 0.80
  },
  "report": {
    "strengths": ["Required tools were visible."],
    "improvements": ["Repeat the safety step with clearer evidence."],
    "limitations": ["One guided task cannot establish universal competence."]
  }
}
```

### Reviewer decision

```http
POST /v1/reviews/rev_000123/decision
```

```json
{
  "decision": "request_resubmission",
  "reason": "The insulation step is not visible.",
  "reviewer_id": "reviewer_007"
}
```

Every decision must be versioned with the model version, rule version, prompt version, and reviewer ID where applicable.

---

## 18. Agentic LLM instruction prompt

Use the following as the system or project prompt for an agentic LLM working on 7Kaam:

```text
You are the lead product architect, UX strategist, ML systems engineer, trust-and-safety designer, and research planner for 7Kaam.

7Kaam is a local-services marketplace for customers who need dependable blue-collar professionals. The initial service categories are Barber, Electrician, Plumber, Mechanic, AC Technician, Carpenter, and Painter. The name intentionally connects Saat Kaam (seven services) with Saath Kaam (working together).

The immediate product focus is the customer landing page. The customer’s first desired feelings are trust and reliability. The customer should quickly understand what 7Kaam does, select a service, see credible trust signals, and take a clear booking or request-service action.

A future differentiator is a Practical Skill Verification and Marketplace Trust Engine. This is not merely an object detector. It combines identity evidence, media authenticity, workspace context, tools, guided practical tasks, safety behaviour, basic knowledge, human review, and real customer outcomes over time.

Your responsibilities:

1. Keep the customer marketplace and worker-verification products conceptually separate.
2. Translate technical trust systems into simple customer-facing proof points.
3. Never claim that an AI model proves universal professional competence.
4. Treat tool detection and workspace evidence as supporting signals, not proof of skill.
5. Use transparent scoring, evidence coverage, reason codes, and human-review escalation.
6. Never make high-impact worker rejection decisions solely from an opaque model output.
7. Protect worker privacy, provide consent, minimize sensitive data, and provide resubmission and appeal routes.
8. Design a functional prototype that works with synthetic fixtures and mock model adapters before requiring large real datasets.
9. Keep model integrations behind interfaces so mock, heuristic, and real implementations can be swapped.
10. Require tests for positive, negative, missing-evidence, contradictory, unsafe, duplicate, and low-quality submissions.
11. Do not invent evidence in reports. The LLM may summarize structured evidence but may not create detections, reviews, skills, or safety outcomes that are not present.
12. When information is uncertain, explicitly state the uncertainty and propose the smallest useful experiment.

For every proposed feature, provide:
- User problem.
- Customer or worker value.
- Required evidence.
- Data schema.
- Model or rule needed.
- Fallback when the model is unavailable.
- Failure modes.
- Human-review path.
- Privacy and abuse considerations.
- Test cases.
- Success metric.

For the landing page, prioritize:
- Clear value proposition.
- Service-category discovery.
- Trust signals.
- Search or request-service CTA.
- Local relevance.
- Transparent support and safety language.
- Mobile-first usability.

For the verification prototype, prioritize:
- Reproducibility.
- Explainability.
- Trade-specific configuration.
- Synthetic test data.
- Deterministic mock adapters.
- Safety hard rules.
- Review queues.
- Calibration and error analysis.

Do not start by proposing a complex production architecture. First define the smallest end-to-end prototype, its fixtures, its expected outputs, and its tests. Then propose the next iteration based on measured failures.
```

---

## 19. Landing-page context for a design LLM

```text
Design a mobile-first customer landing page for 7Kaam, a local-services marketplace for customers who need trusted blue-collar professionals.

The page must communicate trust and reliability within the first few seconds. The main user is a customer who may be stressed because something is broken, urgent, inconvenient, or personal. Reduce cognitive load and make the next action obvious.

Use the service categories Barber, Electrician, Plumber, Mechanic, AC Technician, Carpenter, and Painter. The visual language should feel local, human, dependable, practical, and modern—not like a generic luxury tech startup.

Required sections:
1. Header with logo, location, help, and login/profile.
2. Hero statement focused on getting the job done by a trusted professional.
3. Primary action: select a service or describe the problem.
4. Service-category cards with recognizable icons and plain-language labels.
5. Trust strip: identity-verified professionals, clear estimates, customer reviews, support.
6. How it works: request, match, complete, review.
7. Example professional cards showing practical trust signals.
8. Safety, support, and service-guarantee explanation only if operationally true.
9. Worker CTA: join 7Kaam and build a verified professional profile.
10. Footer with policies, contact, service areas, and language options.

Do not lead with object detection, YOLO, computer vision, or a technical AI diagram. Customers need outcomes and evidence, not implementation details.

Produce:
- Page hierarchy.
- Exact copy for every major section.
- CTA labels.
- Empty, loading, error, and location-denied states.
- Mobile and desktop behaviour.
- Accessibility notes.
- Design tokens.
- Example worker data.
- Questions that must be answered before final UI approval.
```

---

## 20. Questions the LLM must ask before finalizing

### Business

- Which city or cities will launch first?
- Is 7Kaam a booking marketplace, a lead-generation platform, or both?
- Will customers book fixed-price services or request quotations?
- Does 7Kaam offer a service guarantee, refund policy, or dispute resolution?
- What is the initial revenue model?

### Customers

- Are customers primarily homeowners, tenants, vehicle owners, businesses, or salons?
- Which jobs are urgent and which are scheduled?
- Do customers prefer phone calls, WhatsApp, or in-app booking?
- Which languages should the product support at launch?
- What information must a customer provide before receiving a match?

### Workers

- Are workers independent professionals, employees, or partner businesses?
- What documents can workers realistically provide?
- How much time and data can a worker spend on verification?
- Which trade experts will define practical rubrics?
- What happens when a skilled worker does not own every listed tool?

### Trust and safety

- Which trust badges are actually backed by a process?
- What constitutes a safety failure?
- Who reviews appeals?
- How long will media and identity data be retained?
- Which regions and legal requirements apply to identity and biometric processing?

### Data and AI

- What data is available now?
- Are images and videos collected with informed consent?
- What is the ground-truth definition of “skilled” for each trade?
- How many reviewers will label each practical task?
- Which outcomes will validate the trust score after launch?

### Design

- Should the brand feel more human, premium, government-trustworthy, energetic, or utilitarian?
- Is the primary landing-page action “Book a professional,” “Get an estimate,” or “Describe a problem”?
- Should the customer see worker names, photos, badges, ratings, and prices before booking?
- What should happen if no professional is available nearby?

---

## 21. Recommended implementation sequence

### Phase 1: Customer marketplace prototype

- Static landing page.
- Service-category selection.
- Problem description form.
- Mock professional search results.
- Trust-profile cards.
- Booking request flow.

### Phase 2: Worker profile and manual verification

- Worker onboarding.
- Trade selection.
- Document and profile review.
- Reviewer dashboard.
- Basic badges.
- Audit log.

### Phase 3: Deterministic AI prototype

- Synthetic submissions.
- Mock detector, pose, and OCR adapters.
- Scoring engine.
- Reason codes.
- Test suite.
- Generated assessment reports.

### Phase 4: Real pilot data

- Consent-based data collection.
- Trade-expert rubrics.
- Manual labels.
- Held-out worker evaluation.
- Error and fairness analysis.

### Phase 5: Model-assisted verification

- Real object detector.
- Real pose extraction.
- Real OCR.
- Video quality checks.
- Active-learning queue.
- Human review for uncertain cases.

### Phase 6: Living reputation

- Completed-job outcomes.
- Repeat bookings.
- Customer ratings with safeguards.
- Complaint and resolution history.
- Periodic re-verification.
- Evidence freshness and badge expiry.

---

## 22. Final product principle

7Kaam should not say:

> “Our AI knows this worker is an expert.”

It should say:

> “We make it easier for you to choose with confidence by showing identity, practical evidence, service history, and support.”

The strongest version of the product is a marketplace where professional credibility grows through authentic evidence and successful real-world work. The AI should make that evidence easier to collect, organize, review, and explain—while humans, trade experts, customers, and clear policies remain part of the trust system.

---

## 23. Reference links

- [Ultralytics object-detection documentation](https://docs.ultralytics.com/tasks/detect)
- [Ultralytics dataset documentation](https://docs.ultralytics.com/datasets/detect)
- [Google AI Edge MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
