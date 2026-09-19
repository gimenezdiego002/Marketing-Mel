"""Stable connector contract used by the graph for campaign reads and guarded writes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass(frozen=True)
class Campaign:
    id: str
    account_id: str
    platform: str
    external_id: str
    name: str
    objective: str | None
    status: str
    daily_budget: float | None


@dataclass(frozen=True)
class WriteResult:
    success: bool
    operation: str
    campaign_id: str
    message: str
    recorded: bool
    details: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class AdPlatformConnector(Protocol):
    def fetch_campaigns(self, account_id: str) -> list[Campaign]: ...

    def fetch_snapshots(self, campaign_id: str, limit: int = 30) -> list[dict[str, Any]]: ...

    def pause_ad(self, account_id: str, campaign_id: str) -> WriteResult: ...

    def set_budget(self, account_id: str, campaign_id: str, daily_budget: float) -> WriteResult: ...

    def launch_creative(self, account_id: str, campaign_id: str, creative: dict[str, Any]) -> WriteResult: ...
