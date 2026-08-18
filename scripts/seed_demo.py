"""Synthetic network traffic and device telemetry generator for Glasshouse demo.

Populates the SQLite database with realistic IoT, mobile, TV, and PC devices,
historical connection logs, and computed privacy scores.
"""

import asyncio
import os
import random
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import Database
from classifier.classifier import DomainClassifier
from scoring.engine import calculate_privacy_score

SAMPLE_DEVICES = [
    {
        "mac_address": "50:85:69:44:11:22",
        "ip_address": "192.168.1.102",
        "device_name": "Living Room Samsung Smart TV",
        "vendor": "Samsung Electronics",
        "profile": "smart_tv",
    },
    {
        "mac_address": "a4:83:e7:88:99:00",
        "ip_address": "192.168.1.105",
        "device_name": "Arpan's MacBook Pro",
        "vendor": "Apple, Inc.",
        "profile": "laptop",
    },
    {
        "mac_address": "24:0a:c4:33:55:77",
        "ip_address": "192.168.1.118",
        "device_name": "Smart Thermostat ESP32",
        "vendor": "Espressif Inc.",
        "profile": "iot",
    },
    {
        "mac_address": "08:05:81:66:77:88",
        "ip_address": "192.168.1.125",
        "device_name": "Bedroom Roku Ultra",
        "vendor": "Roku, Inc.",
        "profile": "streaming",
    },
    {
        "mac_address": "78:02:f8:22:33:44",
        "ip_address": "192.168.1.140",
        "device_name": "Xiaomi Smart Camera",
        "vendor": "Xiaomi Communications",
        "profile": "camera",
    },
]

DOMAINS_BY_PROFILE = {
    "smart_tv": [
        ("telemetry.samsung.com", "tracker"),
        ("log-upload.samsungcloudsolution.com", "tracker"),
        ("ads.samsungads.com", "ad_network"),
        ("doubleclick.net", "ad_network"),
        ("netflix.com", "first_party"),
        ("api.youtube.com", "first_party"),
        ("spotify.com", "first_party"),
        ("smarttv-ota.internal.samsung", "unknown"),
    ],
    "laptop": [
        ("github.com", "first_party"),
        ("wikipedia.org", "first_party"),
        ("docs.python.org", "first_party"),
        ("google.com", "first_party"),
        ("google-analytics.com", "tracker"),
        ("clarity.ms", "tracker"),
        ("sentry.io", "tracker"),
        ("doubleclick.net", "ad_network"),
        ("news.ycombinator.com", "unknown"),
    ],
    "iot": [
        ("api.iot.espressif.com", "first_party"),
        ("pool.ntp.org", "first_party"),
        ("telemetry.iot.cloud", "tracker"),
        ("metrics.devicehub.io", "tracker"),
    ],
    "streaming": [
        ("ads.roku.com", "ad_network"),
        ("cloudservices.roku.com", "tracker"),
        ("netflix.com", "first_party"),
        ("hulu.com", "first_party"),
        ("doubleclick.net", "ad_network"),
    ],
    "camera": [
        ("api.io.mi.com", "first_party"),
        ("log.byteoversea.com", "tracker"),
        ("tracking.miui.com", "tracker"),
        ("p2p.stream.xiaomi.com", "first_party"),
    ],
}


async def seed_demo_data(db_path: str = "data/glasshouse.db"):
    print(f"[*] Initializing Glasshouse demo database at {db_path}...")
    db = Database(db_path=db_path)
    await db.initialize()

    now = datetime.now(timezone.utc)
    classifier = DomainClassifier()
    classifier.load_rules(download_remote=False)

    for dev in SAMPLE_DEVICES:
        print(f"[+] Creating device: {dev['device_name']} ({dev['mac_address']})")
        await db.upsert_device(
            mac_address=dev["mac_address"],
            ip_address=dev["ip_address"],
            device_name=dev["device_name"],
            vendor=dev["vendor"],
            timestamp=now - timedelta(days=7),
        )

        domain_pool = DOMAINS_BY_PROFILE.get(dev["profile"], [])
        connections = []

        # Generate 20 to 60 connections over past 24 hours
        num_connections = random.randint(25, 60)
        for i in range(num_connections):
            domain, base_cat = random.choice(domain_pool)
            classification = classifier.classify(domain)
            category = classification.category if classification.category != "unknown" else base_cat

            conn_time = now - timedelta(minutes=random.randint(2, 1400))
            await db.record_connection(
                sni_domain=domain,
                classification=category,
                device_mac=dev["mac_address"],
                destination_ip=f"198.51.100.{random.randint(10, 250)}",
                list_source=classification.source,
                timestamp=conn_time,
            )
            connections.append({"sni_domain": domain, "classification": category, "timestamp": conn_time})

        # Calculate and record initial score
        score_res = calculate_privacy_score(connections, device_mac=dev["mac_address"], computed_at=now)
        await db.record_score(
            device_mac=dev["mac_address"],
            score=score_res.score,
            tracker_count=score_res.tracker_count + score_res.ad_network_count,
            total_count=score_res.total_count,
            computed_at=now,
        )
        print(f"    -> Score: {score_res.score}/100 ({score_res.grade} - {score_res.status_label}), Trackers: {score_res.tracker_count + score_res.ad_network_count}/{score_res.total_count}")

    print("\n[+] Demo seed complete! Run 'python -m uvicorn backend.main:app' and 'npm run dev' to explore.")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
