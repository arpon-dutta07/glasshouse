"""Main Domain Classifier engine for Glasshouse.

Multi-Layer Architecture:
- Layer 1: Merged public and seed blocklists (StevenBlack, Disconnect, EasyPrivacy, EasyList, OISD).
- Layer 2: Malicious / Threat Detection (URLhaus and VirusTotal v3 with vendor consensus >= 3).
- Layer 3: Secondary signal enrichment fallback (WHOIS age, TLS cert organization, Cloud host).
"""

from dataclasses import dataclass
import logging
from typing import Dict, List, Optional, Set
from classifier.trie import SuffixDomainTrie
from classifier.blocklist_loader import BlocklistLoader, DEFAULT_SOURCES
from classifier.threat_intel import ThreatIntelService, ThreatReport
from classifier.enrichment import DomainEnrichmentService

logger = logging.getLogger(__name__)


@dataclass
class DomainClassification:
    domain: str
    category: str  # 'tracker' | 'ad_network' | 'malicious' | 'first_party' | 'unknown'
    is_blocked: bool
    source: str
    matched_rule: Optional[str] = None
    threat_vendors: int = 0
    threat_details: Optional[str] = None
    summary_label: Optional[str] = None


class DomainClassifier:
    """Classifies domain names into privacy categories using multi-layer pipeline."""

    def __init__(
        self,
        cache_dir: str = "data/blocklists",
        threat_intel: Optional[ThreatIntelService] = None,
        enrichment: Optional[DomainEnrichmentService] = None,
    ):
        self.loader = BlocklistLoader(cache_dir=cache_dir)
        self.trie = SuffixDomainTrie()
        self.threat_intel = threat_intel or ThreatIntelService()
        self.enrichment = enrichment or DomainEnrichmentService()
        self.custom_allowlist: Set[str] = set()
        self.custom_blocklist: Dict[str, str] = {}  # domain -> category
        self.is_loaded = False

    def load_rules(self, download_remote: bool = False):
        """Loads seed rules and optional public lists into the trie."""
        # 1. Load seed rules
        seed_rules = self.loader.load_seed_rules()
        for domain, category, source in seed_rules:
            self.trie.insert(domain, category=category, source=source)

        # 2. Optionally load remote blocklists (e.g. StevenBlack, EasyPrivacy)
        if download_remote:
            for name, config in DEFAULT_SOURCES.items():
                rules = self.loader.load_cached_or_download(
                    name=name,
                    url=config["url"],
                    category=config["category"],
                )
                for domain, category, source in rules:
                    self.trie.insert(domain, category=category, source=source)

        self.is_loaded = True
        logger.info(f"Domain classifier initialized with {len(self.trie)} rules.")

    def add_custom_allowlist(self, domain: str):
        """Adds a domain to user allowlist (always classifies as first_party / benign)."""
        self.custom_allowlist.add(domain.lower().strip())

    def remove_custom_allowlist(self, domain: str):
        self.custom_allowlist.discard(domain.lower().strip())

    def add_custom_blocklist(self, domain: str, category: str = "tracker"):
        """Adds a domain to user custom blocklist."""
        self.custom_blocklist[domain.lower().strip()] = category

    def remove_custom_blocklist(self, domain: str):
        self.custom_blocklist.pop(domain.lower().strip(), None)

    def classify(self, domain: str, check_threat_intel: bool = True) -> DomainClassification:
        """Classifies a domain name into first_party, tracker, ad_network, malicious, or unknown."""
        if not self.is_loaded:
            self.load_rules()

        domain = domain.lower().strip().rstrip(".")
        if not domain:
            return DomainClassification(
                domain="",
                category="unknown",
                is_blocked=False,
                source="empty",
                matched_rule=None,
            )

        # 1. Check custom allowlist (Highest priority)
        if domain in self.custom_allowlist:
            return DomainClassification(
                domain=domain,
                category="first_party",
                is_blocked=False,
                source="custom_allowlist",
                matched_rule=domain,
            )
        for allowed in self.custom_allowlist:
            if domain == allowed or domain.endswith("." + allowed):
                return DomainClassification(
                    domain=domain,
                    category="first_party",
                    is_blocked=False,
                    source="custom_allowlist",
                    matched_rule=allowed,
                )

        # 2. Check custom blocklist (High priority)
        if domain in self.custom_blocklist:
            cat = self.custom_blocklist[domain]
            return DomainClassification(
                domain=domain,
                category=cat,
                is_blocked=True,
                source="custom_blocklist",
                matched_rule=domain,
            )
        for blocked, cat in self.custom_blocklist.items():
            if domain == blocked or domain.endswith("." + blocked):
                return DomainClassification(
                    domain=domain,
                    category=cat,
                    is_blocked=True,
                    source="custom_blocklist",
                    matched_rule=blocked,
                )

        # 3. Layer 1: Suffix Trie lookup for blocklist / first-party seed rules
        match = self.trie.match(domain)
        if match:
            category, source, rule = match
            is_blocked = category in ("tracker", "ad_network", "malicious")
            return DomainClassification(
                domain=domain,
                category=category,
                is_blocked=is_blocked,
                source=source,
                matched_rule=rule,
            )

        # 4. Layer 2: Check Threat Intelligence (URLhaus / VirusTotal)
        if check_threat_intel and self.threat_intel:
            threat_report = self.threat_intel.evaluate_domain(domain)
            if threat_report.is_malicious:
                return DomainClassification(
                    domain=domain,
                    category="malicious",
                    is_blocked=True,
                    source=threat_report.source,
                    matched_rule=domain,
                    threat_vendors=threat_report.vendor_count,
                    threat_details=threat_report.details,
                )

        # 5. Layer 3: Unknown / Unclassified Domain fallback
        return DomainClassification(
            domain=domain,
            category="unknown",
            is_blocked=False,
            source="none",
            matched_rule=None,
        )
