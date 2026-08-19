"""Populates realistic TLS handshakes and privacy score histories for all live discovered devices in glasshouse.db."""

import asyncio
import random
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import Database
from classifier.classifier import DomainClassifier
from scoring.engine import calculate_privacy_score

DEVICE_PROFILES = {
    "realme": [
        ("ads.oppomobile.com", "ad_network"),
        ("metrics.heytapmobile.com", "tracker"),
        ("log.realme.com", "tracker"),
        ("connectivitycheck.gstatic.com", "first_party"),
        ("play.googleapis.com", "first_party"),
        ("firebase-settings.crashlytics.com", "tracker"),
        ("graph.instagram.com", "first_party"),
        ("app-measurement.com", "tracker"),
        ("in.applovin.com", "ad_network"),
        ("api.whatsapp.com", "first_party"),
        ("v10.events.data.microsoft.com", "tracker"),
    ],
    "samsung": [
        ("telemetry.samsung.com", "tracker"),
        ("log-upload.samsungcloudsolution.com", "tracker"),
        ("samsungadhub.com", "ad_network"),
        ("account.samsung.com", "first_party"),
        ("graph.facebook.com", "tracker"),
        ("youtube.googleapis.com", "first_party"),
        ("doubleclick.net", "ad_network"),
        ("crashlyticsreports-pa.googleapis.com", "tracker"),
        ("samsungcloud.com", "first_party"),
        ("branch.io", "tracker"),
    ],
    "router": [
        ("pool.ntp.org", "first_party"),
        ("time.nist.gov", "first_party"),
        ("checkip.dyndns.org", "first_party"),
        ("dns.google", "first_party"),
        ("digisolworld.com", "first_party"),
    ],
    "iot": [
        ("device-metrics-us.amazon.com", "tracker"),
        ("telemetry.iot.cloud", "tracker"),
        ("ads.smarttv.com", "ad_network"),
        ("netflix.com", "first_party"),
        ("api.spotify.com", "first_party"),
        ("connectivity.internal.iot", "unknown"),
    ],
}


def get_profile_for_device(name: str, vendor: str) -> str:
    text = f"{name or ''} {vendor or ''}".lower()
    if "realme" in text or "oppo" in text:
        return "realme"
    if "samsung" in text or "a13" in text or "arpita" in text:
        return "samsung"
    if "router" in text or "gateway" in text or "digisol" in text:
        return "router"
    return "iot"


async def main():
    db = Database("data/glasshouse.db")
    await db.initialize()

    classifier = DomainClassifier()
    classifier.load_rules(download_remote=False)

    devices = await db.get_all_devices()
    now = datetime.now(timezone.utc)

    for dev in devices:
        mac = dev["mac_address"]
        name = dev.get("device_name") or ""
        vendor = dev.get("vendor") or ""

        # Skip This PC since it already has real live sniffed traffic
        if "this pc" in name.lower() or "arpon" in name.lower():
            print(f"[-] Skipping host machine: {name} ({mac}) - already has live traffic.")
            continue

        profile_key = get_profile_for_device(name, vendor)
        domain_pool = DEVICE_PROFILES.get(profile_key, DEVICE_PROFILES["iot"])

        print(f"[+] Generating TLS telemetry for {name} ({mac}) [{profile_key} profile]...")

        connections = []
        num_connections = random.randint(30, 65)

        for _ in range(num_connections):
            domain, default_cat = random.choice(domain_pool)
            classification = classifier.classify(domain)
            category = classification.category if classification.category != "unknown" else default_cat
            conn_time = now - timedelta(minutes=random.randint(2, 1400))

            await db.record_connection(
                sni_domain=domain,
                classification=category,
                device_mac=mac,
                destination_ip=f"198.51.100.{random.randint(10, 250)}",
                list_source=classification.source,
                timestamp=conn_time,
            )
            connections.append({"sni_domain": domain, "classification": category, "timestamp": conn_time})

        # Calculate scores and record history timeline
        # Generate timeline points over past 12 hours
        for h in range(6, -1, -1):
            t = now - timedelta(hours=h * 2)
            subset = [c for c in connections if c["timestamp"] <= t] or connections[:10]
            score_res = calculate_privacy_score(subset, device_mac=mac, computed_at=t)
            await db.record_score(
                device_mac=mac,
                score=score_res.score,
                tracker_count=score_res.tracker_count + score_res.ad_network_count,
                total_count=score_res.total_count,
                computed_at=t,
            )

    print("[+] Done! All Wi-Fi devices now have full TLS handshakes, categories, and score histories.")


if __name__ == "__main__":
    asyncio.run(main())
