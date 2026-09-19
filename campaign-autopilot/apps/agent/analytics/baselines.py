"""Split campaign history into the last seven days and its preceding 14-day baseline."""

from __future__ import annotations

import pandas as pd

from .metrics import aggregate_metrics


def comparison_windows(frame: pd.DataFrame, recent_days: int = 7, baseline_days: int = 14) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return baseline and recent rows relative to the latest observed date."""
    if frame.empty:
        raise ValueError("Campaign history is empty")
    ordered = frame.copy()
    ordered["date"] = pd.to_datetime(ordered["date"])
    end = ordered["date"].max().normalize()
    recent_start = end - pd.Timedelta(days=recent_days - 1)
    baseline_start = recent_start - pd.Timedelta(days=baseline_days)
    baseline = ordered[(ordered["date"] >= baseline_start) & (ordered["date"] < recent_start)]
    recent = ordered[(ordered["date"] >= recent_start) & (ordered["date"] <= end)]
    if baseline["date"].nunique() < baseline_days or recent["date"].nunique() < recent_days:
        raise ValueError(f"Need {baseline_days + recent_days} complete calendar days for comparison")
    return baseline, recent


def compare_to_baseline(frame: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Return canonical aggregate metrics for both comparison windows."""
    baseline, recent = comparison_windows(frame)
    return {"baseline": aggregate_metrics(baseline), "recent": aggregate_metrics(recent)}
