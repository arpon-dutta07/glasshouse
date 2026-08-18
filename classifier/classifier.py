"""Main Domain Classifier engine for Glasshouse."""

from dataclasses import dataclass
import logging
from typing import Dict, List, Optional, Set
from classifier.trie import SuffixDomainTrie
from classifier.blocklist_loader import BlocklistLoader, DEFAULT_SOURCES

logger = logging.getLogger(__name__)


@dataclass
class DomainClassification:
    domain: str
    category: str  # 'tracker' | 'ad_network' | 'first_party' | 'unknown'
    is_blocked: bool
    source: str
    matched_rule: Optional[str] = None


class DomainClassifier:
    """Classifies domain names into privacy categories using a high-performance trie."""

    def __init__(self, cache_dir: str = "data/blocklists"):
        self.loader = BlocklistLoader(cache_dir=cache_dir)
        self.trie = SuffixDomainTrie()
        self.custom_allowlist: Set[str] = set()
        self.custom_blocklist: Dict[str, str] = {}  # domain -> category
        self.is_loaded = False

    def load_rules(self, download_remote: bool = False):
        """Loads seed rules and optional public lists into the trie."""
        # 1. Load seed rules
        seed_rules = self.loader.load_seed_rules()
        for domain, category, source in seed_rules:
            self.trie.insert(domain, category=category, source=source)

        # 2. Optionally load remote blocklists (e.g. StevenBlack)
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

    def classify(self, domain: str) -> DomainClassification:
        """Classifies a domain name into tracker, ad_network, first_party, or unknown."""
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

        # 3. Trie lookup for blocklist / first-party seed rules
        match = self.trie.match(domain)
        if match:
            category, source, rule = match
            is_blocked = category in ("tracker", "ad_network")
            return DomainClassification(
                domain=domain,
                category=category,
                is_blocked=is_blocked,
                source=source,
                matched_rule=rule,
            )

        # 4. Unknown domain
        return DomainClassification(
            domain=domain,
            category="unknown",
            is_blocked=False,
            source="none",
            matched_rule=None,
        )
