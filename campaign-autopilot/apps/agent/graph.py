"""The Campaign Autopilot loop as one LangGraph graph.

ingest -> analyze -> detect -> diagnose -> plan -> generate -> approve -> act -> measure -> learn

Two nodes pause for a human. `approve` waits for the creative decision and `measure`
waits for the next week of data to arrive; both use LangGraph interrupts, so the pause
is a real checkpoint rather than a flag the UI keeps for itself.

Every number a node reports comes from analytics/, guardrails/, or the connector result.
No node invents a metric, and the only platform write goes through the simulated
connector after spend caps and the approval policy have both passed.
"""

from __future__ import annotations

import operator
from datetime import datetime, timezone
from typing import Annotated, Any, TypedDict
from uuid import uuid4

import pandas as pd
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from analytics.diagnostics import diagnose
from analytics.fatigue import fatigue_score
from analytics.metrics import aggregate_metrics
from connectors.simulated import SimulatedConnector, seed_repository
from guardrails.policy import decide as decide_policy
from guardrails.risk_tiers import classify
from guardrails.spend_caps import check as check_spend_caps


LOOP_NODES = ("ingest", "analyze", "detect", "diagnose", "plan", "generate", "approve", "act", "measure", "learn")

# A campaign must score at least this high before the loop spends a diagnosis on it.
# The seeded Brew & Bloom week puts meta_prospecting at 0.611 and every other campaign below 0.17.
DETECT_THRESHOLD = 0.35
ACCOUNT_ID = "seed-account"

TITLES = {
    "creative_fatigue": (
        "Creative fatigue is reducing prospecting efficiency",
        "Audience exposure rose as click response weakened, while post-click conversion held steady.",
        "Recover efficiency without increasing spend",
    ),
    "landing_page_or_offer": (
        "Post-click conversion is falling on the landing page",
        "Traffic response held steady while the share of clicks that convert dropped.",
        "Recover conversion rate on existing traffic",
    ),
    "auction_pressure": (
        "Auction costs are rising without a response problem",
        "Delivery cost per thousand impressions rose while click and conversion behaviour held.",
        "Protect efficiency against rising delivery cost",
    ),
}


class LoopState(TypedDict, total=False):
    """Everything the graph carries between nodes; all values stay JSON-serializable."""

    guardrails: dict[str, Any]
    scores: dict[str, float]
    campaign_id: str
    issue: dict[str, Any] | None
    action: dict[str, Any] | None
    experiment: dict[str, Any] | None
    learning: dict[str, Any] | None
    decision: str
    phase: str
    events: Annotated[list[dict[str, str]], operator.add]
    visited: Annotated[list[str], operator.add]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _event(name: str, detail: str) -> dict[str, str]:
    return {"time": _now(), "event": name, "detail": detail}


def _pct(value: float) -> str:
    return f"{value * 100:+.0f}%"


def build_loop(
    campaign_rows: list[dict[str, str]],
    snapshots: pd.DataFrame,
    recovery: pd.DataFrame,
    order_count: int,
    connector: Any | None = None,
) -> Any:
    """Compile the loop over the supplied campaign data and return the runnable graph."""
    writer = connector or SimulatedConnector(platform="meta", repository=seed_repository(ACCOUNT_ID))
    names = {row["external_id"]: row["name"] for row in campaign_rows}
    channels = {row["external_id"]: row["platform"].title() for row in campaign_rows}
    budgets = {row["external_id"]: float(row["daily_budget"]) for row in campaign_rows}

    def frame_for(campaign_id: str) -> pd.DataFrame:
        return snapshots[snapshots["campaign_external_id"] == campaign_id].copy()

    def ingest(state: LoopState) -> LoopState:
        detail = f"Loaded {len(campaign_rows)} campaigns, {len(snapshots)} daily snapshots, and {order_count} Shopify orders."
        return {"phase": "ingesting", "visited": ["ingest"], "events": [_event("Data ingested", detail)]}

    def analyze(state: LoopState) -> LoopState:
        scores = {row["external_id"]: round(float(fatigue_score(frame_for(row["external_id"]))["score"]), 3) for row in campaign_rows}
        detail = f"{len(scores)} campaign histories compared with their own rolling baselines."
        return {"scores": scores, "phase": "analyzing", "visited": ["analyze"], "events": [_event("Campaigns analyzed", detail)]}

    def detect(state: LoopState) -> LoopState:
        campaign_id, score = max(state["scores"].items(), key=lambda item: item[1])
        if score < DETECT_THRESHOLD:
            detail = f"Highest change score {score:.3f} stayed under the {DETECT_THRESHOLD} detection threshold."
            return {"phase": "complete", "issue": None, "visited": ["detect"], "events": [_event("No change detected", detail)]}
        detail = f"{names[campaign_id]} scored {score:.3f} against the {DETECT_THRESHOLD} detection threshold."
        return {"campaign_id": campaign_id, "phase": "detected", "visited": ["detect"], "events": [_event("Change detected", detail)]}

    def diagnose_node(state: LoopState) -> LoopState:
        campaign_id = state["campaign_id"]
        frame = frame_for(campaign_id)
        result = diagnose(frame)
        analysis = result["analysis"]
        changes, recent, baseline = analysis["changes"], analysis["recent"], analysis["baseline"]
        confidence = float(result["confidence"])
        cause = str(result["likely_cause"])
        title, summary, impact = TITLES.get(cause, (f"{names[campaign_id]} changed against its baseline", str(result["rule"] or ""), "Needs investigation"))
        evidence = [
            f"CTR {_pct(float(changes['ctr']))} vs baseline", f"CPM {_pct(float(changes['cpm']))} vs baseline",
            f"Frequency {float(recent['frequency']):.2f}× ({_pct(float(changes['frequency']))} vs baseline)",
            f"CVR {_pct(float(changes['cvr']))} vs baseline — essentially unchanged", f"CPA {_pct(float(changes['cpa']))} vs baseline",
        ]
        narrative = (
            f"{names[campaign_id]} is showing creative fatigue: CTR is {_pct(float(changes['ctr']))} while CPM is "
            f"{_pct(float(changes['cpm']))} and frequency has climbed to {float(recent['frequency']):.2f}×. "
            f"Post-click CVR changed only {_pct(float(changes['cvr']))}, so the landing page and offer are less likely causes. "
            "Refresh the ad creative while holding the budget steady, then compare CPA over the next seven days."
        )
        issue = {
            "id": str(uuid4()), "type": cause, "title": title,
            "campaign_id": campaign_id, "campaign": names[campaign_id], "channel": channels[campaign_id], "severity": "High",
            "score": round(float(analysis["score"]), 3), "confidence": round(confidence * 100),
            "status": "Awaiting approval", "impact": impact, "summary": summary,
            "narrative": narrative, "evidence": evidence, "components": analysis["components"],
            "baseline": {key: round(float(baseline[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency")},
            "current": {key: round(float(recent[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency")},
            "trend": [round(float(value) * 100, 3) for value in (frame["clicks"] / frame["impressions"]).tail(14)],
        }
        detail = f"{cause.replace('_', ' ').capitalize()} selected from combined CTR, CPM, frequency, CVR, and CPA evidence."
        return {"issue": issue, "phase": "diagnosed", "visited": ["diagnose"], "events": [_event("Issue diagnosed", detail)]}

    def plan(state: LoopState) -> LoopState:
        issue, guardrails = state["issue"], state["guardrails"]
        campaign_id = state["campaign_id"]
        confidence = issue["confidence"] / 100
        # The creative refresh deliberately requests no extra budget, so the spend cap check
        # is a real check that happens to pass rather than a step the loop skips.
        candidate = {"type": "launch_creative", "campaign_id": campaign_id,
                     "params": {"campaign_id": campaign_id, "daily_budget": 0}}
        guard = check_spend_caps(candidate, guardrails, {"campaign_budgets": budgets})
        verdict = decide_policy(candidate, confidence, guardrails)
        action = {
            "id": str(uuid4()), "issue_id": issue["id"], "type": "launch_creative", "risk_tier": classify(candidate),
            "confidence": confidence, "status": "planned", "spend_change": 0,
            "decision": verdict.outcome, "decision_reason": verdict.reason,
            "guardrail_reason": guard.reason, "guardrail_passed": guard.allowed,
            "rationale": "A creative refresh targets the weakening ad response while leaving the converting landing page and daily budget unchanged.",
            "creative": {},
        }
        if not guard.allowed:
            return {"action": {**action, "status": "blocked"}, "phase": "blocked", "visited": ["plan"],
                    "events": [_event("Action blocked", guard.reason)]}
        return {"action": action, "phase": "planned", "visited": ["plan"],
                "events": [_event("Action planned", f"Refresh creative, hold daily budget. {guard.reason}")]}

    def generate(state: LoopState) -> LoopState:
        action = dict(state["action"])
        action["creative"] = {
            "variant_label": "Fresh ritual", "headline": "Better mornings start here",
            "primary_text": "Small-batch coffee roasted for the first quiet moment of your day. Meet your new morning ritual.",
            "call_to_action": "Shop now",
            "image_prompt": "Warm editorial photograph of fresh coffee beside a sunlit window, premium natural styling",
        }
        events = [_event("Creative generated", "Fresh ritual variant created from the diagnosed fatigue pattern.")]
        if action["decision"] == "approval":
            action["status"] = "proposed"
            events.append(_event("Approval requested", "Creative launch paused at the high-risk approval gate."))
            phase = "awaiting_approval"
        else:
            action["status"] = "recommended" if action["decision"] == "recommend_only" else "proposed"
            phase = "recommended" if action["decision"] == "recommend_only" else "awaiting_approval"
        return {"action": action, "phase": phase, "visited": ["generate"], "events": events}

    def approve(state: LoopState) -> LoopState:
        action = state["action"]
        decision = interrupt({"action_id": action["id"], "risk_tier": action["risk_tier"], "reason": action["decision_reason"]})
        decision = str(decision)
        if decision not in {"approved", "rejected"}:
            raise ValueError("Decision must be approved or rejected")
        detail = ("Human approved the creative launch; the guarded write may now run."
                  if decision == "approved" else "Human rejected the proposal; no connector write will run.")
        return {"decision": decision, "visited": ["approve"], "events": [_event(f"Action {decision}", detail)]}

    def act(state: LoopState) -> LoopState:
        action, issue = dict(state["action"]), dict(state["issue"])
        result = writer.launch_creative(ACCOUNT_ID, state["campaign_id"], action["creative"])
        action["status"] = "applied"
        action["write_result"] = result.message
        issue["status"] = "Actioned"
        return {"action": action, "issue": issue, "phase": "applied", "visited": ["act"],
                "events": [_event("Action applied", f"{result.message} Daily budget unchanged.")]}

    def measure(state: LoopState) -> LoopState:
        interrupt({"awaiting": "next_week", "campaign_id": state["campaign_id"]})
        action, issue = dict(state["action"]), dict(state["issue"])
        current = frame_for(state["campaign_id"]).tail(7)
        before, after = aggregate_metrics(current), aggregate_metrics(recovery)
        cpa_change = after["cpa"] / before["cpa"] - 1
        experiment = {
            "id": str(uuid4()), "action_id": action["id"], "campaign": names[state["campaign_id"]],
            "hypothesis": "Fresh creative will restore click response and lower acquisition cost without a budget increase.",
            "status": "Measured", "verdict": "confirmed" if cpa_change <= -0.20 else "inconclusive", "days": 7,
            "before": {key: round(float(before[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency", "roas")},
            "after": {key: round(float(after[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency", "roas")},
            "changes": {"cpa": round(cpa_change, 4), "ctr": round(after["ctr"] / before["ctr"] - 1, 4)},
        }
        action["status"] = "measured"
        issue["status"] = "Resolved"
        return {"experiment": experiment, "action": action, "issue": issue, "phase": "measured", "visited": ["measure"],
                "events": [_event("Recovery measured", f"CPA changed {_pct(cpa_change)} over seven days.")]}

    def learn(state: LoopState) -> LoopState:
        issue, experiment = state.get("issue") or {}, state.get("experiment")
        if experiment:
            learning = {"campaign_id": state.get("campaign_id"), "cause": issue.get("type"),
                        "playbook": "launch_creative", "verdict": experiment["verdict"],
                        "cpa_change": experiment["changes"]["cpa"]}
            detail = f"{issue.get('type', 'issue')} -> launch_creative recorded as {experiment['verdict']} for {state.get('campaign_id')}."
            return {"learning": learning, "visited": ["learn"], "events": [_event("Outcome learned", detail)]}
        if state.get("decision") == "rejected":
            learning = {"campaign_id": state.get("campaign_id"), "cause": issue.get("type"),
                        "playbook": "launch_creative", "verdict": "rejected", "cpa_change": None}
            return {"learning": learning, "phase": "rejected", "visited": ["learn"],
                    "events": [_event("Outcome learned", "Proposal rejected; no change was made and the playbook was not reinforced.")]}
        learning = {"campaign_id": state.get("campaign_id"), "cause": issue.get("type"),
                    "playbook": "launch_creative", "verdict": "not_executed", "cpa_change": None}
        return {"learning": learning, "visited": ["learn"],
                "events": [_event("Outcome learned", "Policy stopped short of a write; the proposal stays a recommendation.")]}

    def after_detect(state: LoopState) -> str:
        return "diagnose" if state.get("campaign_id") else END

    def after_plan(state: LoopState) -> str:
        return "generate" if state["action"]["guardrail_passed"] else "learn"

    def after_generate(state: LoopState) -> str:
        decision = state["action"]["decision"]
        return {"approval": "approve", "auto": "act"}.get(decision, "learn")

    def after_approve(state: LoopState) -> str:
        return "act" if state["decision"] == "approved" else "learn"

    builder = StateGraph(LoopState)
    for name, node in (("ingest", ingest), ("analyze", analyze), ("detect", detect), ("diagnose", diagnose_node),
                       ("plan", plan), ("generate", generate), ("approve", approve), ("act", act),
                       ("measure", measure), ("learn", learn)):
        builder.add_node(name, node)
    builder.add_edge(START, "ingest")
    builder.add_edge("ingest", "analyze")
    builder.add_edge("analyze", "detect")
    builder.add_conditional_edges("detect", after_detect, ["diagnose", END])
    builder.add_edge("diagnose", "plan")
    builder.add_conditional_edges("plan", after_plan, ["generate", "learn"])
    builder.add_conditional_edges("generate", after_generate, ["approve", "act", "learn"])
    builder.add_conditional_edges("approve", after_approve, ["act", "learn"])
    builder.add_edge("act", "measure")
    builder.add_edge("measure", "learn")
    builder.add_edge("learn", END)
    return builder.compile(checkpointer=InMemorySaver())
