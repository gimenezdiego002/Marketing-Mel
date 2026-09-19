"""Run and print the complete deterministic demo through the FastAPI boundary."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "agent"))

from main import app  # noqa: E402


def main() -> None:
    client = TestClient(app)
    client.post("/api/reset").raise_for_status()
    print("1. INGEST   - loaded 4 campaigns and 30 daily snapshots each")
    state = client.post("/api/agent/run").json()
    issue, action = state["issues"][0], state["actions"][0]
    print(f"2. DETECT   - {issue['type']} (fatigue score {issue['score']:.3f})")
    narrative = issue["narrative"].replace("×", "x").replace("—", "-")
    print(f"3. DIAGNOSE - {narrative}")
    print(f"4. GENERATE - {action['creative']['variant_label']}: {action['creative']['headline']}")
    print(f"5. APPROVE  - paused: {action['decision_reason']}")
    state = client.post(f"/api/approvals/{action['id']}", json={"decision": "approved"}).json()
    print(f"6. ACT      - {state['actions'][0]['status']}; spend change $0; simulated connector")
    state = client.post("/api/simulate-week").json()
    experiment = state["experiments"][0]
    print(f"7. MEASURE  - CPA ${experiment['before']['cpa']:.2f} -> ${experiment['after']['cpa']:.2f} ({experiment['changes']['cpa'] * 100:+.1f}%)")
    print(f"8. LEARN    - verdict: {experiment['verdict']}; workflow phase: {state['phase']}")


if __name__ == "__main__":
    main()
