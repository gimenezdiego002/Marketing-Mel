"""Generate the reproducible Brew & Bloom campaign, snapshot, order, and recovery fixtures."""

from __future__ import annotations

import csv
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


SEED = 20260919
START_DATE = date(2026, 8, 1)
HERE = Path(__file__).resolve().parent
CAMPAIGNS = [
    {"external_id": "meta_prospecting", "name": "Meta Prospecting", "platform": "meta", "objective": "acquisition", "status": "active", "daily_budget": 450},
    {"external_id": "meta_retargeting", "name": "Meta Retargeting", "platform": "meta", "objective": "conversion", "status": "active", "daily_budget": 120},
    {"external_id": "google_brand_search", "name": "Google Brand Search", "platform": "google", "objective": "conversion", "status": "active", "daily_budget": 80},
    {"external_id": "klaviyo_welcome_flow", "name": "Klaviyo Welcome Flow", "platform": "klaviyo", "objective": "retention", "status": "active", "daily_budget": 0},
]


def jitter(rng: random.Random, value: float, pct: float = 0.025) -> float:
    return value * (1 + rng.uniform(-pct, pct))


def paid_row(rng: random.Random, campaign: str, day: int, impressions: int, ctr: float, cpm: float,
             cvr: float, frequency: float, roas: float) -> dict[str, object]:
    impressions = round(jitter(rng, impressions, 0.035))
    clicks = max(1, round(impressions * jitter(rng, ctr, 0.018)))
    conversions = round(clicks * jitter(rng, cvr, 0.012))
    spend = round(impressions * jitter(rng, cpm, 0.012) / 1000, 2)
    revenue = round(spend * jitter(rng, roas, 0.025), 2)
    reach = max(1, round(impressions / jitter(rng, frequency, 0.01)))
    return {
        "campaign_external_id": campaign, "date": START_DATE + timedelta(days=day - 1),
        "impressions": impressions, "clicks": clicks, "spend": spend,
        "conversions": conversions, "revenue": revenue,
        "frequency": round(impressions / reach, 4), "reach": reach,
        "email_sends": "", "email_opens": "", "email_clicks": "",
    }


def generate_snapshots(rng: random.Random) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for day in range(1, 31):
        if day <= 18:
            progress = (day - 1) / 17
            ctr, cpm, frequency, roas = 0.020, 11.0, 1.5 + 0.9 * progress, 3.1
        else:
            progress = (day - 18) / 12
            ctr, cpm = 0.020 - 0.0064 * progress, 11.0 + 2.6 * progress
            frequency, roas = 2.4 + 1.4 * progress, 3.1 - 1.5 * progress
        rows.append(paid_row(rng, "meta_prospecting", day, 41000, ctr, cpm, 0.028, frequency, roas))
        rows.append(paid_row(rng, "meta_retargeting", day, 10500, 0.025, 9.5, 0.055, 1.85, 5.2))
        rows.append(paid_row(rng, "google_brand_search", day, 4200, 0.075, 18.0, 0.071, 1.15, 4.4))

        sends = round(jitter(rng, 1250, 0.035))
        click_rate = 0.041 - (0.011 * (day - 1) / 29)
        opens = round(sends * jitter(rng, 0.43, 0.02))
        email_clicks = round(sends * jitter(rng, click_rate, 0.012))
        rows.append({
            "campaign_external_id": "klaviyo_welcome_flow", "date": START_DATE + timedelta(days=day - 1),
            "impressions": sends, "clicks": email_clicks, "spend": 0,
            "conversions": round(email_clicks * jitter(rng, 0.09, 0.02)),
            "revenue": round(email_clicks * jitter(rng, 3.8, 0.03), 2),
            "frequency": 1, "reach": sends, "email_sends": sends,
            "email_opens": opens, "email_clicks": email_clicks,
        })
    return rows


def generate_orders(rng: random.Random) -> list[dict[str, object]]:
    rows = []
    campaigns = ["meta_prospecting", "meta_retargeting", "google_brand_search", "klaviyo_welcome_flow", ""]
    weights = [0.34, 0.18, 0.19, 0.12, 0.17]
    for number in range(1, 1301):
        customer_number = rng.randint(1, 1014)
        created = datetime.combine(
            START_DATE + timedelta(days=rng.randrange(30)),
            datetime.min.time(), tzinfo=timezone.utc,
        ) + timedelta(seconds=rng.randrange(86400))
        rows.append({
            "external_id": f"seed-order-{number:04d}",
            "created_at": created.isoformat().replace("+00:00", "Z"),
            "total": round(max(8, rng.normalvariate(31, 8)), 2),
            "customer_id": f"seed-customer-{customer_number:04d}",
            "is_repeat": "true" if number <= 286 else "false",
            "utm_campaign": rng.choices(campaigns, weights=weights, k=1)[0],
        })
    rng.shuffle(rows)
    return rows


def generate_week_after(rng: random.Random, snapshots: list[dict[str, object]]) -> list[dict[str, object]]:
    recent = [r for r in snapshots if r["campaign_external_id"] == "meta_prospecting" and r["date"] >= START_DATE + timedelta(days=23)]
    recent_cpa = sum(float(r["spend"]) for r in recent) / sum(float(r["conversions"]) for r in recent)
    target_cpa = recent_cpa * 0.72
    rows = []
    for offset in range(7):
        impressions = round(jitter(rng, 42000, 0.025))
        clicks = round(impressions * jitter(rng, 0.024, 0.012))
        spend = round(impressions * jitter(rng, 11.5, 0.01) / 1000, 2)
        conversions = max(1, round(spend / target_cpa))
        reach = round(impressions / jitter(rng, 1.6, 0.008))
        rows.append({
            "campaign_external_id": "meta_prospecting", "date": START_DATE + timedelta(days=30 + offset),
            "impressions": impressions, "clicks": clicks, "spend": spend,
            "conversions": conversions, "revenue": round(conversions * jitter(rng, 31, 0.025), 2),
            "frequency": round(impressions / reach, 4), "reach": reach,
            "email_sends": "", "email_opens": "", "email_clicks": "",
        })
    return rows


def write_csv(path: Path, rows: list[dict[str, object]], fields: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    rng = random.Random(SEED)
    snapshots = generate_snapshots(rng)
    write_csv(HERE / "campaigns.csv", CAMPAIGNS, list(CAMPAIGNS[0]))
    write_csv(HERE / "snapshots.csv", snapshots, list(snapshots[0]))
    orders = generate_orders(rng)
    write_csv(HERE / "orders.csv", orders, list(orders[0]))
    recovery = generate_week_after(rng, snapshots)
    write_csv(HERE / "week_after.csv", recovery, list(recovery[0]))
    print(f"Generated {len(CAMPAIGNS)} campaigns, {len(snapshots)} snapshots, {len(orders)} orders, and {len(recovery)} recovery rows (seed={SEED}).")


if __name__ == "__main__":
    main()
