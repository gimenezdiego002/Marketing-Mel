"""Map combinations of measured changes to likely causes using an extensible rule table."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

import pandas as pd

from .fatigue import fatigue_score
from .significance import adjusted_confidence


@dataclass(frozen=True)
class DiagnosticRule:
    name: str
    likely_cause: str
    predicate: Callable[[dict[str, object]], bool]
    base_confidence: float
    evidence_metrics: tuple[str, ...]


def _change(result: dict[str, object], metric: str) -> float:
    return float(result["changes"][metric])  # type: ignore[index]


RULES = [
    DiagnosticRule(
        name="creative response weakens while post-click conversion holds",
        likely_cause="creative_fatigue",
        predicate=lambda r: (
            _change(r, "ctr") <= -0.15
            and _change(r, "cpm") >= 0.08
            and float(r["recent"]["frequency"]) >= 2.5  # type: ignore[index]
            and abs(_change(r, "cvr")) <= 0.12
        ),
        base_confidence=0.90,
        evidence_metrics=("ctr", "cpm", "frequency", "cvr", "cpa"),
    ),
    DiagnosticRule(
        name="post-click conversion weakens while traffic response holds",
        likely_cause="landing_page_or_offer",
        predicate=lambda r: _change(r, "cvr") <= -0.20 and abs(_change(r, "ctr")) <= 0.15,
        base_confidence=0.84,
        evidence_metrics=("cvr", "ctr", "cpa"),
    ),
    DiagnosticRule(
        name="auction cost rises without response or conversion deterioration",
        likely_cause="auction_pressure",
        predicate=lambda r: _change(r, "cpm") >= 0.20 and abs(_change(r, "ctr")) <= 0.12 and abs(_change(r, "cvr")) <= 0.12,
        base_confidence=0.74,
        evidence_metrics=("cpm", "ctr", "cvr", "cpa"),
    ),
]


def _pct(value: float) -> str:
    return f"{value:+.0%} vs baseline"


def diagnose(frame: pd.DataFrame) -> dict[str, object]:
    """Return the first matching diagnosis, readable evidence, and volume-adjusted confidence."""
    result = fatigue_score(frame)
    matched = next((rule for rule in RULES if rule.predicate(result)), None)
    conversions = float(result["recent"]["conversions"]) if "conversions" in result["recent"] else float(frame.tail(7)["conversions"].sum())  # type: ignore[operator]
    if matched is None:
        return {
            "likely_cause": "no_clear_diagnosis",
            "evidence": ["No diagnostic metric combination crossed its rule thresholds"],
            "confidence": adjusted_confidence(0.45, conversions),
            "rule": None,
            "analysis": result,
        }
    evidence = []
    for metric in matched.evidence_metrics:
        if metric == "frequency":
            recent = float(result["recent"][metric])  # type: ignore[index]
            evidence.append(f"Frequency {recent:.2f}x ({_pct(_change(result, metric))})")
        elif metric == "cvr":
            evidence.append(f"CVR {_pct(_change(result, metric))} (post-click conversion)")
        else:
            evidence.append(f"{metric.upper()} {_pct(_change(result, metric))}")
    return {
        "likely_cause": matched.likely_cause,
        "evidence": evidence,
        "confidence": adjusted_confidence(matched.base_confidence, conversions),
        "rule": matched.name,
        "analysis": result,
    }
