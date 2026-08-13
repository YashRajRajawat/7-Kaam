"""Report generation — spec section 12.5.

The generator receives structured evidence, never free text, and every sentence
it can emit is defined in configs/reason_codes.json. Placeholders are filled
only from values that exist in the evidence object.

Spec section 12.5: "The LLM must not invent detected tools, completed steps,
customer reviews, or safety outcomes." There is no model here at all — that is
the point. tests/test_reports.py asserts that every entity named in a report is
present in the structured evidence.
"""

from __future__ import annotations

from collections.abc import Iterable

from sevenkaam.config import load_config
from sevenkaam.errors import ConfigError
from sevenkaam.evidence import Evidence
from sevenkaam.reason_codes import ALWAYS_ON_LIMITATIONS, ReasonCode
from sevenkaam.schemas import AssessmentReport

_HUMAN_LABEL_OVERRIDES = {
    # Only cosmetic: underscores to spaces for display.
}


def humanise(identifier: str) -> str:
    """Render an evidence identifier for display without inventing content."""
    return _HUMAN_LABEL_OVERRIDES.get(identifier, identifier.replace("_", " "))


def _join(values: Iterable[str]) -> str:
    items = [humanise(v) for v in values]
    if not items:
        return "none"
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " and " + items[-1]


def _placeholders(evidence: Evidence) -> dict[str, str]:
    """The ONLY values that may be interpolated into report text.

    Each is derived directly from the evidence object, so a report cannot name
    a tool that was not in the trade rubric or a step that was not in the task.
    """
    return {
        "tools": _join(evidence.missing_required_tools()),
        "steps": _join(evidence.incomplete_steps() or evidence.task.step_ids),
        "missing": _join(evidence.missing_evidence()),
    }


def build_report(evidence: Evidence, reason_codes: Iterable[ReasonCode]) -> AssessmentReport:
    """Turn reason codes into the spec section 12.5 three-part report."""
    catalogue = load_config("reason_codes")["codes"]
    values = _placeholders(evidence)

    strengths: list[str] = []
    improvements: list[str] = []
    limitations: list[str] = []
    bucket = {
        "strength": strengths,
        "improvement": improvements,
        "limitation": limitations,
    }

    codes = list(reason_codes)
    # Always-on honesty. Spec section 4.2 and section 22: the product must never
    # imply that one guided task establishes universal competence.
    for limitation in ALWAYS_ON_LIMITATIONS:
        if limitation not in codes:
            codes.append(limitation)

    for code in codes:
        entry = catalogue.get(code.value)
        if entry is None:
            raise ConfigError(
                f"reason code {code.value} has no entry in configs/reason_codes.json — "
                "reports may not contain text that is not in the frozen vocabulary"
            )
        target = bucket.get(entry["kind"])
        if target is None:
            # 'operational' codes describe filing, not the worker. They are
            # carried on the result but deliberately kept out of the report the
            # worker sees.
            continue
        try:
            target.append(entry["text"].format(**values))
        except KeyError as exc:  # pragma: no cover - config authoring error
            raise ConfigError(
                f"reason code {code.value} references unknown placeholder {exc}"
            ) from exc

    return AssessmentReport(
        strengths=sorted(set(strengths)),
        improvements=sorted(set(improvements)),
        limitations=sorted(set(limitations)),
    )
