"""Pydantic response contracts that make every model output safe to store and render."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DiagnosisNarrative(StrictModel):
    likely_cause: str = Field(description="Rule-selected likely cause; do not replace it with a new diagnosis.")
    narrative: str = Field(description="A plain-English explanation for the store owner in 3–4 sentences.")
    evidence_cited: list[str] = Field(description="Human-readable metric evidence copied from the supplied input.")
    alternatives_ruled_out: list[str] = Field(description="Alternative causes and why the supplied evidence makes them less likely.")


class ActionProposal(StrictModel):
    action_type: Literal["pause", "reallocate", "launch_creative", "change_budget"]
    rationale: str
    expected_effect: str
    confidence: float = Field(ge=0, le=1)
    params: dict[str, Any]


class CreativeVariant(StrictModel):
    variant_label: str
    headline: str
    primary_text: str
    call_to_action: str
    image_prompt: str


class ChatAnswer(StrictModel):
    answer: str
    evidence_cited: list[str]
    limitations: list[str] = Field(default_factory=list)
