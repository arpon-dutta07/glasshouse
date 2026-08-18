"""Integration tests for FastAPI REST API endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.main import app, app_state
from backend.database import Database


@pytest_asyncio.fixture
async def client(tmp_path):
    db_file = tmp_path / "api_test.db"
    app_state.db_path = str(db_file)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Trigger lifespan
        async with app.router.lifespan_context(app):
            yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "glasshouse"


@pytest.mark.asyncio
async def test_devices_endpoints(client):
    # Pre-populate device
    db = app_state.database
    await db.upsert_device(
        mac_address="a4:83:e7:11:22:33",
        ip_address="192.168.1.15",
        device_name="MacBook Pro",
        vendor="Apple, Inc.",
    )
    await db.record_connection(
        sni_domain="telemetry.apple.com",
        classification="tracker",
        device_mac="a4:83:e7:11:22:33",
    )

    # List devices
    resp = await client.get("/api/devices")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 1
    assert data["devices"][0]["mac_address"] == "a4:83:e7:11:22:33"

    # Get single device
    resp_single = await client.get("/api/devices/a4:83:e7:11:22:33")
    assert resp_single.status_code == 200
    single_data = resp_single.json()
    assert single_data["device"]["mac_address"] == "a4:83:e7:11:22:33"
    assert len(single_data["recent_connections"]) == 1

    # 404 for unknown device
    resp_404 = await client.get("/api/devices/00:00:00:00:00:00")
    assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_connections_filtering(client):
    db = app_state.database
    mac1 = "00:11:22:33:44:55"
    mac2 = "50:85:69:00:11:22"

    await db.record_connection("google-analytics.com", "tracker", device_mac=mac1)
    await db.record_connection("doubleclick.net", "ad_network", device_mac=mac2)
    await db.record_connection("wikipedia.org", "first_party", device_mac=mac1)

    # All connections
    resp = await client.get("/api/connections")
    assert resp.status_code == 200
    assert resp.json()["count"] == 3

    # Filter by classification
    resp_trackers = await client.get("/api/connections?classification=tracker")
    assert resp_trackers.status_code == 200
    assert resp_trackers.json()["count"] == 1
    assert resp_trackers.json()["connections"][0]["sni_domain"] == "google-analytics.com"

    # Filter by device_mac
    resp_dev = await client.get(f"/api/connections?device_mac={mac2}")
    assert resp_dev.status_code == 200
    assert resp_dev.json()["count"] == 1
    assert resp_dev.json()["connections"][0]["sni_domain"] == "doubleclick.net"


@pytest.mark.asyncio
async def test_stats_endpoint(client):
    db = app_state.database
    mac = "24:0a:c4:12:34:56"
    await db.upsert_device(mac, ip_address="192.168.1.99")
    await db.record_connection("telemetry.iot.espressif.com", "tracker", device_mac=mac)
    await db.record_connection("updates.iot.espressif.com", "first_party", device_mac=mac)

    resp = await client.get("/api/stats")
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_devices"] == 1
    assert stats["total_connections"] == 2
    assert stats["tracker_percentage"] == 50.0
    assert "tracker" in stats["classification_breakdown"]


@pytest.mark.asyncio
async def test_custom_rules_flow(client):
    # 1. Add custom rule
    rule_data = {"domain": "custom-ad.analytics.net", "action": "block", "category": "ad_network"}
    resp_post = await client.post("/api/custom-rules", json=rule_data)
    assert resp_post.status_code == 200
    assert resp_post.json()["status"] == "success"

    # 2. List rules
    resp_get = await client.get("/api/custom-rules")
    assert resp_get.status_code == 200
    assert resp_get.json()["count"] == 1
    assert resp_get.json()["rules"][0]["domain"] == "custom-ad.analytics.net"

    # 3. Check classifier behavior updated
    classification = app_state.classifier.classify("custom-ad.analytics.net")
    assert classification.category == "ad_network"
    assert classification.is_blocked is True

    # 4. Delete rule
    resp_del = await client.delete("/api/custom-rules/custom-ad.analytics.net")
    assert resp_del.status_code == 200
    assert resp_del.json()["status"] == "deleted"

    resp_after = await client.get("/api/custom-rules")
    assert resp_after.json()["count"] == 0
