"""Read Google Ads test-account data while refusing writes that need production approval."""

from __future__ import annotations

import os
from typing import Any

import httpx

from .base import Campaign, WriteResult


class GoogleAdsConnector:
    API_VERSION = "v25"

    def __init__(self, developer_token: str | None = None, access_token: str | None = None, customer_id: str | None = None):
        self.developer_token = developer_token or os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
        self.access_token = access_token or os.getenv("GOOGLE_ADS_ACCESS_TOKEN")
        self.customer_id = (customer_id or os.getenv("GOOGLE_ADS_CUSTOMER_ID") or "").replace("-", "")

    def _headers(self) -> dict[str, str]:
        if not self.developer_token or not self.access_token or not self.customer_id:
            raise RuntimeError("Google Ads reads require GOOGLE_ADS_DEVELOPER_TOKEN plus OAuth GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_CUSTOMER_ID")
        return {"Authorization": f"Bearer {self.access_token}", "developer-token": self.developer_token, "Content-Type": "application/json"}

    def _search(self, query: str) -> list[dict[str, Any]]:
        endpoint = f"https://googleads.googleapis.com/{self.API_VERSION}/customers/{self.customer_id}/googleAds:searchStream"
        response = httpx.post(endpoint, headers=self._headers(), json={"query": query}, timeout=30)
        response.raise_for_status()
        return [row for batch in response.json() for row in batch.get("results", [])]

    def fetch_campaigns(self, account_id: str) -> list[Campaign]:
        rows = self._search("SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros FROM campaign")
        return [Campaign(str(row["campaign"]["id"]), account_id, "google", str(row["campaign"]["id"]), row["campaign"]["name"],
                         row["campaign"].get("advertisingChannelType"), row["campaign"].get("status", "UNKNOWN"),
                         float(row.get("campaignBudget", {}).get("amountMicros", 0)) / 1_000_000)
                for row in rows]

    def fetch_snapshots(self, campaign_id: str, limit: int = 30) -> list[dict[str, Any]]:
        query = ("SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, "
                 "metrics.conversions, metrics.conversions_value FROM campaign "
                 f"WHERE campaign.id = {int(campaign_id)} AND segments.date DURING LAST_30_DAYS ORDER BY segments.date DESC LIMIT {min(limit, 30)}")
        return self._search(query)

    @staticmethod
    def _refuse(operation: str, campaign_id: str) -> WriteResult:
        raise NotImplementedError(
            f"Google Ads {operation} is disabled. Live writes require SIMULATION_MODE=false, OAuth credentials, "
            "and a developer token with approved Basic or Standard Access."
        )

    def pause_ad(self, account_id: str, campaign_id: str) -> WriteResult:
        return self._refuse("pause", campaign_id)

    def set_budget(self, account_id: str, campaign_id: str, daily_budget: float) -> WriteResult:
        return self._refuse("budget update", campaign_id)

    def launch_creative(self, account_id: str, campaign_id: str, creative: dict[str, Any]) -> WriteResult:
        return self._refuse("creative launch", campaign_id)
