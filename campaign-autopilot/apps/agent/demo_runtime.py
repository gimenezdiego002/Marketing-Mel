"""Thread-scoped wrapper that drives the LangGraph loop and shapes its state for the API.

The workflow itself lives in graph.py. This module owns the seeded data, the mutable
guardrail row, and the read-only views (campaign table, trends, organic revenue) that
the dashboard reads outside the loop.
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd
from langgraph.types import Command

from analytics.metrics import aggregate_metrics, safe_divide
from graph import LOOP_NODES, build_loop


ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "data" / "seed"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(value: float) -> float | None:
    """Drop NaN so the JSON payload stays valid for the browser client."""
    return None if pd.isna(value) else round(float(value), 4)


class DemoRuntime:
    """Run the ingest-to-learn story without requiring external ad writes."""

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

    # ------------------------------------------------------------------ graph

    def _build(self) -> Any:
        return build_loop(self.campaign_rows, self.snapshots, self.recovery, len(self.orders))

    @property
    def _config(self) -> dict[str, Any]:
        return {"configurable": {"thread_id": self.thread_id}}

    def _values(self) -> dict[str, Any]:
        snapshot = self.loop.get_state(self._config)
        return dict(snapshot.values) if snapshot and snapshot.values else {}

    @property
    def phase(self) -> str:
        return str(self._values().get("phase", "ready"))

    @property
    def issue(self) -> dict[str, Any] | None:
        return self._values().get("issue")

    @property
    def action(self) -> dict[str, Any] | None:
        return self._values().get("action")

    @property
    def experiment(self) -> dict[str, Any] | None:
        return self._values().get("experiment")

    def reset(self) -> dict[str, Any]:
        """Start a fresh graph thread and a clean simulated ad account."""
        self.thread_id = str(uuid4())
        self.loop = self._build()
        self.base_events = [{"time": _now(), "event": "Demo reset", "detail": "Seed data restored; no external platform changed."}]
        return self.state()

    def run(self) -> dict[str, Any]:
        self.loop.invoke({"guardrails": dict(self.guardrails), "events": [], "visited": []}, self._config)
        return self.state()

    def decide(self, action_id: str, decision: str) -> dict[str, Any]:
        action = self.action
        if not action or action["id"] != action_id:
            raise KeyError("Action not found")
        if decision not in {"approved", "rejected"}:
            raise ValueError("Decision must be approved or rejected")
        if action["status"] != "proposed":
            raise ValueError("This action is no longer awaiting a decision")
        self.loop.invoke(Command(resume=decision), self._config)
        return self.state()

    def simulate_week(self) -> dict[str, Any]:
        action = self.action
        if not action or action["status"] != "applied":
            raise PermissionError("Approve and apply the creative before simulating the next week")
        self.loop.invoke(Command(resume="next_week"), self._config)
        return self.state()

    def graph_view(self) -> dict[str, Any]:
        """Describe the loop and how far the current thread has walked it."""
        values = self._values()
        visited = list(values.get("visited", []))
        return {
            "thread_id": self.thread_id, "phase": values.get("phase", "ready"),
            "nodes": [{"name": name, "status": "done" if name in visited else "pending"} for name in LOOP_NODES],
            "visited": visited,
            "interrupts": [
                {"node": "approve", "waits_for": "a human decision on the high-risk creative launch"},
                {"node": "measure", "waits_for": "the next week of campaign data to arrive"},
            ],
        }

    # ------------------------------------------------------------- read views

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
        values = self._values()
        return {
            "shopify_revenue": round(float(self.orders["total"].sum()), 2), "ad_spend": round(spend, 2),
            "blended_roas": round(revenue / spend, 2), "open_issues": 1 if values.get("issue") else 0,
            "phase": values.get("phase", "ready"), "thread_id": self.thread_id,
        }

    def trends(self) -> dict[str, Any]:
        """Daily account totals plus a per-campaign series, straight from the snapshots."""
        frame = self.snapshots.copy()
        frame["date"] = frame["date"].astype(str)
        grouped = frame.groupby("date")[["impressions", "clicks", "spend", "conversions", "revenue"]].sum()
        days = []
        for date, row in grouped.iterrows():
            days.append({
                "date": str(date), "spend": round(float(row["spend"]), 2), "revenue": round(float(row["revenue"]), 2),
                "roas": _clean(safe_divide(row["revenue"], row["spend"])),
                "ctr": _clean(safe_divide(row["clicks"], row["impressions"]) * 100),
                "cpa": _clean(safe_divide(row["spend"], row["conversions"])),
            })

        campaigns = []
        for campaign in self.campaign_rows:
            rows = frame[frame["campaign_external_id"] == campaign["external_id"]].sort_values("date")
            recent, prior = aggregate_metrics(rows.tail(7)), aggregate_metrics(rows.tail(14).head(7))
            series = [{"date": str(row["date"]),
                       "ctr": _clean(safe_divide(row["clicks"], row["impressions"]) * 100),
                       "cpa": _clean(safe_divide(row["spend"], row["conversions"]))}
                      for _, row in rows.iterrows()]
            campaigns.append({
                "id": campaign["external_id"], "name": campaign["name"], "channel": campaign["platform"].title(),
                "spend": round(float(rows["spend"].sum()), 2),
                "ctr_change": _clean(safe_divide(recent["ctr"], prior["ctr"]) - 1),
                "cpa_change": _clean(safe_divide(recent["cpa"], prior["cpa"]) - 1),
                "roas": _clean(recent["roas"]), "series": series,
            })
        window = f"{days[0]['date']} to {days[-1]['date']}" if days else ""
        return {"window": window, "days": days, "campaigns": campaigns}

    def organic(self) -> dict[str, Any]:
        """Split Shopify revenue into campaign-attributed and organic/direct orders."""
        orders = self.orders.copy()
        orders["date"] = orders["created_at"].astype(str).str.slice(0, 10)
        orders["source"] = orders["utm_campaign"].fillna("").replace("", "organic")
        names = {row["external_id"]: row["name"] for row in self.campaign_rows}

        organic = orders[orders["source"] == "organic"]
        attributed = orders[orders["source"] != "organic"]
        total_revenue = float(orders["total"].sum())
        organic_revenue = float(organic["total"].sum())

        daily = []
        for date, group in orders.groupby("date"):
            mask = group["source"] == "organic"
            daily.append({"date": str(date),
                          "organic": round(float(group.loc[mask, "total"].sum()), 2),
                          "attributed": round(float(group.loc[~mask, "total"].sum()), 2)})

        sources = []
        for source, group in orders.groupby("source"):
            revenue = float(group["total"].sum())
            sources.append({
                "source": "Organic / direct" if source == "organic" else names.get(str(source), str(source)),
                "channel": "Organic" if source == "organic" else str(source).split("_")[0].title(),
                "orders": int(len(group)), "revenue": round(revenue, 2),
                "share": round(revenue / total_revenue * 100, 1) if total_revenue else 0.0,
                "aov": round(revenue / len(group), 2) if len(group) else 0.0,
            })
        sources.sort(key=lambda item: item["revenue"], reverse=True)

        return {
            "organic_revenue": round(organic_revenue, 2), "organic_orders": int(len(organic)),
            "attributed_revenue": round(float(attributed["total"].sum()), 2), "attributed_orders": int(len(attributed)),
            "total_revenue": round(total_revenue, 2),
            "organic_share": round(organic_revenue / total_revenue * 100, 1) if total_revenue else 0.0,
            "organic_aov": round(organic_revenue / len(organic), 2) if len(organic) else 0.0,
            "organic_repeat_rate": round(float(organic["is_repeat"].mean()) * 100, 1) if len(organic) else 0.0,
            "daily": daily, "sources": sources,
        }

    # ------------------------------------------------------------------ misc

    def chat(self, message: str) -> dict[str, Any]:
        text = message.lower()
        issue, experiment = self.issue, self.experiment
        if "why" in text or "fatigue" in text:
            answer = issue["narrative"] if issue else "Run the agent first so I can answer from computed campaign evidence."
            evidence = issue["evidence"] if issue else []
        elif "spend" in text or "guardrail" in text:
            answer = f"The daily spend cap is ${self.guardrails['max_daily_spend']:.0f}. The proposed creative changes spend by $0 and still requires approval."
            evidence = [f"Maximum daily spend ${self.guardrails['max_daily_spend']:.0f}", "Proposed spend change $0"]
        elif "organic" in text:
            organic = self.organic()
            answer = (f"Organic and direct orders account for ${organic['organic_revenue']:,.0f} of "
                      f"${organic['total_revenue']:,.0f} in Shopify revenue, or {organic['organic_share']:.1f}%.")
            evidence = [f"{organic['organic_orders']} organic orders", f"Organic AOV ${organic['organic_aov']:.2f}"]
        elif "result" in text or "recover" in text:
            answer = "The experiment has not been measured yet." if not experiment else f"The recovery is confirmed: CPA moved from ${experiment['before']['cpa']:.2f} to ${experiment['after']['cpa']:.2f}."
            evidence = [] if not experiment else [f"CPA {experiment['changes']['cpa'] * 100:+.1f}%", "Seven-day recovery window"]
        else:
            answer, evidence = "I can explain the fatigue diagnosis, guardrails, spend, organic revenue, or measured recovery using the current demo data.", []
        return {"answer": answer, "evidence_cited": evidence, "limitations": ["Answers are restricted to loaded campaign and guardrail data."]}

    def update_guardrails(self, values: dict[str, Any]) -> dict[str, Any]:
        for field in self.guardrails:
            if field in values:
                self.guardrails[field] = values[field]
        return dict(self.guardrails)

    def state(self) -> dict[str, Any]:
        values = self._values()
        issue, action, experiment = values.get("issue"), values.get("action"), values.get("experiment")
        events = list(reversed(values.get("events", []))) + self.base_events
        return {"thread_id": self.thread_id, "phase": values.get("phase", "ready"), "overview": self.overview(),
                "campaigns": self.campaign_metrics(), "issues": [issue] if issue else [],
                "actions": [action] if action else [], "experiments": [experiment] if experiment else [],
                "guardrails": dict(self.guardrails), "events": events}


runtime = DemoRuntime()
