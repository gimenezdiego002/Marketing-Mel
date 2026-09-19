"""FastAPI boundary for the Journey Edge demo workflow and React dashboard."""

from __future__ import annotations

import os
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from demo_runtime import runtime


# Set WEB_ORIGIN to the deployed dashboard URL (comma-separated for more than one).
# The regex additionally covers any local Vite port and Vercel preview deployments.
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("WEB_ORIGIN", "").split(",") if origin.strip()]
ORIGIN_PATTERN = r"http://(127\.0\.0\.1|localhost):\d+|https://[\w.-]+\.vercel\.app"

app = FastAPI(title="Journey Edge agent API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ORIGIN_PATTERN,
    allow_methods=["*"], allow_headers=["*"],
)


class ApprovalRequest(BaseModel):
    decision: Literal["approved", "rejected"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class GuardrailUpdate(BaseModel):
    max_daily_spend: float = Field(gt=0)
    max_reallocation_pct: float = Field(ge=0, le=100)
    auto_pause_threshold: float = Field(ge=0)
    min_confidence: float = Field(ge=0, le=1)
    autonomy_level: Literal["recommend", "assisted", "auto"]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "simulation", "phase": runtime.phase}


@app.get("/api/state")
@app.get("/state/{thread_id}")
def state(thread_id: str | None = None) -> dict[str, Any]:
    if thread_id and thread_id != runtime.thread_id:
        raise HTTPException(status_code=404, detail="Demo thread not found")
    return runtime.state()


@app.get("/api/issues")
def issues() -> list[dict[str, Any]]:
    return runtime.state()["issues"]


@app.get("/api/issues/{issue_id}")
def issue(issue_id: str) -> dict[str, Any]:
    if not runtime.issue or runtime.issue["id"] != issue_id:
        raise HTTPException(status_code=404, detail="Issue not found")
    return runtime.issue


@app.get("/api/campaigns")
def campaigns() -> list[dict[str, Any]]:
    return runtime.campaign_metrics()


@app.get("/api/trends")
def trends() -> dict[str, Any]:
    return runtime.trends()


@app.get("/api/organic")
def organic() -> dict[str, Any]:
    return runtime.organic()


@app.get("/api/graph")
def graph() -> dict[str, Any]:
    """Expose the LangGraph node list and how far the current thread has walked it."""
    return runtime.graph_view()


@app.post("/api/agent/run")
@app.post("/run")
def run_agent() -> dict[str, Any]:
    return runtime.run()


@app.post("/api/approvals/{action_id}")
def approval(action_id: str, request: ApprovalRequest) -> dict[str, Any]:
    try:
        return runtime.decide(action_id, request.decision)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/approve")
def approve_compat(request: dict[str, str]) -> dict[str, Any]:
    return approval(request.get("action_id", ""), ApprovalRequest(decision=request.get("decision", "approved")))  # type: ignore[arg-type]


@app.post("/api/simulate-week")
@app.post("/simulate-week")
def simulate_week() -> dict[str, Any]:
    try:
        return runtime.simulate_week()
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/api/chat")
@app.post("/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    return runtime.chat(request.message)


@app.get("/api/guardrails")
def guardrails() -> dict[str, Any]:
    return dict(runtime.guardrails)


@app.put("/api/guardrails")
def update_guardrails(request: GuardrailUpdate) -> dict[str, Any]:
    return runtime.update_guardrails(request.model_dump())


@app.post("/api/reset")
def reset() -> dict[str, Any]:
    return runtime.reset()
