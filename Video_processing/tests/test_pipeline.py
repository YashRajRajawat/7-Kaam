"""End-to-end: every fixture through the pipeline, matched against its
`expected` block. This is the direct test of spec section 15's acceptance
criteria: "a new synthetic submission can be processed end to end," "at least
ten positive and ten negative fixture cases pass," and "missing evidence
creates a resubmission or review outcome."
"""

from __future__ import annotations

from sevenkaam.reason_codes import Decision


def test_at_least_ten_positive_and_ten_negative_fixtures_exist(fixture_ids, load_fixture):
    positive, negative = 0, 0
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        if fixture.expected.decision in (Decision.PROVISIONALLY_VERIFIED, Decision.STRONGLY_VERIFIED):
            positive += 1
        else:
            negative += 1
    assert positive >= 10
    assert negative >= 10


def test_every_fixture_matches_its_expectation(fixture_ids, load_fixture, make_submission, pipeline):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        submission = make_submission(fixture)
        result = pipeline.assess(submission, fixture=fixture)

        assert result.decision == fixture.expected.decision, (
            f"{case_id}: expected {fixture.expected.decision}, got {result.decision} "
            f"(score={result.score}, coverage={result.evidence_coverage}, codes={result.reason_codes})"
        )
        for code in fixture.expected.reason_codes_include:
            assert code in result.reason_codes, f"{case_id}: missing expected reason code {code}"
        assert result.writeback is not None
        assert result.writeback.status == fixture.expected.writeback


def test_every_component_is_present_in_every_result(fixture_ids, load_fixture, make_submission, pipeline):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        result = pipeline.assess(make_submission(fixture), fixture=fixture)
        dumped = result.components.model_dump()
        for key in ("identity", "media", "workspace", "tools", "task", "safety", "knowledge"):
            assert key in dumped
            assert 0.0 <= dumped[key] <= 1.0


def test_low_coverage_never_yields_a_verified_decision(fixture_ids, load_fixture, make_submission, pipeline):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        result = pipeline.assess(make_submission(fixture), fixture=fixture)
        if result.evidence_coverage < 0.7:
            assert result.decision in (Decision.INSUFFICIENT_EVIDENCE, Decision.NEEDS_RESUBMISSION, Decision.HUMAN_REVIEW)


def test_every_result_carries_versions_and_idempotency_key(fixture_ids, load_fixture, make_submission, pipeline):
    for case_id in fixture_ids:
        fixture = load_fixture(case_id)
        result = pipeline.assess(make_submission(fixture), fixture=fixture)
        assert result.versions["engineVersion"]
        assert result.versions["ruleVersion"]
        assert result.idempotency_key
        assert len(result.idempotency_key) == 64  # sha256 hex
