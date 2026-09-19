"""Supabase-backed simulated ad connector with deterministic next-week generation."""

from __future__ import annotations

import csv
import hashlib
import os
import random
from collections.abc import Iterable
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Protocol

from .base import Campaign, WriteResult


ROOT = Path(__file__).resolve().parents[3]
RECOVERY_FILE = ROOT / "data" / "seed" / "week_after.csv"


class SimulationRepository(Protocol):
    def campaigns(self, account_id: str, platform: str | None = None) -> list[dict[str, Any]]: ...
    def snapshots(self, campaign_id: str, limit: int = 30) -> list[dict[str, Any]]: ...
    def insert_snapshots(self, rows: list[dict[str, Any]]) -> None: ...
    def update_campaign(self, campaign_id: str, values: dict[str, Any]) -> None: ...
    def record_write(self, account_id: str, event: str, payload: dict[str, Any], rationale: str) -> None: ...
    def creative_launched(self, account_id: str, campaign_id: str) -> bool: ...


class SupabaseSimulationRepository:
    """Persist simulated reads and writes in the Step 1 schema."""

    def __init__(self, client: Any):
        self.client = client

    @classmethod
    def from_env(cls) -> "SupabaseSimulationRepository":
        from supabase import create_client
        url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for simulated DB operations")
        return cls(create_client(url, key))

    def campaigns(self, account_id: str, platform: str | None = None) -> list[dict[str, Any]]:
        query = self.client.table("campaigns").select("*").eq("account_id", account_id)
        if platform:
            query = query.eq("platform", platform)
        return query.order("name").execute().data

    def snapshots(self, campaign_id: str, limit: int = 30) -> list[dict[str, Any]]:
        data = (self.client.table("campaign_snapshots").select("*").eq("campaign_id", campaign_id)
                .order("date", desc=True).limit(limit).execute().data)
        return list(reversed(data))

    def insert_snapshots(self, rows: list[dict[str, Any]]) -> None:
        self.client.table("campaign_snapshots").upsert(rows, on_conflict="campaign_id,date").execute()

    def update_campaign(self, campaign_id: str, values: dict[str, Any]) -> None:
        self.client.table("campaigns").update(values).eq("id", campaign_id).execute()

    def record_write(self, account_id: str, event: str, payload: dict[str, Any], rationale: str) -> None:
        self.client.table("audit_log").insert({"account_id": account_id, "actor": "agent", "event": event,
                                                "payload": payload, "rationale": rationale}).execute()

    def creative_launched(self, account_id: str, campaign_id: str) -> bool:
        result = (self.client.table("audit_log").select("id").eq("account_id", account_id)
                  .eq("event", "simulated.launch_creative").contains("payload", {"campaign_id": campaign_id})
                  .limit(1).execute().data)
        return bool(result)


class InMemorySimulationRepository:
    """Small verification repository with the same behavior as the Supabase adapter."""

    def __init__(self, campaigns: Iterable[dict[str, Any]], snapshots: Iterable[dict[str, Any]]):
        self.campaign_rows = [dict(row) for row in campaigns]
        self.snapshot_rows = [dict(row) for row in snapshots]
        self.audit_rows: list[dict[str, Any]] = []

    def campaigns(self, account_id: str, platform: str | None = None) -> list[dict[str, Any]]:
        return [dict(row) for row in self.campaign_rows if row["account_id"] == account_id and (not platform or row["platform"] == platform)]

    def snapshots(self, campaign_id: str, limit: int = 30) -> list[dict[str, Any]]:
        found = sorted((row for row in self.snapshot_rows if row["campaign_id"] == campaign_id), key=lambda row: row["date"])
        return [dict(row) for row in found[-limit:]]

    def insert_snapshots(self, rows: list[dict[str, Any]]) -> None:
        for row in rows:
            existing = next((item for item in self.snapshot_rows if item["campaign_id"] == row["campaign_id"] and item["date"] == row["date"]), None)
            if existing:
                existing.update(row)
            else:
                self.snapshot_rows.append(dict(row))

    def update_campaign(self, campaign_id: str, values: dict[str, Any]) -> None:
        next(row for row in self.campaign_rows if row["id"] == campaign_id).update(values)

    def record_write(self, account_id: str, event: str, payload: dict[str, Any], rationale: str) -> None:
        self.audit_rows.append({"account_id": account_id, "event": event, "payload": payload, "rationale": rationale})

    def creative_launched(self, account_id: str, campaign_id: str) -> bool:
        return any(row["account_id"] == account_id and row["event"] == "simulated.launch_creative"
                   and row["payload"].get("campaign_id") == campaign_id for row in self.audit_rows)


def seed_repository(account_id: str = "seed-account") -> InMemorySimulationRepository:
    """Load generated CSVs for connector verification without bypassing the production repository interface."""
    with (ROOT / "data" / "seed" / "campaigns.csv").open(newline="", encoding="utf-8") as handle:
        campaigns = [{**row, "id": row["external_id"], "account_id": account_id,
                      "daily_budget": float(row["daily_budget"])} for row in csv.DictReader(handle)]
    campaign_ids = {row["external_id"]: row["id"] for row in campaigns}
    with (ROOT / "data" / "seed" / "snapshots.csv").open(newline="", encoding="utf-8") as handle:
        snapshots = []
        for row in csv.DictReader(handle):
            external_id = row.pop("campaign_external_id")
            snapshots.append({"campaign_id": campaign_ids[external_id], **row})
    return InMemorySimulationRepository(campaigns, snapshots)


class SimulatedConnector:
    def __init__(self, platform: str | None = None, repository: SimulationRepository | None = None):
        self.platform = platform
        self.repository = repository or SupabaseSimulationRepository.from_env()

    def fetch_campaigns(self, account_id: str) -> list[Campaign]:
        return [Campaign(id=str(row["id"]), account_id=str(row["account_id"]), platform=str(row["platform"]),
                         external_id=str(row.get("external_id") or ""), name=str(row["name"]),
                         objective=row.get("objective"), status=str(row["status"]),
                         daily_budget=float(row["daily_budget"]) if row.get("daily_budget") is not None else None)
                for row in self.repository.campaigns(account_id, self.platform)]

    def fetch_snapshots(self, campaign_id: str, limit: int = 30) -> list[dict[str, Any]]:
        return self.repository.snapshots(campaign_id, limit)

    def _write(self, account_id: str, campaign_id: str, operation: str, payload: dict[str, Any], rationale: str) -> WriteResult:
        self.repository.record_write(account_id, f"simulated.{operation}", {"campaign_id": campaign_id, **payload}, rationale)
        return WriteResult(True, operation, campaign_id, f"Simulated {operation} recorded; no external platform was changed.", True, payload)

    def pause_ad(self, account_id: str, campaign_id: str) -> WriteResult:
        self.repository.update_campaign(campaign_id, {"status": "paused"})
        return self._write(account_id, campaign_id, "pause_ad", {}, "Pause applied by simulated connector")

    def set_budget(self, account_id: str, campaign_id: str, daily_budget: float) -> WriteResult:
        if daily_budget < 0:
            raise ValueError("Daily budget cannot be negative")
        self.repository.update_campaign(campaign_id, {"daily_budget": daily_budget})
        return self._write(account_id, campaign_id, "set_budget", {"daily_budget": daily_budget}, "Budget applied by simulated connector")

    def launch_creative(self, account_id: str, campaign_id: str, creative: dict[str, Any]) -> WriteResult:
        return self._write(account_id, campaign_id, "launch_creative", {"creative": creative}, "Creative launch applied by simulated connector")

    def advance_week(self, account_id: str) -> dict[str, int]:
        counts: dict[str, int] = {}
        for campaign in self.fetch_campaigns(account_id):
            history = self.fetch_snapshots(campaign.id, 30)
            if not history:
                continue
            if campaign.external_id == "meta_prospecting" and self.repository.creative_launched(account_id, campaign.id):
                generated = self._recovery_rows(campaign.id, history)
            else:
                generated = self._trend_rows(account_id, campaign.id, history)
            self.repository.insert_snapshots(generated)
            counts[campaign.external_id] = len(generated)
        self.repository.record_write(account_id, "simulated.advance_week", {"rows_by_campaign": counts}, "Deterministic next-week data injected")
        return counts

    @staticmethod
    def _recovery_rows(campaign_id: str, history: list[dict[str, Any]]) -> list[dict[str, Any]]:
        latest = date.fromisoformat(str(history[-1]["date"])[:10])
        with RECOVERY_FILE.open(newline="", encoding="utf-8") as handle:
            source = list(csv.DictReader(handle))
        return [{"campaign_id": campaign_id, "date": (latest + timedelta(days=index + 1)).isoformat(),
                 **{key: (None if value == "" else float(value) if key in {"spend", "conversions", "revenue", "frequency"} else int(value))
                    for key, value in row.items() if key not in {"campaign_external_id", "date"}}}
                for index, row in enumerate(source)]

    @staticmethod
    def _trend_rows(account_id: str, campaign_id: str, history: list[dict[str, Any]]) -> list[dict[str, Any]]:
        numeric = ("impressions", "clicks", "spend", "conversions", "revenue", "frequency", "reach", "email_sends", "email_opens", "email_clicks")
        latest = date.fromisoformat(str(history[-1]["date"])[:10])
        seed = int(hashlib.sha256(f"{account_id}:{campaign_id}:{latest}".encode()).hexdigest()[:16], 16)
        rng = random.Random(seed)
        older, newer = history[-14:-7], history[-7:]
        rows = []
        for offset in range(1, 8):
            row: dict[str, Any] = {"campaign_id": campaign_id, "date": (latest + timedelta(days=offset)).isoformat()}
            for field in numeric:
                recent_values = [float(item[field]) for item in newer if item.get(field) not in (None, "")]
                older_values = [float(item[field]) for item in older if item.get(field) not in (None, "")]
                if not recent_values:
                    row[field] = None
                    continue
                recent_mean = sum(recent_values) / len(recent_values)
                old_mean = sum(older_values) / len(older_values) if older_values else recent_mean
                projected = max(0, recent_mean + (recent_mean - old_mean) / 7 * offset)
                projected *= 1 + rng.uniform(-0.015, 0.015)
                row[field] = round(projected, 4) if field in {"spend", "conversions", "revenue", "frequency"} else round(projected)
            row["clicks"] = min(row["clicks"] or 0, row["impressions"] or 0)
            row["conversions"] = min(row["conversions"] or 0, row["clicks"] or 0)
            row["reach"] = min(row["reach"] or 0, row["impressions"] or 0)
            if row["reach"]:
                row["frequency"] = round(row["impressions"] / row["reach"], 4)
            rows.append(row)
        return rows
