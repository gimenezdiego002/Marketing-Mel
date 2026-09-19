"""Choose automatic execution, human approval, or recommendation from confidence and risk."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Mapping

from .risk_tiers import classify


PolicyOutcome = Literal["auto", "approval", "recommend_only"]


@dataclass(frozen=True)
class PolicyDecision:
    outcome: PolicyOutcome
    reason: str


def decide(action: Mapping[str, Any], confidence: float, guardrails: Mapping[str, Any]) -> PolicyDecision:
    """Apply confidence first, then account autonomy, then action risk."""
    threshold = float(guardrails.get("min_confidence", 0.7))
    if confidence < threshold:
        return PolicyDecision("recommend_only", f"Confidence {confidence:.2f} is below the {threshold:.2f} minimum.")
    autonomy = str(guardrails.get("autonomy_level", "recommend"))
    if autonomy == "recommend":
        return PolicyDecision("recommend_only", "Account autonomy is set to recommend, so no action may run automatically.")
    tier = classify(action)
    if tier == "high":
        return PolicyDecision("approval", f"{action.get('type')} is high risk and requires human approval even at {confidence:.2f} confidence.")
    return PolicyDecision("auto", f"{action.get('type')} is low risk, confidence {confidence:.2f} clears the threshold, and {autonomy} mode allows it.")
