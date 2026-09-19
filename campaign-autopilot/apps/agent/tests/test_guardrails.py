"""Verify spend caps, risk tiers, data quality, and policy decisions."""

from guardrails.data_quality import assess_snapshots, check_action_data
from guardrails.policy import decide
from guardrails.risk_tiers import classify
from guardrails.spend_caps import Allowed, Blocked, check


GUARDRAILS = {"max_daily_spend": 1000, "max_reallocation_pct": 15, "min_confidence": .7, "autonomy_level": "assisted"}
STATE = {"campaign_budgets": {"a": 400, "b": 300}, "total_daily_spend": 700}


def test_spend_caps_allow_bounded_reallocation() -> None:
    action = {"type": "reallocate", "params": {"from_campaign_id": "a", "amount": 40, "reallocation_pct": 10}}
    result = check(action, GUARDRAILS, STATE)
    assert isinstance(result, Allowed) and "$700.00" in result.reason


def test_spend_caps_block_each_limit() -> None:
    assert isinstance(check({"type": "reallocate", "params": {"reallocation_pct": 16}}, GUARDRAILS, STATE), Blocked)
    assert isinstance(check({"type": "change_budget", "params": {"campaign_id": "a", "new_daily_budget": 501}}, GUARDRAILS, STATE), Blocked)
    assert isinstance(check({"type": "launch_creative", "params": {"daily_budget": 301}}, GUARDRAILS, STATE), Blocked)


def test_policy_examples() -> None:
    reallocation = {"type": "reallocate", "params": {"reallocation_pct": 10}}
    assert classify(reallocation) == "low"
    assert decide(reallocation, .8, GUARDRAILS).outcome == "auto"
    assert decide({"type": "launch_creative"}, .9, GUARDRAILS).outcome == "approval"
    assert decide({"type": "pause"}, .5, GUARDRAILS).outcome == "recommend_only"
    assert all(decide(action, confidence, GUARDRAILS).reason for action, confidence in [(reallocation, .8), ({"type": "launch_creative"}, .9), ({"type": "pause"}, .5)])


def test_impossible_data_blocks_dependent_action() -> None:
    report = assess_snapshots([{"date": "2026-01-01", "impressions": 10, "clicks": 11, "conversions": 1, "spend": 2, "revenue": 3, "reach": 5}])
    result = check_action_data({"type": "change_budget", "params": {}}, report)
    assert report.suspect and isinstance(result, Blocked) and "clicks exceed impressions" in result.reason


def test_conversion_spike_with_flat_clicks_is_suspect() -> None:
    normal = [{"date": f"2026-01-0{day}", "impressions": 1000, "clicks": 100, "conversions": 10, "spend": 50, "revenue": 300, "reach": 700} for day in range(1, 5)]
    spike = {"date": "2026-01-05", "impressions": 1000, "clicks": 105, "conversions": 51, "spend": 50, "revenue": 1500, "reach": 700}
    assert assess_snapshots([*normal, spike]).suspect
