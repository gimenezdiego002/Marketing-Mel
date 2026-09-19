"""Select simulated or read-only real connectors from environment configuration."""

from __future__ import annotations

import os

from .base import AdPlatformConnector
from .google_ads import GoogleAdsConnector
from .meta import MetaConnector
from .simulated import SimulatedConnector, SimulationRepository


def simulation_enabled() -> bool:
    return os.getenv("SIMULATION_MODE", "true").strip().lower() not in {"false", "0", "no"}


def get_connector(platform: str, repository: SimulationRepository | None = None) -> AdPlatformConnector:
    normalized = platform.strip().lower()
    if normalized not in {"meta", "google"}:
        raise ValueError(f"Unsupported ad platform: {platform}")
    if simulation_enabled():
        return SimulatedConnector(normalized, repository)
    return MetaConnector() if normalized == "meta" else GoogleAdsConnector()
