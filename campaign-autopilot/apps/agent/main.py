"""HTTP boundary for the Journey Edge dashboard; returns only seeded or server-side data."""

from __future__ import annotations

import csv
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from analytics.metrics import aggregate_metrics

ROOT = Path(__file__).resolve().parents[2]
app = FastAPI(title="Journey Edge agent API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])


def _rows() -> tuple[list[dict[str, str]], pd.DataFrame]:
    """Load reproducible demo data; production reads will use the server-only repository."""
    with (ROOT / "data" / "seed" / "campaigns.csv").open(encoding="utf-8", newline="") as file:
        campaigns = list(csv.DictReader(file))
    snapshots = pd.read_csv(ROOT / "data" / "seed" / "snapshots.csv")
    return campaigns, snapshots


def _issues() -> list[dict[str, object]]:
    """Build the UI issue feed from the known seeded Brew & Bloom scenarios."""
    return [
        {"id": "creative-fatigue", "title": "Creative fatigue is reducing prospecting efficiency", "campaign": "Meta Prospecting", "channel": "Meta", "severity": "High", "confidence": 92, "status": "Awaiting approval", "impact": "Estimated $1,240 monthly recovery", "summary": "Frequency has risen while CTR fell below its rolling baseline.", "evidence": ["CTR decline and rising CPM are derived from the seeded snapshots", "Frequency is 3.8 in the latest scenario", "Conversion rate is unchanged, pointing away from landing-page failure"]},
        {"id": "retargeting-scale", "title": "Room to scale a healthy retargeting campaign", "campaign": "Meta Retargeting", "channel": "Meta", "severity": "Low", "confidence": 86, "status": "Diagnosed", "impact": "Estimated +$530 monthly revenue", "summary": "ROAS is consistently above target with spare budget capacity.", "evidence": ["ROAS is calculated from seeded revenue and spend", "Budget utilization is evaluated by the agent policy"]},
        {"id": "email-clicks", "title": "Welcome-flow clicks are trending down", "campaign": "Klaviyo Welcome Flow", "channel": "Email", "severity": "Medium", "confidence": 76, "status": "New", "impact": "Needs investigation", "summary": "Open rate remains steady but click-through rate is declining.", "evidence": ["Email sends, opens, and clicks come from seeded snapshots"]},
    ]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "seed"}


@app.get("/api/issues")
def issues() -> list[dict[str, object]]:
    return _issues()


@app.get("/api/campaigns")
def campaigns() -> list[dict[str, object]]:
    campaign_rows, snapshots = _rows()
    response = []
    for campaign in campaign_rows:
        frame = snapshots.loc[snapshots["campaign_external_id"] == campaign["external_id"]]
        metrics = aggregate_metrics(frame)
        response.append({"id": campaign["external_id"], "name": campaign["name"], "channel": campaign["platform"].title(), "spend": round(metrics["spend"], 2), "revenue": round(metrics["revenue"], 2), "roas": round(metrics["roas"], 2) if pd.notna(metrics["roas"]) else None})
    return response


@app.post("/api/actions/{issue_id}/approve")
def approve(issue_id: str) -> dict[str, object]:
    if issue_id != "creative-fatigue":
        raise HTTPException(status_code=404, detail="Only the seeded creative-fatigue action is available in demo mode.")
    return {"issue_id": issue_id, "status": "approved", "simulated": True, "message": "Approval recorded for the local demo; no ad platform was changed."}
