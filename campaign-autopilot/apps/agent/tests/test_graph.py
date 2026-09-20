"""Verify the LangGraph loop pauses, branches, and only writes after both gates pass."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import pandas as pd
import pytest
from langgraph.types import Command

from connectors.base import WriteResult
from graph import build_loop


ROOT = Path(__file__).resolve().parents[3]
SEED = ROOT / "data" / "seed"

BASE_GUARDRAILS = {
    "max_daily_spend": 750, "max_reallocation_pct": 15, "auto_pause_threshold": 2.0,
    "min_confidence": 0.7, "autonomy_level": "assisted",
}


class SpyConnector:
    """Stand in for the simulated connector so a test can prove no write happened."""

    def __init__(self) -> None:
        self.writes: list[dict[str, Any]] = []

    def launch_creative(self, account_id: str, campaign_id: str, creative: dict[str, Any]) -> WriteResult:
        self.writes.append({"campaign_id": campaign_id, "creative": creative})
        return WriteResult(True, "launch_creative", campaign_id, "Simulated launch_creative recorded.", True, {})


def _seed() -> tuple[list[dict[str, str]], pd.DataFrame, pd.DataFrame]:
    with (SEED / "campaigns.csv").open(encoding="utf-8", newline="") as handle:
        campaigns = list(csv.DictReader(handle))
    return campaigns, pd.read_csv(SEED / "snapshots.csv"), pd.read_csv(SEED / "week_after.csv")


def _loop(connector: Any, only: str | None = None, **overrides: Any):
    campaigns, snapshots, recovery = _seed()
    if only:
        campaigns = [row for row in campaigns if row["external_id"] == only]
        snapshots = snapshots[snapshots["campaign_external_id"] == only]
    loop = build_loop(campaigns, snapshots, recovery, 1300, connector=connector, llm=None)
    guardrails = {**BASE_GUARDRAILS, **overrides}
    return loop, {"guardrails": guardrails, "events": [], "visited": []}


@pytest.fixture
def config() -> dict[str, Any]:
    return {"configurable": {"thread_id": "test-thread"}}


def test_loop_pauses_at_approval_before_any_write(config: dict[str, Any]) -> None:
    spy = SpyConnector()
    loop, start = _loop(spy)
    loop.invoke(start, config)
    values = loop.get_state(config).values

    assert values["phase"] == "awaiting_approval"
    assert values["visited"] == ["ingest", "analyze", "detect", "diagnose", "plan", "generate"]
    assert values["action"]["status"] == "proposed"
    assert spy.writes == [], "the loop must not write before the human decides"


def test_approved_path_writes_once_then_waits_for_next_week(config: dict[str, Any]) -> None:
    spy = SpyConnector()
    loop, start = _loop(spy)
    loop.invoke(start, config)
    loop.invoke(Command(resume="approved"), config)
    values = loop.get_state(config).values

    assert values["phase"] == "applied"
    assert len(spy.writes) == 1
    assert spy.writes[0]["creative"]["variant_label"] == "Fresh ritual"
    assert "measure" not in values["visited"], "measure must wait for the next week of data"

    loop.invoke(Command(resume="next_week"), config)
    values = loop.get_state(config).values
    assert values["phase"] == "measured"
    assert values["experiment"]["verdict"] == "confirmed"
    assert values["learning"]["verdict"] == "confirmed"
    assert len(spy.writes) == 1, "measuring must not trigger a second write"


def test_rejected_proposal_never_reaches_the_connector(config: dict[str, Any]) -> None:
    spy = SpyConnector()
    loop, start = _loop(spy)
    loop.invoke(start, config)
    loop.invoke(Command(resume="rejected"), config)
    values = loop.get_state(config).values

    assert values["phase"] == "rejected"
    assert values["learning"]["verdict"] == "rejected"
    assert "act" not in values["visited"]
    assert spy.writes == []


def test_recommend_autonomy_stops_before_the_approval_gate(config: dict[str, Any]) -> None:
    spy = SpyConnector()
    loop, start = _loop(spy, autonomy_level="recommend")
    loop.invoke(start, config)
    values = loop.get_state(config).values

    assert values["action"]["decision"] == "recommend_only"
    assert values["action"]["status"] == "recommended"
    assert "approve" not in values["visited"]
    assert values["learning"]["verdict"] == "not_executed"
    assert spy.writes == []


def test_confidence_below_the_guardrail_downgrades_to_a_recommendation(config: dict[str, Any]) -> None:
    spy = SpyConnector()
    loop, start = _loop(spy, min_confidence=0.95)
    loop.invoke(start, config)
    values = loop.get_state(config).values

    assert values["action"]["decision"] == "recommend_only"
    assert "0.95" in values["action"]["decision_reason"]
    assert spy.writes == []


def test_healthy_account_ends_without_an_issue(config: dict[str, Any]) -> None:
    spy = SpyConnector()
    loop, start = _loop(spy, only="meta_retargeting")
    loop.invoke(start, config)
    values = loop.get_state(config).values

    assert values["phase"] == "complete"
    assert values["issue"] is None
    assert values["visited"] == ["ingest", "analyze", "detect"]
    assert spy.writes == []


def test_landing_page_diagnosis_does_not_say_creative_fatigue(config: dict[str, Any]) -> None:
    spy = SpyConnector()
    rows = [{"external_id": "lp_test", "name": "Landing Test", "platform": "meta", "daily_budget": "50"}]
    baseline = {"impressions": 10000, "clicks": 200, "spend": 110, "conversions": 6, "revenue": 340, "reach": 5000}
    recent = {"impressions": 10000, "clicks": 200, "spend": 110, "conversions": 3.6, "revenue": 205, "reach": 5000}
    snapshots = pd.DataFrame([
        {"date": f"2026-02-{day + 1:02d}", "campaign_external_id": "lp_test", **(recent if day >= 14 else baseline)}
        for day in range(21)
    ])
    loop = build_loop(rows, snapshots, snapshots.tail(7).copy(), 0, connector=spy, llm=None)
    loop.invoke({"guardrails": BASE_GUARDRAILS, "events": [], "visited": []}, config)
    issue = loop.get_state(config).values["issue"]
    assert issue["type"] == "landing_page_or_offer"
    text = issue["narrative"].lower()
    assert "creative fatigue" not in text
    assert "landing page" in text
    assert loop.get_state(config).values["action"]["creative"]["variant_label"] == "Clearer offer"


def test_generate_calls_injected_language_layer(config: dict[str, Any]) -> None:
    class RecordingLLM:
        def __init__(self) -> None:
            self.diagnose_calls: list[dict[str, Any]] = []
            self.create_calls: list[dict[str, Any]] = []

        def diagnose(self, payload: dict[str, Any]) -> Any:
            self.diagnose_calls.append(payload)
            raise RuntimeError("force fallback")

        def create(self, payload: dict[str, Any]) -> Any:
            self.create_calls.append(payload)
            raise RuntimeError("force fallback")

    spy = SpyConnector()
    llm = RecordingLLM()
    campaigns, snapshots, recovery = _seed()
    loop = build_loop(campaigns, snapshots, recovery, 1300, connector=spy, llm=llm)
    loop.invoke({"guardrails": BASE_GUARDRAILS, "events": [], "visited": []}, config)
    values = loop.get_state(config).values
    assert llm.diagnose_calls and llm.diagnose_calls[0]["likely_cause"] == "creative_fatigue"
    assert llm.create_calls and llm.create_calls[0]["likely_cause"] == "creative_fatigue"
    assert values["issue"]["type"] == "creative_fatigue"
    assert "creative fatigue" in values["issue"]["narrative"].lower()
    assert values["action"]["creative"]["variant_label"] == "Fresh ritual"
