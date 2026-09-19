"""Read the last 30 days of Shopify orders through Admin GraphQL with a seed fallback."""

from __future__ import annotations

import csv
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx


LOGGER = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]


class ShopifyConnector:
    def __init__(
        self,
        database: Any,
        store_domain: str | None = None,
        admin_token: str | None = None,
        client_id: str | None = None,
        client_secret: str | None = None,
    ):
        self.database = database
        self.store_domain = store_domain or os.getenv("SHOPIFY_STORE_DOMAIN")
        # admin_token remains injectable for tests and older stores. New Dev Dashboard
        # apps use client credentials to request a short-lived token at runtime.
        self.admin_token = admin_token or os.getenv("SHOPIFY_ADMIN_TOKEN")
        self.client_id = client_id or os.getenv("SHOPIFY_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("SHOPIFY_CLIENT_SECRET")

    @classmethod
    def from_env(cls) -> "ShopifyConnector":
        from supabase import create_client
        url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required to store Shopify orders")
        return cls(create_client(url, key))

    def sync_orders(self, account_id: str) -> list[dict[str, Any]]:
        if self.store_domain and (self.admin_token or (self.client_id and self.client_secret)):
            orders = self._fetch_live()
        else:
            LOGGER.warning("Shopify credentials are missing; loading data/seed/orders.csv instead of live orders")
            orders = self._fetch_seed()
        payload = [{"account_id": account_id, **order} for order in orders]
        for start in range(0, len(payload), 250):
            self.database.table("shopify_orders").upsert(payload[start:start + 250], on_conflict="account_id,external_id").execute()
        return payload

    def _fetch_live(self) -> list[dict[str, Any]]:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*\.myshopify\.com", self.store_domain or ""):
            raise ValueError("SHOPIFY_STORE_DOMAIN must be a *.myshopify.com domain")
        since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        query = """query Orders($after: String, $filter: String!) {
          orders(first: 100, after: $after, query: $filter, sortKey: CREATED_AT) {
            nodes { id createdAt currentTotalPriceSet { shopMoney { amount } } customer { id numberOfOrders } }
            pageInfo { hasNextPage endCursor }
          }
        }"""
        endpoint = f"https://{self.store_domain}/admin/api/2026-07/graphql.json"
        rows, cursor = [], None
        with httpx.Client(timeout=30) as client:
            access_token = self.admin_token or self._request_access_token(client)
            while True:
                response = client.post(endpoint, headers={"X-Shopify-Access-Token": access_token},
                                       json={"query": query, "variables": {"after": cursor, "filter": f"created_at:>={since} status:any"}})
                response.raise_for_status()
                body = response.json()
                if body.get("errors"):
                    raise RuntimeError(f"Shopify GraphQL error: {body['errors'][0].get('message', 'unknown error')}")
                orders = body["data"]["orders"]
                for order in orders["nodes"]:
                    customer = order.get("customer") or {}
                    rows.append({
                        "external_id": order["id"], "created_at": order["createdAt"],
                        "total": float(order["currentTotalPriceSet"]["shopMoney"]["amount"]),
                        "customer_id": customer.get("id"), "is_repeat": (customer.get("numberOfOrders") or 0) > 1,
                        "utm_campaign": None,
                    })
                if not orders["pageInfo"]["hasNextPage"]:
                    return rows
                cursor = orders["pageInfo"]["endCursor"]

    def _request_access_token(self, client: httpx.Client) -> str:
        """Exchange Dev Dashboard credentials for Shopify's 24-hour token."""
        if not self.client_id or not self.client_secret:
            raise RuntimeError("SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET are required for live Shopify reads")
        response = client.post(
            f"https://{self.store_domain}/admin/oauth/access_token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        response.raise_for_status()
        token = response.json().get("access_token")
        if not token:
            raise RuntimeError("Shopify authentication response did not contain an access token")
        return str(token)

    @staticmethod
    def _fetch_seed() -> list[dict[str, Any]]:
        with (ROOT / "data" / "seed" / "orders.csv").open(newline="", encoding="utf-8") as handle:
            return [{**row, "total": float(row["total"]), "is_repeat": row["is_repeat"].lower() == "true",
                     "utm_campaign": row["utm_campaign"] or None} for row in csv.DictReader(handle)]
