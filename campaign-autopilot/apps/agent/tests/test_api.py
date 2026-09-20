"""Exercise the complete browser-facing demo loop through FastAPI."""

from fastapi.testclient import TestClient

from main import app


def test_demo_api_runs_approval_and_measured_recovery() -> None:
    client = TestClient(app)
    assert client.post("/api/reset").json()["phase"] == "ready"

    run = client.post("/api/agent/run")
    assert run.status_code == 200
    state = run.json()
    assert state["phase"] == "awaiting_approval"
    assert state["issues"][0]["type"] == "creative_fatigue"
    assert "CVR" in state["issues"][0]["narrative"]

    action_id = state["actions"][0]["id"]
    approval = client.post(f"/api/approvals/{action_id}", json={"decision": "approved"})
    assert approval.status_code == 200
    assert approval.json()["actions"][0]["status"] == "applied"

    measured = client.post("/api/simulate-week")
    assert measured.status_code == 200
    result = measured.json()["experiments"][0]
    assert result["verdict"] == "confirmed"
    assert result["changes"]["cpa"] == -0.2806


def test_simulation_requires_approval() -> None:
    client = TestClient(app)
    client.post("/api/reset")
    assert client.post("/api/simulate-week").status_code == 409


def test_trends_expose_thirty_days_and_a_series_per_campaign() -> None:
    client = TestClient(app)
    payload = client.get("/api/trends").json()

    assert len(payload["days"]) == 30
    assert payload["window"] == "2026-08-01 to 2026-08-30"
    assert {row["id"] for row in payload["campaigns"]} == {
        "meta_prospecting", "meta_retargeting", "google_brand_search", "klaviyo_welcome_flow"
    }
    prospecting = next(row for row in payload["campaigns"] if row["id"] == "meta_prospecting")
    assert len(prospecting["series"]) == 30
    assert prospecting["cpa_change"] > 0, "the fatigued campaign got more expensive"
    # Klaviyo records no spend, so its CPA is null rather than an invented zero.
    assert next(row for row in payload["campaigns"] if row["id"] == "klaviyo_welcome_flow")["cpa_change"] is None


def test_organic_splits_shopify_revenue_by_attribution() -> None:
    client = TestClient(app)
    payload = client.get("/api/organic").json()

    assert payload["organic_orders"] + payload["attributed_orders"] == 1300
    assert round(payload["organic_revenue"] + payload["attributed_revenue"], 2) == payload["total_revenue"]
    assert 0 < payload["organic_share"] < 100
    assert len(payload["daily"]) == 30
    assert payload["sources"][0]["revenue"] >= payload["sources"][-1]["revenue"]
    assert any(row["source"] == "Organic / direct" for row in payload["sources"])


def test_graph_view_reports_the_loop_and_its_two_interrupts() -> None:
    client = TestClient(app)
    client.post("/api/reset")
    fresh = client.get("/api/graph").json()
    assert [node["name"] for node in fresh["nodes"]] == [
        "ingest", "analyze", "detect", "diagnose", "plan", "generate", "approve", "act", "measure", "learn"
    ]
    assert all(node["status"] == "pending" for node in fresh["nodes"])
    assert {item["node"] for item in fresh["interrupts"]} == {"approve", "measure"}

    client.post("/api/agent/run")
    paused = client.get("/api/graph").json()
    assert paused["visited"] == ["ingest", "analyze", "detect", "diagnose", "plan", "generate"]
    assert next(node["status"] for node in paused["nodes"] if node["name"] == "approve") == "pending"


def _defaults(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "max_daily_spend": 750, "max_reallocation_pct": 15, "auto_pause_threshold": 2.0,
        "min_confidence": 0.7, "autonomy_level": "assisted",
    }
    values.update(overrides)
    return values


def test_recommend_autonomy_stops_before_a_write() -> None:
    client = TestClient(app)
    client.post("/api/reset")
    client.put("/api/guardrails", json=_defaults(autonomy_level="recommend"))
    state = client.post("/api/agent/run").json()
    assert state["phase"] == "recommended"
    assert state["actions"][0]["status"] == "recommended"
    assert state["actions"][0]["decision"] == "recommend_only"
    assert client.post("/api/simulate-week").status_code == 409


def test_spend_cap_below_current_budgets_blocks_the_write() -> None:
    client = TestClient(app)
    client.post("/api/reset")
    client.put("/api/guardrails", json=_defaults(max_daily_spend=100))
    state = client.post("/api/agent/run").json()
    assert state["phase"] == "blocked"
    assert state["actions"][0]["status"] == "blocked"
    assert state["actions"][0]["guardrail_passed"] is False
    assert "100" in state["actions"][0]["guardrail_reason"]
    assert client.post("/api/simulate-week").status_code == 409


def test_high_confidence_floor_downgrades_to_a_recommendation() -> None:
    client = TestClient(app)
    client.post("/api/reset")
    client.put("/api/guardrails", json=_defaults(min_confidence=0.95))
    state = client.post("/api/agent/run").json()
    assert state["actions"][0]["decision"] == "recommend_only"
    assert state["phase"] == "recommended"


def test_auto_autonomy_still_pauses_for_high_risk_creative() -> None:
    client = TestClient(app)
    client.post("/api/reset")
    client.put("/api/guardrails", json=_defaults(autonomy_level="auto"))
    state = client.post("/api/agent/run").json()
    assert state["phase"] == "awaiting_approval"
    assert state["actions"][0]["status"] == "proposed"
