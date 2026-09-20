"""HTTP boundary for the Journey Edge dashboard; every mutation returns DemoState."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from demo_runtime import runtime

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI(title="Journey Edge agent API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


class GuardrailsBody(BaseModel):
    max_daily_spend: float = Field(ge=0)
    max_reallocation_pct: float = Field(ge=0)
    auto_pause_threshold: float = Field(ge=0)
    min_confidence: float = Field(ge=0, le=1)
    autonomy_level: Literal["recommend", "assisted", "auto"]


class DecisionBody(BaseModel):
    decision: Literal["approved", "rejected"]


class ChatBody(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


@app.exception_handler(KeyError)
def missing(request: Request, exc: KeyError) -> JSONResponse:
    return JSONResponse({"detail": str(exc) or "Not found"}, status_code=404)


@app.exception_handler(ValueError)
def bad_request(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse({"detail": str(exc)}, status_code=400)


@app.exception_handler(PermissionError)
def conflict(request: Request, exc: PermissionError) -> JSONResponse:
    return JSONResponse({"detail": str(exc)}, status_code=409)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "simulation", "phase": runtime.phase}


@app.get("/api/state")
def state() -> dict:
    return runtime.state()


@app.get("/api/trends")
def trends() -> dict:
    return runtime.trends()


@app.get("/api/organic")
def organic() -> dict:
    return runtime.organic()


@app.get("/api/graph")
def graph() -> dict:
    return runtime.graph_view()


@app.get("/api/guardrails")
def get_guardrails() -> dict:
    return runtime.guardrails


@app.put("/api/guardrails")
def put_guardrails(body: GuardrailsBody) -> dict:
    return runtime.update_guardrails(body.model_dump())


@app.post("/api/agent/run")
def run_agent() -> dict:
    return runtime.run()


@app.post("/api/approvals/{action_id}")
def approve(action_id: str, body: DecisionBody) -> dict:
    try:
        return runtime.decide(action_id, body.decision)
    except KeyError:
        raise HTTPException(status_code=404, detail="Action not found") from None


@app.post("/api/simulate-week")
def simulate_week() -> dict:
    return runtime.simulate_week()


@app.post("/api/reset")
def reset() -> dict:
    return runtime.reset()


@app.post("/api/chat")
def chat(body: ChatBody) -> dict:
    return runtime.chat(body.message)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "journey-edge-agent", "docs": "/docs", "health": "/health"}
