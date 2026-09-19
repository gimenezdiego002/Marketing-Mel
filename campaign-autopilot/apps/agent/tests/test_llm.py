"""Verify schemas, temperatures, retries, and the no-invented-numbers evidence gate."""

from types import SimpleNamespace

import pytest

from llm.client import DEMO_METRICS, LLMClient, UnsupportedEvidenceError, _offline_demo, evidence_cited
from llm.schemas import CreativeVariant, DiagnosisNarrative


def diagnosis(number: str = "31") -> DiagnosisNarrative:
    return DiagnosisNarrative(
        likely_cause="creative_fatigue",
        narrative=f"CTR is down {number}% while frequency is 3.8.",
        evidence_cited=[f"CTR -{number}%", "Frequency 3.8"],
        alternatives_ruled_out=["Conversion rate is unchanged."],
    )


class FakeCompletions:
    def __init__(self, outputs: list[object]):
        self.outputs = iter(outputs)
        self.calls: list[dict[str, object]] = []

    def parse(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        output = next(self.outputs)
        if isinstance(output, Exception):
            raise output
        message = SimpleNamespace(parsed=output, refusal=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def fake_client(*outputs: object) -> tuple[object, FakeCompletions]:
    completions = FakeCompletions(list(outputs))
    return SimpleNamespace(chat=SimpleNamespace(completions=completions)), completions


def test_diagnosis_uses_schema_and_low_temperature() -> None:
    api, calls = fake_client(diagnosis())
    result = LLMClient(client=api, sleep=lambda _: None).diagnose(DEMO_METRICS)  # type: ignore[arg-type]
    assert result.likely_cause == "creative_fatigue"
    assert calls.calls[0]["response_format"] is DiagnosisNarrative
    assert calls.calls[0]["temperature"] == .2


def test_creative_uses_high_temperature() -> None:
    variant = CreativeVariant(variant_label="B", headline="Fresh coffee", primary_text="Brew a brighter cup.", call_to_action="Shop now", image_prompt="Coffee bag in morning light")
    api, calls = fake_client(variant)
    assert LLMClient(client=api, sleep=lambda _: None).create({"product": "coffee"}) == variant  # type: ignore[arg-type]
    assert calls.calls[0]["temperature"] == .8


def test_unsupported_number_retries_once_then_succeeds() -> None:
    api, calls = fake_client(diagnosis("99"), diagnosis())
    result = LLMClient(client=api, sleep=lambda _: None).diagnose(DEMO_METRICS)  # type: ignore[arg-type]
    assert "31%" in result.narrative
    assert len(calls.calls) == 2
    assert "unsupported numbers" in calls.calls[1]["messages"][-1]["content"].lower()  # type: ignore[index]


def test_unsupported_number_fails_loudly_after_one_retry() -> None:
    api, calls = fake_client(diagnosis("99"), diagnosis("98"))
    with pytest.raises(UnsupportedEvidenceError, match="98"):
        LLMClient(client=api, sleep=lambda _: None).diagnose(DEMO_METRICS)  # type: ignore[arg-type]
    assert len(calls.calls) == 2


def test_transient_errors_back_off() -> None:
    waits: list[float] = []
    api, calls = fake_client(RuntimeError("temporary"), RuntimeError("temporary"), diagnosis())
    LLMClient(client=api, sleep=waits.append).diagnose(DEMO_METRICS)  # type: ignore[arg-type]
    assert waits == [1, 2]
    assert len(calls.calls) == 3


def test_evidence_allows_percentage_rendering_of_ratio() -> None:
    evidence_cited("CTR is 2.4%.", {"ctr": .024})
    with pytest.raises(UnsupportedEvidenceError):
        evidence_cited("CTR is 4.2%.", {"ctr": .024})


def test_offline_demo_passes_evidence_gate() -> None:
    result = _offline_demo()
    assert all(fragment in result.narrative for fragment in ("3.8", "24%", "31%", "unchanged"))
