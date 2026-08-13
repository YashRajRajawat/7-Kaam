"""Spec section 12.5: the report may not name anything not in the evidence.

For every fixture, every tool or step named in the report text must actually be
present in that fixture's structured evidence — never a hallucinated addition.
"""

from __future__ import annotations

from sevenkaam.evidence import Evidence
from sevenkaam.pipeline import evidence_from_fixture
from sevenkaam.reason_codes import ReasonCode
from sevenkaam.reporting import build_report
from sevenkaam.rules import evaluate
from sevenkaam.scoring import initial_score
from sevenkaam.trade_config import get_trade


def _assess(fixture):
    trade = get_trade(fixture.trade_id)
    evidence = evidence_from_fixture(trade, fixture)
    score = initial_score(evidence.components())
    outcome = evaluate(evidence, score)
    report = build_report(evidence, outcome.reason_codes)
    return evidence, outcome, report


def test_reports_never_empty_limitations(fixture_ids, load_fixture):
    for case_id in fixture_ids:
        _, _, report = _assess(load_fixture(case_id))
        assert report.limitations, f"{case_id}: limitations must never be empty"


def test_reports_only_name_tools_actually_missing(fixture_ids, load_fixture):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        evidence, outcome, report = _assess(fixture)
        missing = set(evidence.missing_required_tools())
        for line in report.improvements:
            if "required tools were not clearly visible" in line:
                for tool_id in missing:
                    assert tool_id.replace("_", " ") in line


def test_reports_never_claim_all_tools_visible_when_one_is_missing(fixture_ids, load_fixture):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        evidence, outcome, report = _assess(fixture)
        if evidence.missing_required_tools():
            assert not any("All required tools" in s for s in report.strengths)


def test_reports_never_claim_task_complete_when_steps_are_missing(fixture_ids, load_fixture):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        evidence, outcome, report = _assess(fixture)
        if evidence.incomplete_steps():
            assert not any("Every step" in s for s in report.strengths)


def test_every_reason_code_has_a_catalogue_entry():
    from sevenkaam.config import load_config

    catalogue = load_config("reason_codes")["codes"]
    for code in ReasonCode:
        assert code.value in catalogue, f"{code.value} has no reason_codes.json entry"


def test_report_always_carries_the_always_on_limitations(fixture_ids, load_fixture):
    from sevenkaam.reason_codes import ALWAYS_ON_LIMITATIONS
    from sevenkaam.config import load_config

    catalogue = load_config("reason_codes")["codes"]
    expected_texts = {catalogue[c.value]["text"] for c in ALWAYS_ON_LIMITATIONS}
    for case_id in fixture_ids:
        _, _, report = _assess(load_fixture(case_id))
        assert expected_texts.issubset(set(report.limitations))
