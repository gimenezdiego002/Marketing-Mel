"""Verify simulated reads, recorded writes, recovery injection, and registry selection."""

import pytest

from connectors.google_ads import GoogleAdsConnector
from connectors.meta import MetaConnector
from connectors.registry import get_connector
from connectors.shopify import ShopifyConnector
from connectors.simulated import SimulatedConnector, seed_repository


def test_simulated_meta_advances_from_thirty_to_thirty_seven_rows() -> None:
    repository = seed_repository()
    connector = SimulatedConnector("meta", repository)
    campaign = next(item for item in connector.fetch_campaigns("seed-account") if item.external_id == "meta_prospecting")
    before = connector.fetch_snapshots(campaign.id, 30)
    assert len(before) == 30
    result = connector.launch_creative("seed-account", campaign.id, {"variant_label": "B"})
    assert result.success and result.recorded
    assert connector.advance_week("seed-account")["meta_prospecting"] == 7
    after = connector.fetch_snapshots(campaign.id, 37)
    assert len(after) == 37
    recovery = after[-7:]
    ctr = sum(int(row["clicks"]) for row in recovery) / sum(int(row["impressions"]) for row in recovery)
    assert ctr == pytest.approx(.024, abs=.001)


def test_advance_week_is_deterministic_without_refresh() -> None:
    first, second = seed_repository(), seed_repository()
    SimulatedConnector("google", first).advance_week("seed-account")
    SimulatedConnector("google", second).advance_week("seed-account")
    assert first.snapshot_rows == second.snapshot_rows


def test_registry_uses_simulation_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIMULATION_MODE", "true")
    assert isinstance(get_connector("meta", seed_repository()), SimulatedConnector)


def test_shopify_missing_credentials_uses_seed_and_upserts(caplog: pytest.LogCaptureFixture) -> None:
    class Table:
        def __init__(self) -> None:
            self.rows: list[dict[str, object]] = []
        def upsert(self, rows: list[dict[str, object]], on_conflict: str) -> "Table":
            assert on_conflict == "account_id,external_id"
            self.rows.extend(rows)
            return self
        def execute(self) -> object:
            return object()
    class Database:
        def __init__(self) -> None:
            self.target = Table()
        def table(self, name: str) -> Table:
            assert name == "shopify_orders"
            return self.target
    database = Database()
    synced = ShopifyConnector(database, store_domain="", admin_token="").sync_orders("seed-account")
    assert len(synced) == len(database.target.rows) == 1300
    assert "seed/orders.csv" in caplog.text


def test_shopify_exchanges_client_credentials_for_access_token() -> None:
    class Response:
        def raise_for_status(self) -> None:
            return None
        def json(self) -> dict[str, str]:
            return {"access_token": "short-lived-token"}
    class Client:
        def post(self, url: str, data: dict[str, str]) -> Response:
            assert url == "https://demo.myshopify.com/admin/oauth/access_token"
            assert data == {
                "grant_type": "client_credentials",
                "client_id": "client-id",
                "client_secret": "client-secret",
            }
            return Response()

    connector = ShopifyConnector(
        object(),
        store_domain="demo.myshopify.com",
        client_id="client-id",
        client_secret="client-secret",
    )
    assert connector._request_access_token(Client()) == "short-lived-token"  # type: ignore[arg-type]


@pytest.mark.parametrize("connector", [MetaConnector("token", "123"), GoogleAdsConnector("token", "oauth", "123")])
def test_real_connectors_refuse_writes(connector: object) -> None:
    with pytest.raises(NotImplementedError, match="approval|App Review|approved"):
        connector.pause_ad("account", "campaign")  # type: ignore[attr-defined]
