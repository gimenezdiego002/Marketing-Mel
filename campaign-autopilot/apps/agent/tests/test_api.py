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
