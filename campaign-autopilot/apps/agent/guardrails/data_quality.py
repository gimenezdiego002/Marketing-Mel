"""Detect impossible snapshots and tracking spikes before metrics drive an action."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from .spend_caps import Allowed, Blocked, GuardrailResult


@dataclass(frozen=True)
class QualityReport:
    suspect: bool
    reasons: tuple[str, ...]


def assess_snapshots(snapshots: Iterable[Mapping[str, Any]]) -> QualityReport:
    rows = list(snapshots)
    reasons: list[str] = []
    numeric_fields = ("impressions", "clicks", "spend", "conversions", "revenue", "reach")
    for index, row in enumerate(rows):
        label = str(row.get("date", f"row {index + 1}"))
        values: dict[str, float] = {}
        for field in numeric_fields:
            raw = row.get(field)
            if raw is None or raw == "":
                continue
            try:
                values[field] = float(raw)
            except (TypeError, ValueError):
                reasons.append(f"{label}: {field} is not numeric")
                continue
            if not math.isfinite(values[field]) or values[field] < 0:
                reasons.append(f"{label}: {field} is negative or non-finite")
        if values.get("clicks", 0) > values.get("impressions", math.inf):
            reasons.append(f"{label}: clicks exceed impressions")
        if values.get("conversions", 0) > values.get("clicks", math.inf):
            reasons.append(f"{label}: conversions exceed clicks")
        if values.get("reach", 0) > values.get("impressions", math.inf):
            reasons.append(f"{label}: reach exceeds impressions")

        if index >= 3 and "conversions" in values and "clicks" in values:
            baseline = rows[max(0, index - 7):index]
            baseline_conversions = [float(item["conversions"]) for item in baseline if item.get("conversions") not in (None, "")]
            baseline_clicks = [float(item["clicks"]) for item in baseline if item.get("clicks") not in (None, "")]
            if baseline_conversions and baseline_clicks:
                conversion_mean = sum(baseline_conversions) / len(baseline_conversions)
                clicks_mean = sum(baseline_clicks) / len(baseline_clicks)
                flat_clicks = clicks_mean > 0 and abs(values["clicks"] / clicks_mean - 1) <= 0.20
                if conversion_mean > 0 and values["conversions"] > conversion_mean * 5 and flat_clicks:
                    reasons.append(f"{label}: conversions exceed 5x baseline while clicks remain flat")
    return QualityReport(bool(reasons), tuple(dict.fromkeys(reasons)))


def check_action_data(action: Mapping[str, Any], report: QualityReport) -> GuardrailResult:
    params = action.get("params", {})
    depends_on_data = not isinstance(params, Mapping) or params.get("depends_on_snapshot_data", True)
    if report.suspect and depends_on_data:
        return Blocked("Action depends on suspect snapshot data: " + "; ".join(report.reasons))
    return Allowed("Snapshot data passed quality checks for this action.")
