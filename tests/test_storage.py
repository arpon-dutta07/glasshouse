"""Unit and integration tests for SQLite storage layer and Pipeline."""

import os
import pytest
import pytest_asyncio
from datetime import datetime, timezone
from backend.database import Database
from backend.pipeline import Pipeline
from classifier.classifier import DomainClassifier
from capture.tls_parser import SNIRecord


@pytest_asyncio.fixture
async def test_db(tmp_path):
    db_file = tmp_path / "test_glasshouse.db"
    db = Database(str(db_file))
    await db.initialize()
    return db


@pytest.mark.asyncio
async def test_database_crud(test_db):
    db = test_db

    # 1. Upsert device
    await db.upsert_device(
        mac_address="aa:bb:cc:dd:ee:01",
        ip_address="192.168.1.101",
        device_name="Living Room TV",
        vendor="Samsung Electronics",
    )

    devices = await db.get_all_devices()
    assert len(devices) == 1
    assert devices[0]["mac_address"] == "aa:bb:cc:dd:ee:01"
    assert devices[0]["device_name"] == "Living Room TV"
    assert devices[0]["vendor"] == "Samsung Electronics"

    # 2. Record connections
    conn_id_1 = await db.record_connection(
        sni_domain="telemetry.samsung.com",
        classification="tracker",
        device_mac="aa:bb:cc:dd:ee:01",
        destination_ip="20.10.5.2",
        list_source="seed",
    )
    assert conn_id_1 > 0

    conn_id_2 = await db.record_connection(
        sni_domain="netflix.com",
        classification="first_party",
        device_mac="aa:bb:cc:dd:ee:01",
        destination_ip="54.23.11.9",
        list_source="seed",
    )
    assert conn_id_2 > conn_id_1

    # 3. Query connections
    conns = await db.get_recent_connections(limit=10)
    assert len(conns) == 2
    assert conns[0]["sni_domain"] == "netflix.com"
    assert conns[1]["sni_domain"] == "telemetry.samsung.com"

    tracker_conns = await db.get_recent_connections(limit=10, classification="tracker")
    assert len(tracker_conns) == 1
    assert tracker_conns[0]["sni_domain"] == "telemetry.samsung.com"

    # 4. Custom rules CRUD
    await db.add_custom_rule("my-test.com", action="block", category="tracker")
    rules = await db.get_custom_rules()
    assert len(rules) == 1
    assert rules[0]["domain"] == "my-test.com"

    await db.delete_custom_rule("my-test.com")
    rules_after = await db.get_custom_rules()
    assert len(rules_after) == 0


@pytest.mark.asyncio
async def test_pipeline_integration(test_db):
    db = test_db
    classifier = DomainClassifier()
    classifier.load_rules()

    broadcast_events = []
    pipeline = Pipeline(
        database=db,
        classifier=classifier,
        on_event=lambda ev: broadcast_events.append(ev),
    )

    record = SNIRecord(
        src_ip="192.168.1.150",
        src_mac="cc:dd:ee:ff:00:11",
        dst_ip="172.217.16.206",
        sni_domain="doubleclick.net",
        timestamp=datetime.now(timezone.utc),
    )

    event = await pipeline.process_sni_record(record)
    assert event["classification"] == "ad_network"
    assert event["is_blocked"] is True
    assert len(broadcast_events) == 1
    assert broadcast_events[0]["sni_domain"] == "doubleclick.net"

    # Verify persisted in database
    conns = await db.get_recent_connections()
    assert len(conns) == 1
    assert conns[0]["sni_domain"] == "doubleclick.net"
    assert conns[0]["classification"] == "ad_network"

    devices = await db.get_all_devices()
    assert len(devices) == 1
    assert devices[0]["mac_address"] == "cc:dd:ee:ff:00:11"
