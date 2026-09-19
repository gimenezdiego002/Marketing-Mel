"""Enforce dollar and percentage limits before any connector write can run."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class Allowed:
    reason: str
    allowed: bool = True


@dataclass(frozen=True)
class Blocked:
    reason: str
    allowed: bool = False


GuardrailResult = Allowed | Blocked


def _params(action: Mapping[str, Any]) -> Mapping[str, Any]:
    value = action.get("params", {})
    return value if isinstance(value, Mapping) else {}


def check(action: Mapping[str, Any], guardrails_row: Mapping[str, Any], current_state: Mapping[str, Any]) -> GuardrailResult:
    """Check post-action spend, reallocation share, and campaign budget growth."""
    action_type = str(action.get("type", ""))
    params = _params(action)
    budgets = {str(key): float(value) for key, value in dict(current_state.get("campaign_budgets", {})).items()}
    current_total = float(current_state.get("total_daily_spend", sum(budgets.values())))
    max_total = float(guardrails_row["max_daily_spend"])
    campaign_id = str(params.get("campaign_id") or action.get("campaign_id") or "")
    current_budget = float(params.get("current_daily_budget", budgets.get(campaign_id, 0)))
    projected_total = current_total

    if action_type == "pause":
        projected_total -= current_budget
    elif action_type == "change_budget":
        proposed = float(params.get("new_daily_budget", params.get("daily_budget", current_budget)))
        if proposed < 0:
            return Blocked("Budget cannot be negative.")
        if current_budget > 0 and proposed > current_budget * 1.25:
            increase = (proposed / current_budget - 1) * 100
            return Blocked(f"Campaign budget increase is {increase:.1f}%; the daily limit is 25%.")
        projected_total = current_total - current_budget + proposed
    elif action_type == "launch_creative":
        projected_total += float(params.get("daily_budget", 0))
    elif action_type == "reallocate":
        amount = abs(float(params.get("amount", 0)))
        source_budget = float(params.get("source_daily_budget", budgets.get(str(params.get("from_campaign_id", "")), 0)))
        supplied_pct = params.get("reallocation_pct")
        if supplied_pct is None and source_budget <= 0:
            return Blocked("Reallocation needs a positive source budget to calculate its percentage.")
        reallocation_pct = abs(float(supplied_pct)) if supplied_pct is not None else amount / source_budget * 100
        max_pct = float(guardrails_row.get("max_reallocation_pct", 15))
        if reallocation_pct > max_pct:
            return Blocked(f"Reallocation is {reallocation_pct:.1f}%; the account limit is {max_pct:.1f}%.")

    if projected_total > max_total:
        return Blocked(f"Projected daily spend ${projected_total:.2f} exceeds the ${max_total:.2f} account cap.")
    return Allowed(f"Projected daily spend ${projected_total:.2f} is within the ${max_total:.2f} cap and percentage limits.")
