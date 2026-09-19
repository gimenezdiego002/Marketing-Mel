"""Classify action risk through a readable tier table used by approval policy."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Literal


RiskTier = Literal["low", "high"]


@dataclass(frozen=True)
class RiskRule:
    action_type: str
    tier: RiskTier
    condition: Callable[[Mapping[str, Any]], bool]
    description: str


RISK_RULES = [
    RiskRule("pause", "low", lambda _: True, "Pausing is reversible and stops spend."),
    RiskRule("reallocate", "low", lambda p: abs(float(p.get("reallocation_pct", 100))) <= 15, "Small reallocations stay within the default account limit."),
    RiskRule("reallocate", "high", lambda _: True, "Large reallocations materially change delivery."),
    RiskRule("change_budget", "low", lambda p: float(p.get("change_pct", 100)) <= 0, "Budget reductions lower exposure."),
    RiskRule("change_budget", "high", lambda _: True, "Budget increases can create additional spend."),
    RiskRule("launch_creative", "high", lambda _: True, "Launching new creative changes customer-facing delivery."),
]


def classify(action: Mapping[str, Any]) -> RiskTier:
    action_type = str(action.get("type", ""))
    params = action.get("params", {})
    params = params if isinstance(params, Mapping) else {}
    match = next((rule for rule in RISK_RULES if rule.action_type == action_type and rule.condition(params)), None)
    if not match:
        raise ValueError(f"Unknown action type: {action_type}")
    return match.tier
