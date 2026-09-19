"""OpenAI structured-output wrapper with retries and strict numeric-evidence validation."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import time
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable, TypeVar

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

from .schemas import ActionProposal, ChatAnswer, CreativeVariant, DiagnosisNarrative


ROOT = Path(__file__).resolve().parents[3]
PROMPTS = Path(__file__).resolve().parent / "prompts"
SchemaT = TypeVar("SchemaT", bound=BaseModel)
NUMBER_PATTERN = re.compile(r"(?<![A-Za-z0-9_])[-+−]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d*\.\d+|\d+)(?![A-Za-z0-9_])")


class UnsupportedEvidenceError(ValueError):
    """Raised when model prose cites a number that was absent from its input."""

    def __init__(self, unsupported: list[str]):
        super().__init__("Model cited unsupported number(s): " + ", ".join(unsupported))
        self.unsupported = unsupported


def _decimal(value: str | int | float | Decimal) -> Decimal | None:
    try:
        return Decimal(str(value).replace(",", "").replace("−", "-"))
    except (InvalidOperation, ValueError):
        return None


def _input_numbers(value: Any) -> set[Decimal]:
    found: set[Decimal] = set()
    if isinstance(value, bool) or value is None:
        return found
    if isinstance(value, (int, float, Decimal)):
        number = _decimal(value)
        if number is not None:
            found.add(number)
            found.add(abs(number))
            if abs(number) <= 1:
                found.add(number * 100)
                found.add(abs(number * 100))
        return found
    if isinstance(value, str):
        for match in NUMBER_PATTERN.findall(value):
            number = _decimal(match)
            if number is not None:
                found.add(number)
        return found
    if isinstance(value, dict):
        for item in value.values():
            found.update(_input_numbers(item))
    elif isinstance(value, (list, tuple, set)):
        for item in value:
            found.update(_input_numbers(item))
    return found


def _output_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " ".join(_output_text(item) for item in value.values())
    if isinstance(value, (list, tuple, set)):
        return " ".join(_output_text(item) for item in value)
    return ""


def evidence_cited(output: BaseModel | str, input_metrics: dict[str, Any]) -> None:
    """Fail when any numeric claim in model-authored text is unsupported by input."""
    text = output if isinstance(output, str) else _output_text(output.model_dump())
    allowed = _input_numbers(input_metrics)
    unsupported = []
    for token in NUMBER_PATTERN.findall(text):
        number = _decimal(token)
        if number is None:
            continue
        if not any(abs(number - candidate) <= Decimal("0.01") for candidate in allowed):
            unsupported.append(token)
    if unsupported:
        raise UnsupportedEvidenceError(list(dict.fromkeys(unsupported)))


def _prompt(name: str) -> str:
    return (PROMPTS / f"{name}.md").read_text(encoding="utf-8")


class LLMClient:
    def __init__(self, client: OpenAI | None = None, model: str | None = None,
                 sleep: Callable[[float], None] = time.sleep):
        self.client = client or OpenAI()
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.sleep = sleep

    def _parse(self, prompt_name: str, payload: dict[str, Any], schema: type[SchemaT],
               temperature: float, validate_numbers: bool = False) -> SchemaT:
        messages = [
            {"role": "system", "content": _prompt(prompt_name)},
            {"role": "user", "content": json.dumps(payload, indent=2, sort_keys=True)},
        ]
        def request() -> SchemaT:
            last_error: Exception | None = None
            for attempt in range(3):
                try:
                    completion = self.client.chat.completions.parse(
                        model=self.model, messages=messages, response_format=schema, temperature=temperature,
                    )
                    parsed = completion.choices[0].message.parsed
                    if parsed is None:
                        refusal = completion.choices[0].message.refusal
                        raise RuntimeError(f"Model refused or returned no structured output: {refusal or 'unknown reason'}")
                    return parsed
                except Exception as exc:
                    last_error = exc
                    if attempt < 2:
                        self.sleep(2 ** attempt)
            raise RuntimeError("OpenAI structured-output request failed after 3 attempts") from last_error

        for evidence_attempt in range(2):
            parsed = request()
            if not validate_numbers:
                return parsed
            try:
                evidence_cited(parsed, payload)
                return parsed
            except UnsupportedEvidenceError as exc:
                if evidence_attempt == 1:
                    raise
                messages.append({"role": "assistant", "content": parsed.model_dump_json()})
                messages.append({"role": "system", "content": f"Revise the response. Remove unsupported numbers: {', '.join(exc.unsupported)}. Cite only numbers in the user JSON."})
        raise AssertionError("Unreachable evidence retry state")

    def diagnose(self, payload: dict[str, Any]) -> DiagnosisNarrative:
        return self._parse("diagnose", payload, DiagnosisNarrative, 0.2, validate_numbers=True)

    def plan(self, payload: dict[str, Any]) -> ActionProposal:
        return self._parse("plan", payload, ActionProposal, 0.2)

    def create(self, payload: dict[str, Any]) -> CreativeVariant:
        return self._parse("creative", payload, CreativeVariant, 0.8)

    def chat(self, payload: dict[str, Any]) -> ChatAnswer:
        return self._parse("chat", payload, ChatAnswer, 0.2, validate_numbers=True)


def load_demo_metrics() -> dict[str, Any]:
    """Derive the headline demo evidence from the generated campaign snapshots."""
    path = ROOT / "data" / "seed" / "snapshots.csv"
    with path.open(newline="", encoding="utf-8") as handle:
        rows = [row for row in csv.DictReader(handle) if row["campaign_external_id"] == "meta_prospecting"]
    if len(rows) != 30:
        raise RuntimeError("Expected 30 meta_prospecting seed snapshots; run generate_seed.py")
    baseline, current = rows[:18], rows[-1]
    total = lambda source, field: sum(float(row[field]) for row in source)
    baseline_ctr = total(baseline, "clicks") / total(baseline, "impressions")
    current_ctr = float(current["clicks"]) / float(current["impressions"])
    baseline_cpm = total(baseline, "spend") / total(baseline, "impressions") * 1000
    current_cpm = float(current["spend"]) / float(current["impressions"]) * 1000
    baseline_cvr = total(baseline, "conversions") / total(baseline, "clicks")
    current_cvr = float(current["conversions"]) / float(current["clicks"])
    cvr_change = current_cvr / baseline_cvr - 1
    return {
        "campaign": "meta_prospecting", "likely_cause": "creative_fatigue",
        "frequency": round(float(current["frequency"]), 1),
        "cpm_change_pct": round((current_cpm / baseline_cpm - 1) * 100),
        "ctr_change_pct": round((current_ctr / baseline_ctr - 1) * 100),
        "cvr_stable": abs(cvr_change) <= .05,
        "interpretation": "post-click conversion rate is unchanged",
    }


DEMO_METRICS = load_demo_metrics()


def _offline_demo() -> DiagnosisNarrative:
    narrative = DiagnosisNarrative(
        likely_cause="creative_fatigue",
        narrative=("Your prospecting ad is likely wearing out: frequency has reached about 3.8, while CPM is up 24% and CTR is down 31%. "
                   "The conversion rate after a click is unchanged, so the landing page and offer are less likely to be the problem. "
                   "Refreshing the ad is the clearest next test while keeping the existing offer in place."),
        evidence_cited=["Frequency 3.8", "CPM +24%", "CTR -31%", "Post-click conversion rate unchanged"],
        alternatives_ruled_out=["Landing page or offer: post-click conversion rate is unchanged."],
    )
    evidence_cited(narrative, DEMO_METRICS)
    return narrative


def main() -> None:
    parser = argparse.ArgumentParser(description="Campaign Autopilot structured-output client")
    parser.add_argument("--demo", action="store_true", help="diagnose the seeded creative-fatigue case")
    args = parser.parse_args()
    if not args.demo:
        parser.error("Use --demo for the Step 6 demonstration")
    load_dotenv(ROOT / ".env")
    # Confirm that the deterministic case remains compatible with the analytics diagnosis.
    if DEMO_METRICS["likely_cause"] != "creative_fatigue":
        raise RuntimeError("Demo input is not the seeded fatigue case")
    if os.getenv("OPENAI_API_KEY"):
        result = LLMClient().diagnose(DEMO_METRICS)
        source = "OpenAI structured output"
    else:
        result = _offline_demo()
        source = "deterministic preview (OPENAI_API_KEY is not configured)"
    print(f"Source: {source}")
    print(result.narrative)
    print("Evidence cited: " + "; ".join(result.evidence_cited))


if __name__ == "__main__":
    main()
