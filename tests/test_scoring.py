"""Unit tests for Privacy Scoring engine and scheduled service."""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from scoring.engine import calculate_privacy_score, ScoringService
from backend.database import Database


def test_score_empty_connections():
    res = calculate_privacy_score([], device_mac="00:11:22:33:44:55")
    assert res.score == 100
    assert res.grade == "A"
    assert res.status_label == "Excellent"


def test_score_benign_traffic():
    connections = [
        {"sni_domain": "wikipedia.org", "classification": "first_party"},
        {"sni_domain": "github.com", "classification": "first_party"},
        {"sni_domain": "internal-notes.lan", "classification": "unknown"},
    ]
    res = calculate_privacy_score(connections, device_mac="00:11:22:33:44:55")
    assert res.score == 100
    assert res.tracker_count == 0
    assert res.tracker_ratio == 0.0


def test_score_mixed_tracker_traffic():
    connections = [
        {"sni_domain": "google-analytics.com", "classification": "tracker"},
        {"sni_domain": "doubleclick.net", "classification": "ad_network"},
        {"sni_domain": "github.com", "classification": "first_party"},
        {"sni_domain": "wikipedia.org", "classification": "first_party"},
    ]
    # Total = 4, Trackers = 2, tracker_ratio = 0.5
    # Unique trackers = 2 ('google-analytics.com', 'doubleclick.net')
    # Deduction ratio = 0.5 * 60 = 30
    # Deduction unique = min(2 * 2, 40) = 4
    # Expected score = 100 - 30 - 4 = 66
    res = calculate_privacy_score(connections, device_mac="00:11:22:33:44:55")
    assert res.score == 66
    assert res.grade == "C"
    assert res.status_label == "Fair"


def test_score_excessive_tracker_traffic():
    # 100 connections, all trackers across 25 distinct domains
    connections = []
    for i in range(25):
        domain = f"tracker-{i}.adnetwork.com"
        for _ in range(4):
            connections.append({"sni_domain": domain, "classification": "tracker"})

    # Ratio = 1.0 -> 60 penalty
    # Unique = 25 -> min(50, 40) = 40 penalty
    # Total deduction = 100 -> Score = 0
    res = calculate_privacy_score(connections, device_mac="00:11:22:33:44:55")
    assert res.score == 0
    assert res.grade == "F"
    assert res.status_label == "Critical"


@pytest.mark.asyncio
async def test_scoring_service_computation(tmp_path):
    db_file = tmp_path / "scoring_test.db"
    db = Database(str(db_file))
    await db.initialize()

    mac = "aa:bb:cc:dd:ee:99"
    await db.upsert_device(mac_address=mac, device_name="Smart TV")
    await db.record_connection(sni_domain="telemetry.samsung.com", classification="tracker", device_mac=mac)
    await db.record_connection(sni_domain="netflix.com", classification="first_party", device_mac=mac)

    service = ScoringService(database=db, window_hours=24)
    scores = await service.compute_all_scores()

    assert mac in scores
    assert 0 <= scores[mac].score <= 100

    # Verify score saved in database
    devices = await db.get_all_devices()
    assert devices[0]["current_score"] == scores[mac].score
