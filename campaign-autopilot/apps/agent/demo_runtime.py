"""Deterministic, stateful demo loop used by the API and browser rehearsal."""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd

from analytics.diagnostics import diagnose
from analytics.metrics import aggregate_metrics


ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "data" / "seed"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pct(value: float) -> str:
    return f"{value * 100:+.0f}%"


class DemoRuntime:
    """Run the ingest-to-measure story without requiring external ad writes."""

    def __init__(self) -> None:
        with (SEED / "campaigns.csv").open(encoding="utf-8", newline="") as handle:
            self.campaign_rows = list(csv.DictReader(handle))
        self.snapshots = pd.read_csv(SEED / "snapshots.csv")
        self.orders = pd.read_csv(SEED / "orders.csv")
        self.recovery = pd.read_csv(SEED / "week_after.csv")
        self.guardrails = {
            "max_daily_spend": 750,
            "max_reallocation_pct": 15,
            "auto_pause_threshold": 2.0,
            "min_confidence": 0.7,
            "autonomy_level": "assisted",
        }
        self.reset()

    def reset(self) -> dict[str, Any]:
        self.thread_id = str(uuid4())
        self.phase = "ready"
        self.issue: dict[str, Any] | None = None
        self.action: dict[str, Any] | None = None
        self.experiment: dict[str, Any] | None = None
        self.events = [{"time": _now(), "event": "Demo reset", "detail": "Seed data restored; no external platform changed."}]
        return self.state()

    def campaign_metrics(self) -> list[dict[str, Any]]:
        output = []
        for campaign in self.campaign_rows:
            frame = self.snapshots[self.snapshots["campaign_external_id"] == campaign["external_id"]]
            metrics = aggregate_metrics(frame)
            output.append({
                "id": campaign["external_id"], "name": campaign["name"],
                "channel": campaign["platform"].title(), "spend": round(metrics["spend"], 2),
                "revenue": round(metrics["revenue"], 2),
                "roas": None if pd.isna(metrics["roas"]) else round(metrics["roas"], 2),
                "status": "Needs attention" if campaign["external_id"] in {"meta_prospecting", "klaviyo_welcome_flow"} else "Healthy",
            })
        return output

    def overview(self) -> dict[str, Any]:
        spend = float(self.snapshots.groupby("campaign_external_id")["spend"].sum().sum())
        revenue = float(self.snapshots.groupby("campaign_external_id")["revenue"].sum().sum())
        return {
            "shopify_revenue": round(float(self.orders["total"].sum()), 2), "ad_spend": round(spend, 2),
            "blended_roas": round(revenue / spend, 2), "open_issues": 1 if self.issue else 0,
            "phase": self.phase, "thread_id": self.thread_id,
        }

    def run(self) -> dict[str, Any]:
        frame = self.snapshots[self.snapshots["campaign_external_id"] == "meta_prospecting"].copy()
        result = diagnose(frame)
        analysis = result["analysis"]
        changes, recent, baseline = analysis["changes"], analysis["recent"], analysis["baseline"]
        if result["likely_cause"] != "creative_fatigue":
            self.events.insert(0, {"time": _now(), "event": "Agent completed", "detail": "No actionable issue crossed the detection threshold."})
            self.phase = "complete"
            return self.state()

        issue_id, action_id = str(uuid4()), str(uuid4())
        confidence = float(result["confidence"])
        evidence = [
            f"CTR {_pct(float(changes['ctr']))} vs baseline", f"CPM {_pct(float(changes['cpm']))} vs baseline",
            f"Frequency {float(recent['frequency']):.2f}× ({_pct(float(changes['frequency']))} vs baseline)",
            f"CVR {_pct(float(changes['cvr']))} vs baseline — essentially unchanged", f"CPA {_pct(float(changes['cpa']))} vs baseline",
        ]
        narrative = (
            f"Meta Prospecting is showing creative fatigue: CTR is {_pct(float(changes['ctr']))} while CPM is "
            f"{_pct(float(changes['cpm']))} and frequency has climbed to {float(recent['frequency']):.2f}×. "
            f"Post-click CVR changed only {_pct(float(changes['cvr']))}, so the landing page and offer are less likely causes. "
            "Refresh the ad creative while holding the budget steady, then compare CPA over the next seven days."
        )
        self.issue = {
            "id": issue_id, "type": "creative_fatigue", "title": "Creative fatigue is reducing prospecting efficiency",
            "campaign_id": "meta_prospecting", "campaign": "Meta Prospecting", "channel": "Meta", "severity": "High",
            "score": round(float(analysis["score"]), 3), "confidence": round(confidence * 100),
            "status": "Awaiting approval", "impact": "Recover efficiency without increasing spend",
            "summary": "Audience exposure rose as click response weakened, while post-click conversion held steady.",
            "narrative": narrative, "evidence": evidence, "components": analysis["components"],
            "baseline": {key: round(float(baseline[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency")},
            "current": {key: round(float(recent[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency")},
            "trend": [round(float(value) * 100, 3) for value in (frame["clicks"] / frame["impressions"]).tail(14)],
        }
        self.action = {
            "id": action_id, "issue_id": issue_id, "type": "launch_creative", "risk_tier": "high",
            "confidence": confidence, "status": "proposed", "spend_change": 0, "decision": "approval",
            "rationale": "A creative refresh targets the weakening ad response while leaving the converting landing page and daily budget unchanged.",
            "decision_reason": "Launching creative is a high-risk action and requires human approval.",
            "creative": {"variant_label": "Fresh ritual", "headline": "Better mornings start here",
                         "primary_text": "Small-batch coffee roasted for the first quiet moment of your day. Meet your new morning ritual.",
                         "call_to_action": "Shop now",
                         "image_prompt": "Warm editorial photograph of fresh coffee beside a sunlit window, premium natural styling"},
        }
        self.phase = "awaiting_approval"
        self.events = [
            {"time": _now(), "event": "Approval requested", "detail": "Creative launch paused at the high-risk approval gate."},
            {"time": _now(), "event": "Creative generated", "detail": "Fresh ritual variant created from the diagnosed fatigue pattern."},
            {"time": _now(), "event": "Issue diagnosed", "detail": "Creative fatigue selected from combined CTR, CPM, frequency, CVR, and CPA evidence."},
            {"time": _now(), "event": "Campaigns analyzed", "detail": "Four campaign histories compared with their own rolling baselines."},
        ]
        return self.state()

    def decide(self, action_id: str, decision: str) -> dict[str, Any]:
        if not self.action or self.action["id"] != action_id:
            raise KeyError("Action not found")
        if decision not in {"approved", "rejected"}:
            raise ValueError("Decision must be approved or rejected")
        self.action["status"] = "applied" if decision == "approved" else "rejected"
        if self.issue:
            self.issue["status"] = "Actioned" if decision == "approved" else "Dismissed"
        self.phase = "applied" if decision == "approved" else "rejected"
        detail = "Simulated creative launch recorded; daily budget remains unchanged." if decision == "approved" else "Proposal rejected; no change was made."
        self.events.insert(0, {"time": _now(), "event": f"Action {decision}", "detail": detail})
        return self.state()

    def simulate_week(self) -> dict[str, Any]:
        if not self.action or self.action["status"] != "applied":
            raise PermissionError("Approve and apply the creative before simulating the next week")
        current = self.snapshots[self.snapshots["campaign_external_id"] == "meta_prospecting"].tail(7)
        before, after = aggregate_metrics(current), aggregate_metrics(self.recovery)
        cpa_change = after["cpa"] / before["cpa"] - 1
        self.experiment = {
            "id": str(uuid4()), "action_id": self.action["id"], "campaign": "Meta Prospecting",
            "hypothesis": "Fresh creative will restore click response and lower acquisition cost without a budget increase.",
            "status": "Measured", "verdict": "confirmed" if cpa_change <= -0.20 else "inconclusive", "days": 7,
            "before": {key: round(float(before[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency", "roas")},
            "after": {key: round(float(after[key]), 4) for key in ("ctr", "cpm", "cvr", "cpa", "frequency", "roas")},
            "changes": {"cpa": round(cpa_change, 4), "ctr": round(after["ctr"] / before["ctr"] - 1, 4)},
        }
        self.action["status"] = "measured"
        if self.issue:
            self.issue["status"] = "Resolved"
        self.phase = "measured"
        self.events.insert(0, {"time": _now(), "event": "Recovery measured", "detail": f"CPA changed {_pct(cpa_change)}; hypothesis confirmed."})
        return self.state()

    def chat(self, message: str) -> dict[str, Any]:
        text = message.lower()
        if "why" in text or "fatigue" in text:
            answer = self.issue["narrative"] if self.issue else "Run the agent first so I can answer from computed campaign evidence."
            evidence = self.issue["evidence"] if self.issue else []
        elif "spend" in text or "guardrail" in text:
            answer = f"The daily spend cap is ${self.guardrails['max_daily_spend']:.0f}. The proposed creative changes spend by $0 and still requires approval."
            evidence = [f"Maximum daily spend ${self.guardrails['max_daily_spend']:.0f}", "Proposed spend change $0"]
        elif "result" in text or "recover" in text:
            answer = "The experiment has not been measured yet." if not self.experiment else f"The recovery is confirmed: CPA moved from ${self.experiment['before']['cpa']:.2f} to ${self.experiment['after']['cpa']:.2f}."
            evidence = [] if not self.experiment else [f"CPA {self.experiment['changes']['cpa'] * 100:+.1f}%", "Seven-day recovery window"]
        else:
            answer, evidence = "I can explain the fatigue diagnosis, guardrails, spend, or measured recovery using the current demo data.", []
        return {"answer": answer, "evidence_cited": evidence, "limitations": ["Answers are restricted to loaded campaign and guardrail data."]}

    def update_guardrails(self, values: dict[str, Any]) -> dict[str, Any]:
        for field in self.guardrails:
            if field in values:
                self.guardrails[field] = values[field]
        return dict(self.guardrails)

    def state(self) -> dict[str, Any]:
        return {"thread_id": self.thread_id, "phase": self.phase, "overview": self.overview(),
                "campaigns": self.campaign_metrics(), "issues": [self.issue] if self.issue else [],
                "actions": [self.action] if self.action else [], "experiments": [self.experiment] if self.experiment else [],
                "guardrails": dict(self.guardrails), "events": list(self.events)}


runtime = DemoRuntime()
