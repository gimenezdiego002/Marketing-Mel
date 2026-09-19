"""Score creative-fatigue evidence from transparent normalized components."""

from __future__ import annotations

import math

import pandas as pd

from .anomalies import metric_changes
from .baselines import compare_to_baseline


WEIGHTS = {"ctr_decay": 0.30, "cvr_decline": 0.30, "cpm_rise": 0.20, "cpa_rise": 0.20}
# A component reaches 1.0 at a material deterioration threshold. Values are
# capped, so a single extreme metric cannot outweigh the remaining evidence.
NORMALIZATION = {"ctr_decay": 0.25, "cvr_decline": 0.30, "cpm_rise": 0.20, "cpa_rise": 0.45}


def _normalize(value: float, scale: float) -> float:
    if math.isnan(value):
        return 0.0
    return min(1.0, max(0.0, value) / scale)


def fatigue_score(frame: pd.DataFrame) -> dict[str, object]:
    """Compare last 7 vs prior 14 days and return score, components, and window metrics."""
    comparison = compare_to_baseline(frame)
    changes = metric_changes(comparison)
    raw = {
        "ctr_decay": -changes["ctr"],
        "cvr_decline": -changes["cvr"],
        "cpm_rise": changes["cpm"],
        "cpa_rise": changes["cpa"],
    }
    components = {
        name: {"raw_change": value, "normalized": _normalize(value, NORMALIZATION[name]), "weight": WEIGHTS[name]}
        for name, value in raw.items()
    }
    score = sum(float(item["normalized"]) * float(item["weight"]) for item in components.values())
    return {"score": round(score, 4), "components": components, "changes": changes, **comparison}
