"""Blocklist downloader, parser, and caching manager for Layer 1 multi-source merging."""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Set, Tuple
import requests

logger = logging.getLogger(__name__)

# Default public blocklist sources merged in Layer 1
DEFAULT_SOURCES = {
    "stevenblack_unified": {
        "url": "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
        "category": "tracker",
    },
    "easyprivacy": {
        "url": "https://v.firebog.net/hosts/Easyprivacy.txt",
        "category": "tracker",
    },
    "easylist_ads": {
        "url": "https://v.firebog.net/hosts/Easylist.txt",
        "category": "ad_network",
    },
    "oisd_basic": {
        "url": "https://big.oisd.nl/domainswg",
        "category": "ad_network",
    },
}

# Curated embedded rules for instant offline initialization & tests
SEED_RULES: Dict[str, List[str]] = {
    "ad_network": [
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
        "adservice.google.com",
        "adnxs.com",
        "criteo.com",
        "criteo.net",
        "taboola.com",
        "outbrain.com",
        "popads.net",
        "adcolony.com",
        "applovin.com",
        "unityads.unity3d.com",
        "vungle.com",
        "amazon-adsystem.com",
        "admob.com",
        "rubiconproject.com",
        "pubmatic.com",
        "openx.net",
        "smartadserver.com",
        "advertising.com",
        "yieldmo.com",
        "inmobi.com",
        "ironsrc.com",
        "chartboost.com",
        "adroll.com",
    ],
    "tracker": [
        "google-analytics.com",
        "analytics.google.com",
        "hotjar.com",
        "mixpanel.com",
        "segment.io",
        "segment.com",
        "amplitude.com",
        "sentry.io",
        "bugsnag.com",
        "newrelic.com",
        "nr-data.net",
        "clarity.ms",
        "branch.io",
        "adjust.com",
        "appsflyer.com",
        "kochava.com",
        "telemetry.samsung.com",
        "samsungcloudplatform.com",
        "log-upload.samsungcloudsolution.com",
        "telemetry.microsoft.com",
        "v10.events.data.microsoft.com",
        "v20.events.data.microsoft.com",
        "watson.telemetry.microsoft.com",
        "diagnostics.apple.com",
        "iadsdk.apple.com",
        "graph.facebook.com",
        "pixel.facebook.com",
        "analytics.tiktok.com",
        "log.byteoversea.com",
        "metrics.icloud.com",
        "crashlytics.com",
        "flurry.com",
        "app-measurement.com",
        "scorecardresearch.com",
        "quantserve.com",
        "yandex.ru/metrika",
        "mc.yandex.ru",
        "braze.com",
        "mparticle.com",
        "singular.net",
        "heap.io",
        "fullstory.com",
    ],
    "malicious": [
        "malware-delivery.test",
        "phishing-gateway.cc",
        "c2-payload.top",
        "trojan-drop.xyz",
        "lockbit-ransom.onion.pet",
    ],
    "first_party": [
        "google.com",
        "youtube.com",
        "apple.com",
        "icloud.com",
        "microsoft.com",
        "github.com",
        "wikipedia.org",
        "amazon.com",
        "netflix.com",
        "spotify.com",
        "cloudflare.com",
        "mozilla.org",
        "python.org",
        "archlinux.org",
        "ubuntu.com",
        "debian.org",
        "duckduckgo.com",
        "openai.com",
        "anthropic.com",
    ]
}


class BlocklistLoader:
    """Loads, caches, and parses domain blocklists."""

    def __init__(self, cache_dir: str = "data/blocklists"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def parse_domains_text(self, text: str) -> Set[str]:
        """Parses /etc/hosts, EasyList/EasyPrivacy text, or plain domain list formats."""
        domains = set()
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("!"):
                continue
            # Strip inline comments
            line = line.split("#")[0].strip()
            # Strip Adblock Plus filter syntax (e.g. ||domain.com^ or ||domain.com^)
            if line.startswith("||") and "^" in line:
                line = line.replace("||", "").split("^")[0].strip()
            tokens = line.split()
            if len(tokens) >= 2:
                ip, domain = tokens[0], tokens[1]
                if ip in ("0.0.0.0", "127.0.0.1") and domain not in ("localhost", "local", "broadcasthost"):
                    domains.add(domain.lower().rstrip("."))
            elif len(tokens) == 1:
                clean_dom = tokens[0].lower().rstrip(".").lstrip("*.")
                if "." in clean_dom and not clean_dom.startswith("/"):
                    domains.add(clean_dom)
        return domains

    def load_seed_rules(self) -> List[Tuple[str, str, str]]:
        """Returns the built-in curated seed rules (domain, category, source)."""
        rules = []
        for category, domains in SEED_RULES.items():
            for domain in domains:
                rules.append((domain, category, "seed"))
        return rules

    def load_cached_or_download(
        self,
        name: str,
        url: str,
        category: str = "tracker",
        force_refresh: bool = False,
        timeout: int = 8,
    ) -> List[Tuple[str, str, str]]:
        """Loads a blocklist from disk cache or downloads it from remote URL."""
        cache_file = self.cache_dir / f"{name}.txt"
        rules = []

        if cache_file.exists() and not force_refresh:
            logger.info(f"Loading blocklist '{name}' from local cache {cache_file}")
            text = cache_file.read_text(encoding="utf-8", errors="ignore")
            domains = self.parse_domains_text(text)
            for d in domains:
                rules.append((d, category, name))
            return rules

        try:
            logger.info(f"Downloading blocklist '{name}' from {url}")
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                cache_file.write_text(resp.text, encoding="utf-8")
                domains = self.parse_domains_text(resp.text)
                for d in domains:
                    rules.append((d, category, name))
                logger.info(f"Loaded {len(domains)} rules from {name}")
                return rules
        except Exception as e:
            logger.warning(f"Failed to download blocklist '{name}': {e}. Falling back to cached/seed rules.")

        if cache_file.exists():
            text = cache_file.read_text(encoding="utf-8", errors="ignore")
            domains = self.parse_domains_text(text)
            for d in domains:
                rules.append((d, category, name))

        return rules
