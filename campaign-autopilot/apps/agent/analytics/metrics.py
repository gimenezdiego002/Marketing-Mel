"""Compute canonical campaign metrics from raw totals without inventing missing values."""

from __future__ import annotations

import math
from collections.abc import Mapping

import pandas as pd


def safe_divide(numerator: float, denominator: float) -> float:
    """Return a ratio, or NaN when the denominator is zero/missing."""
    if pd.isna(numerator) or pd.isna(denominator) or denominator == 0:
        return math.nan
    return float(numerator) / float(denominator)


def calculate_metrics(totals: Mapping[str, float]) -> dict[str, float]:
    """Calculate ratios from aggregate counts; frequency is derived from impressions/reach."""
    impressions = totals.get("impressions", math.nan)
    clicks = totals.get("clicks", math.nan)
    spend = totals.get("spend", math.nan)
    conversions = totals.get("conversions", math.nan)
    revenue = totals.get("revenue", math.nan)
    reach = totals.get("reach", math.nan)
    return {
        "ctr": safe_divide(clicks, impressions),
        "cpc": safe_divide(spend, clicks),
        "cpm": safe_divide(spend, impressions) * 1000,
        "cvr": safe_divide(conversions, clicks),
        "cpa": safe_divide(spend, conversions),
        "roas": safe_divide(revenue, spend),
        "frequency": safe_divide(impressions, reach),
    }


def aggregate_metrics(frame: pd.DataFrame) -> dict[str, float]:
    """Sum additive columns and derive ratios for a complete analysis window."""
    columns = ["impressions", "clicks", "spend", "conversions", "revenue", "reach"]
    totals = {column: float(frame[column].sum(min_count=1)) for column in columns}
    return {**totals, **calculate_metrics(totals)}
