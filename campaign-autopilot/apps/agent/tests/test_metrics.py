"""Verify canonical ratio math and missing/zero behavior."""

import math

import pandas as pd

from analytics.metrics import aggregate_metrics, calculate_metrics


def test_metrics_use_raw_totals() -> None:
    metrics = calculate_metrics({"impressions": 1000, "clicks": 20, "spend": 50, "conversions": 4, "revenue": 200, "reach": 500})
    assert metrics == {"ctr": .02, "cpc": 2.5, "cpm": 50, "cvr": .2, "cpa": 12.5, "roas": 4, "frequency": 2}


def test_zero_denominators_are_unknown() -> None:
    metrics = calculate_metrics({"impressions": 0, "clicks": 0, "spend": 0, "conversions": 0, "revenue": 0, "reach": 0})
    assert all(math.isnan(value) for value in metrics.values())


def test_aggregate_calculates_ratio_of_sums() -> None:
    frame = pd.DataFrame([
        {"impressions": 100, "clicks": 1, "spend": 1, "conversions": 1, "revenue": 4, "reach": 50},
        {"impressions": 900, "clicks": 27, "spend": 99, "conversions": 2, "revenue": 196, "reach": 400},
    ])
    assert aggregate_metrics(frame)["ctr"] == .028
