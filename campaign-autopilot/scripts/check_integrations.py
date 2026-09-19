"""Validate configured service credentials without printing secret values."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]


def configured(name: str) -> str:
    return os.getenv(name, "").strip().strip('"').strip("'")


def main() -> None:
    load_dotenv(ROOT / ".env")
    results: dict[str, str] = {}
    supabase_url, supabase_key = configured("SUPABASE_URL"), configured("SUPABASE_SERVICE_KEY")
    parsed = urlparse(supabase_url)
    if parsed.scheme in {"http", "https"} and parsed.netloc and supabase_key:
        try:
            response = httpx.get(f"{supabase_url.rstrip('/')}/rest/v1/accounts?select=id&limit=1", headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}, timeout=15)
            results["Supabase"] = "connected" if response.is_success else f"rejected credentials (HTTP {response.status_code})"
        except httpx.HTTPError:
            results["Supabase"] = "unreachable"
    else:
        results["Supabase"] = "invalid or placeholder SUPABASE_URL"

    openai_key = configured("OPENAI_API_KEY")
    if openai_key:
        try:
            response = httpx.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {openai_key}"}, timeout=15)
            results["OpenAI"] = "connected" if response.is_success else f"rejected credentials (HTTP {response.status_code})"
        except httpx.HTTPError:
            results["OpenAI"] = "unreachable"
    else:
        results["OpenAI"] = "not configured"

    shop, client_id, client_secret = (configured(name) for name in ("SHOPIFY_STORE_DOMAIN", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"))
    if shop and client_id and client_secret:
        try:
            response = httpx.post(f"https://{shop}/admin/oauth/access_token", data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret}, timeout=15)
            if response.is_success and response.json().get("access_token"):
                results["Shopify"] = "connected"
            else:
                try:
                    payload = response.json()
                    detail = str(payload.get("error_description") or payload.get("error") or "credentials rejected")
                except ValueError:
                    detail = "credentials rejected"
                for secret in (shop, client_id, client_secret):
                    detail = detail.replace(secret, "[redacted]")
                results["Shopify"] = f"HTTP {response.status_code}: {detail[:180]}"
        except (httpx.HTTPError, ValueError):
            results["Shopify"] = "unreachable or invalid response"
    else:
        results["Shopify"] = "not fully configured"

    results["Meta"] = "configured" if configured("META_ACCESS_TOKEN") and configured("META_AD_ACCOUNT_ID") else "not configured (optional in simulation mode)"
    results["Google Ads"] = "configured" if configured("GOOGLE_ADS_ACCESS_TOKEN") and configured("GOOGLE_ADS_CUSTOMER_ID") else "not configured (optional in simulation mode)"
    for service, status in results.items():
        print(f"{service}: {status}")


if __name__ == "__main__":
    main()
