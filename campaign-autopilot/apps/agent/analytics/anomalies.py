"""Describe directional metric changes relative to a campaign's own baseline."""

from __future__ import annotations

import math


def relative_change(current: float, baseline: float) -> float:
    """Return signed fractional change, or NaN when comparison is undefined."""
    if baseline == 0 or math.isnan(baseline) or math.isnan(current):
        return math.nan
    return current / baseline - 1


def metric_changes(comparison: dict[str, dict[str, float]]) -> dict[str, float]:
    """Calculate recent-vs-baseline changes for the diagnostic metrics."""
    return {name: relative_change(comparison["recent"][name], comparison["baseline"][name])
            for name in ("ctr", "cvr", "cpm", "cpa", "roas", "frequency")}
