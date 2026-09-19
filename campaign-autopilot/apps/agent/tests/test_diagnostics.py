"""Verify readable, data-driven diagnostic rule selection."""

import pandas as pd

from analytics.diagnostics import RULES, diagnose


def make_history(recent: dict[str, float]) -> pd.DataFrame:
    baseline = {"impressions": 10000, "clicks": 200, "spend": 110, "conversions": 6, "revenue": 340, "reach": 5000}
    return pd.DataFrame([{"date": f"2026-02-{day+1:02d}", **(recent if day >= 14 else baseline)} for day in range(21)])


def test_rules_are_declarative_data() -> None:
    assert len(RULES) >= 3
    assert all(rule.likely_cause and callable(rule.predicate) for rule in RULES)


def test_creative_fatigue_requires_stable_cvr() -> None:
    diagnosis = diagnose(make_history({"impressions": 10000, "clicks": 140, "spend": 136, "conversions": 4.2, "revenue": 220, "reach": 2700}))
    assert diagnosis["likely_cause"] == "creative_fatigue"
    assert any("CVR" in item and "post-click" in item for item in diagnosis["evidence"])


def test_conversion_decline_selects_landing_page() -> None:
    diagnosis = diagnose(make_history({"impressions": 10000, "clicks": 200, "spend": 110, "conversions": 3.6, "revenue": 205, "reach": 5000}))
    assert diagnosis["likely_cause"] == "landing_page_or_offer"
