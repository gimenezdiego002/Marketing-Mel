"""Verify fatigue scoring and evidence components against controlled histories."""

import pandas as pd

from analytics.fatigue import WEIGHTS, fatigue_score


def history(recent: dict[str, float]) -> pd.DataFrame:
    rows = []
    for day in range(21):
        values = recent if day >= 14 else {"impressions": 10000, "clicks": 200, "spend": 110, "conversions": 6, "revenue": 340, "reach": 5000}
        rows.append({"date": f"2026-01-{day+1:02d}", **values})
    return pd.DataFrame(rows)


def test_fatigue_score_returns_weighted_components() -> None:
    result = fatigue_score(history({"impressions": 10000, "clicks": 140, "spend": 136, "conversions": 4, "revenue": 220, "reach": 2700}))
    assert result["score"] >= .55
    assert set(result["components"]) == set(WEIGHTS)
    assert result["components"]["ctr_decay"]["raw_change"] > .25
    assert abs(result["components"]["cvr_decline"]["raw_change"]) < .05


def test_stable_campaign_scores_low() -> None:
    stable = {"impressions": 10000, "clicks": 200, "spend": 110, "conversions": 6, "revenue": 340, "reach": 5000}
    assert fatigue_score(history(stable))["score"] == 0
