"""Read Meta test-account campaigns and insights while refusing unapproved platform writes."""

from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Any

import httpx

from .base import Campaign, WriteResult


class MetaConnector:
    API_VERSION = "v24.0"

    def __init__(self, access_token: str | None = None, ad_account_id: str | None = None):
        self.access_token = access_token or os.getenv("META_ACCESS_TOKEN")
        self.ad_account_id = ad_account_id or os.getenv("META_AD_ACCOUNT_ID")

    def _credentials(self) -> tuple[str, str]:
        if not self.access_token or not self.ad_account_id:
            raise RuntimeError("META_ACCESS_TOKEN and META_AD_ACCOUNT_ID are required for Meta reads")
        account = self.ad_account_id if self.ad_account_id.startswith("act_") else f"act_{self.ad_account_id}"
        return self.access_token, account

    def fetch_campaigns(self, account_id: str) -> list[Campaign]:
        token, ad_account = self._credentials()
        response = httpx.get(f"https://graph.facebook.com/{self.API_VERSION}/{ad_account}/campaigns",
                             params={"access_token": token, "fields": "id,name,objective,status,daily_budget", "limit": 200}, timeout=30)
        response.raise_for_status()
        return [Campaign(str(row["id"]), account_id, "meta", str(row["id"]), row["name"], row.get("objective"),
                         row.get("status", "UNKNOWN"), float(row["daily_budget"]) / 100 if row.get("daily_budget") else None)
                for row in response.json().get("data", [])]

    def fetch_snapshots(self, campaign_id: str, limit: int = 30) -> list[dict[str, Any]]:
        token, _ = self._credentials()
        until = date.today()
        since = until - timedelta(days=min(limit, 30) - 1)
        fields = "date_start,impressions,clicks,spend,actions,action_values,reach,frequency"
        response = httpx.get(f"https://graph.facebook.com/{self.API_VERSION}/{campaign_id}/insights",
                             params={"access_token": token, "fields": fields, "time_increment": 1,
                                     "time_range": f'{{"since":"{since}","until":"{until}"}}'}, timeout=30)
        response.raise_for_status()
        return response.json().get("data", [])[:limit]

    @staticmethod
    def _refuse(operation: str, campaign_id: str) -> WriteResult:
        raise NotImplementedError(
            f"Meta {operation} is disabled. Live writes require SIMULATION_MODE=false, valid credentials, "
            "the required ads_management permission, and Meta App Review approval."
        )

    def pause_ad(self, account_id: str, campaign_id: str) -> WriteResult:
        return self._refuse("pause", campaign_id)

    def set_budget(self, account_id: str, campaign_id: str, daily_budget: float) -> WriteResult:
        return self._refuse("budget update", campaign_id)

    def launch_creative(self, account_id: str, campaign_id: str, creative: dict[str, Any]) -> WriteResult:
        return self._refuse("creative launch", campaign_id)
