"""Validate generated fixtures and idempotently upsert them into the Campaign Autopilot schema."""

from __future__ import annotations

import argparse
import csv
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
SEED_DIR = ROOT / "data" / "seed"
ACCOUNT_NAME = "Brew & Bloom"


def rows(name: str) -> list[dict[str, str]]:
    with (SEED_DIR / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def optional_number(value: str, integer: bool = False) -> int | float | None:
    if value == "":
        return None
    return int(value) if integer else float(value)


def validate() -> dict[str, int]:
    campaigns, snapshots, orders, recovery = (rows(name) for name in ("campaigns.csv", "snapshots.csv", "orders.csv", "week_after.csv"))
    campaign_ids = {row["external_id"] for row in campaigns}
    if len(campaigns) != 4 or len(campaign_ids) != 4:
        raise ValueError("campaigns.csv must contain four unique campaigns")
    if len(snapshots) != 120 or any(row["campaign_external_id"] not in campaign_ids for row in snapshots):
        raise ValueError("snapshots.csv must contain 30 days for four known campaigns")
    if len({(row["campaign_external_id"], row["date"]) for row in snapshots}) != 120:
        raise ValueError("Snapshot campaign/date pairs must be unique")
    if len(orders) < 1200 or len({row["external_id"] for row in orders}) != len(orders):
        raise ValueError("orders.csv must contain at least 1,200 uniquely identified orders")
    if len(recovery) != 7 or {row["campaign_external_id"] for row in recovery} != {"meta_prospecting"}:
        raise ValueError("week_after.csv must contain seven meta_prospecting rows")
    return {"campaigns": len(campaigns), "snapshots": len(snapshots), "orders": len(orders), "week_after": len(recovery)}


def one_or_create(client: Any, table: str, match: dict[str, Any], values: dict[str, Any]) -> dict[str, Any]:
    query = client.table(table).select("*")
    for key, value in match.items():
        query = query.eq(key, value)
    existing = query.limit(1).execute().data
    if existing:
        client.table(table).update(values).eq("id", existing[0]["id"]).execute()
        return {**existing[0], **values}
    return client.table(table).insert({**match, **values}).execute().data[0]


def load() -> dict[str, int]:
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required; use --dry-run to validate only")
    client = create_client(url, key)
    account = one_or_create(client, "accounts", {"name": ACCOUNT_NAME}, {})
    account_id = account["id"]
    campaign_map: dict[str, str] = {}
    for row in rows("campaigns.csv"):
        external_id = row.pop("external_id")
        campaign = one_or_create(
            client, "campaigns", {"account_id": account_id, "external_id": external_id},
            {**row, "daily_budget": float(row["daily_budget"])},
        )
        campaign_map[external_id] = campaign["id"]
    one_or_create(client, "guardrails", {"account_id": account_id}, {
        "max_daily_spend": 750, "max_reallocation_pct": 15,
        "auto_pause_threshold": 2.0, "min_confidence": 0.7, "autonomy_level": "assisted",
    })

    snapshot_payload = []
    for row in rows("snapshots.csv"):
        campaign_external_id = row.pop("campaign_external_id")
        snapshot_payload.append({
            "campaign_id": campaign_map[campaign_external_id], "date": row["date"],
            **{key: optional_number(row[key], integer=key in {"impressions", "clicks", "reach", "email_sends", "email_opens", "email_clicks"})
               for key in ("impressions", "clicks", "spend", "conversions", "revenue", "frequency", "reach", "email_sends", "email_opens", "email_clicks")},
        })
    client.table("campaign_snapshots").upsert(snapshot_payload, on_conflict="campaign_id,date").execute()

    order_payload = [{
        "account_id": account_id, **row, "total": float(row["total"]),
        "is_repeat": row["is_repeat"].lower() == "true", "utm_campaign": row["utm_campaign"] or None,
    } for row in rows("orders.csv")]
    for start in range(0, len(order_payload), 250):
        client.table("shopify_orders").upsert(order_payload[start:start + 250], on_conflict="account_id,external_id").execute()
    return validate()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="validate generated files without connecting to Supabase")
    args = parser.parse_args()
    load_dotenv(ROOT / ".env")
    counts = validate() if args.dry_run else load()
    mode = "Validated" if args.dry_run else "Upserted"
    print(f"{mode} Brew & Bloom seed data: " + ", ".join(f"{value} {key}" for key, value in counts.items()))


if __name__ == "__main__":
    main()
