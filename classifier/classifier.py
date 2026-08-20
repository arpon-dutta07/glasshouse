"""Main Domain Classifier engine for Glasshouse.

Multi-Layer Architecture:
- Layer 1: Custom allow/block lists (highest priority).
- Layer 2: Merged public and seed blocklists via suffix trie (StevenBlack, Disconnect, EasyPrivacy, EasyList, OISD).
- Layer 3: Malicious / Threat Detection (URLhaus and VirusTotal v3 with vendor consensus >= 3).
- Layer 4: Heuristic domain-name pattern analysis (keyword, parent-domain, and subdomain signals).
- Layer 5: Fallback to "unknown" only if no signal matches.
"""

import re
from dataclasses import dataclass
import logging
from typing import Dict, List, Optional, Set, Tuple
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


# ----- Heuristic Pattern Engine (Layer 4) -----

# Tracker keyword signals found in domain names
TRACKER_KEYWORDS = [
    "analytics", "telemetry", "tracking", "tracker", "metrics",
    "pixel", "beacon", "collect", "measure", "event-log",
    "log-upload", "crash-report", "crashlytics", "diagnostics",
    "reporting", "stat.", "stats.", "counter", "insight",
    "clickstream", "clicktrack", "attribution", "fingerprint",
    "heartbeat", "session-replay", "heatmap", "recording",
    "pageview", "conversion", "funnel", "retarget",
    "app-measurement", "data-collection", "usage-report",
    "performance-monitor", "real-user-monitor", "rum.",
    "trace.", "tracing.", "monitor.", "observ",
]

# Ad network keyword signals
AD_KEYWORDS = [
    "adserver", "adservice", "adtech", "adnetwork", "ad-network",
    "adsystem", "adexchange", "bidding", "rtb.", "dsp.",
    "ssp.", "demand-side", "supply-side", "programmatic",
    "syndication", "pagead", "advert", "banner-ad",
    "native-ad", "interstitial", "rewarded-ad", "preroll",
    "midroll", "postroll", "vast.", "vpaid",
    "ad-delivery", "ad-serving", "sponsor", "promoted",
    "adsrvr", "adform", "bidswitch",
]

# Known first-party parent domains (root org domains that serve core functionality)
FIRST_PARTY_PARENT_DOMAINS = {
    # Google ecosystem (non-tracking services)
    "googleapis.com", "gstatic.com", "googleusercontent.com", "googlevideo.com",
    "google.com", "gvt1.com", "gvt2.com", "ggpht.com", "1e100.net",
    "googlezip.net", "youtube.com", "ytimg.com",
    "chromium.org", "chrome.com", "android.com",
    # Microsoft ecosystem (non-tracking)
    "microsoft.com", "windows.com", "windows.net", "office.com", "office365.com",
    "live.com", "live.net", "msedge.net", "azureedge.net", "azure.com",
    "microsoftonline.com", "windowsupdate.com", "msftauth.net",
    "visualstudio.com", "aspnetcdn.com", "msauth.net",
    "skype.com", "teams.microsoft.com", "onecdn.static.microsoft", "microsoft",
    # Apple (non-tracking)
    "apple.com", "icloud.com", "icloud-content.com", "mzstatic.com",
    "cdn-apple.com", "apple-dns.net",
    # Amazon / AWS
    "amazonaws.com", "cloudfront.net", "amazon.com", "ssl-images-amazon.com",
    "media-amazon.com",
    # CDN / Infrastructure
    "cloudflare.com", "cloudflare-dns.com", "akamai.com", "akamaized.net",
    "akamaihd.net", "fastly.net", "fastlylb.net", "edgekey.net",
    "edgesuite.net", "jsdelivr.net", "unpkg.com", "lencr.org",
    "stackpath.com", "maxcdn.com", "bootstrapcdn.com",
    # Social media core content delivery
    "facebook.com", "fbcdn.net", "fbsbx.com", "fb.com",
    "instagram.com", "cdninstagram.com",
    "twitter.com", "x.com", "twimg.com", "t.co",
    "reddit.com", "redd.it", "redditstatic.com", "redditmedia.com",
    "linkedin.com", "licdn.com",
    "tiktok.com", "tiktokcdn.com",
    "discord.com", "discordapp.com", "discordapp.net",
    "whatsapp.com", "whatsapp.net",
    "pinterest.com", "pinimg.com",
    "snapchat.com", "snap.com", "sc-cdn.net",
    "telegram.org", "t.me",
    # Streaming
    "netflix.com", "nflxvideo.net", "nflximg.net", "nflxext.com",
    "spotify.com", "scdn.co", "spotifycdn.com",
    "twitch.tv", "jtvnw.net", "twitchcdn.net",
    "disneyplus.com", "bamgrid.com", "dssott.com",
    # Dev / package registries
    "github.com", "githubusercontent.com", "githubassets.com", "github.io",
    "gitlab.com", "npmjs.org", "npmjs.com", "pypi.org", "pythonhosted.org",
    "docker.com", "docker.io", "nuget.org", "rubygems.org", "crates.io",
    "vercel.com", "vercel.app", "netlify.com", "netlify.app",
    "heroku.com", "herokuapp.com", "firebaseio.com", "firebaseapp.com",
    "supabase.co",
    # Knowledge / productivity
    "wikipedia.org", "wikimedia.org", "medium.com",
    "notion.so", "notion.com", "slack.com", "slack-edge.com",
    "atlassian.com", "atlassian.net", "zoom.us",
    # AI platforms
    "openai.com", "anthropic.com", "claude.ai", "deepmind.com",
    "huggingface.co", "perplexity.ai",
    # Adobe
    "adobe.com", "typekit.net", "creativecloud.com", "behance.net",
    # Gaming
    "steampowered.com", "steamstatic.com", "epicgames.com",
    "valve.net", "riotgames.com", "battle.net",
    # Payments
    "paypal.com", "stripe.com", "razorpay.com",
    # Security / certs
    "letsencrypt.org", "digicert.com", "globalsign.com",
    # Indian services
    "jio.com", "hotstar.com", "flipkart.com", "swiggy.com", "zomato.com",
    "paytm.com", "phonepe.com",
    # Misc
    "wordpress.com", "wordpress.org", "wp.com", "gravatar.com",
    "altruistics.org", "mozilla.org", "python.org",
    "archlinux.org", "ubuntu.com", "debian.org",
    "duckduckgo.com", "proton.me", "protonmail.com",
    "shopify.com", "ebay.com", "etsy.com",
    "bbc.com", "cnn.com", "nytimes.com", "reuters.com",
    "fontawesome.com", "fontsource.org",
}

# Known tracker/ad parent domains (if a subdomain of these, classify accordingly)
TRACKER_PARENT_DOMAINS: Dict[str, str] = {
    "google-analytics.com": "tracker",
    "doubleclick.net": "ad_network",
    "googlesyndication.com": "ad_network",
    "googleadservices.com": "ad_network",
    "googletagmanager.com": "tracker",
    "app-measurement.com": "tracker",
    "crashlytics.com": "tracker",
    "hotjar.com": "tracker",
    "mixpanel.com": "tracker",
    "segment.io": "tracker",
    "segment.com": "tracker",
    "amplitude.com": "tracker",
    "sentry.io": "tracker",
    "clarity.ms": "tracker",
    "newrelic.com": "tracker",
    "nr-data.net": "tracker",
    "bugsnag.com": "tracker",
    "branch.io": "tracker",
    "adjust.com": "tracker",
    "appsflyer.com": "tracker",
    "fullstory.com": "tracker",
    "heap.io": "tracker",
    "braze.com": "tracker",
    "mparticle.com": "tracker",
    "onesignal.com": "tracker",
    "intercom.io": "tracker",
    "flurry.com": "tracker",
    "datadog.com": "tracker",
    "logrocket.com": "tracker",
    "rollbar.com": "tracker",
    "scorecardresearch.com": "tracker",
    "quantserve.com": "tracker",
    "comscore.com": "tracker",
    "hubspot.com": "tracker",
    "marketo.com": "tracker",
    "optimizely.com": "tracker",
    "criteo.com": "ad_network",
    "criteo.net": "ad_network",
    "taboola.com": "ad_network",
    "outbrain.com": "ad_network",
    "adnxs.com": "ad_network",
    "pubmatic.com": "ad_network",
    "rubiconproject.com": "ad_network",
    "openx.net": "ad_network",
    "adcolony.com": "ad_network",
    "applovin.com": "ad_network",
    "vungle.com": "ad_network",
    "inmobi.com": "ad_network",
    "ironsrc.com": "ad_network",
    "chartboost.com": "ad_network",
    "adroll.com": "ad_network",
    "amazon-adsystem.com": "ad_network",
    "demdex.net": "ad_network",
    "media.net": "ad_network",
    "adsrvr.org": "ad_network",
    "admob.com": "ad_network",
    "facebook.com/tr": "tracker",
    "connect.facebook.net": "tracker",
    "cookiebot.com": "tracker",
    "onetrust.com": "tracker",
    "fingerprintjs.com": "tracker",
}


def _extract_root_domain(domain: str) -> str:
    """Extracts the registrable root domain (e.g., sub.example.com → example.com)."""
    parts = domain.split(".")
    if len(parts) <= 2:
        return domain
    # Handle known multi-part TLDs
    if len(parts) >= 3 and parts[-2] in ("co", "com", "org", "net", "gov", "ac", "edu"):
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def heuristic_classify(domain: str) -> Optional[Tuple[str, str]]:
    """
    Layer 4: Heuristic domain-name pattern analysis.
    Returns (category, source) or None if no heuristic match.
    """
    # 4a. Check if domain is a subdomain of a known tracker/ad parent
    for parent, category in TRACKER_PARENT_DOMAINS.items():
        if domain == parent or domain.endswith("." + parent):
            return (category, f"heuristic:parent:{parent}")

    # 4b. Check if domain matches a known first-party parent
    for parent in FIRST_PARTY_PARENT_DOMAINS:
        if domain == parent or domain.endswith("." + parent):
            return ("first_party", f"heuristic:first_party:{parent}")

    # 4c. Check the root domain against first-party set
    root = _extract_root_domain(domain)
    if root in FIRST_PARTY_PARENT_DOMAINS:
        return ("first_party", f"heuristic:first_party:{root}")

    # 4d. Keyword analysis on full domain string
    domain_lower = domain.lower()

    # Ad keywords (check first — more specific)
    for kw in AD_KEYWORDS:
        if kw in domain_lower:
            return ("ad_network", f"heuristic:keyword:{kw}")

    # Tracker keywords
    for kw in TRACKER_KEYWORDS:
        if kw in domain_lower:
            return ("tracker", f"heuristic:keyword:{kw}")

    # 4e. Subdomain pattern: "ads." or "ad." or "pixel." or "track." prefix
    labels = domain.split(".")
    if len(labels) >= 3:
        prefix = labels[0]
        if prefix in ("ads", "ad", "pixel", "track", "tracking", "beacon",
                       "metrics", "telemetry", "analytics", "stats", "log",
                       "collector", "events", "data", "reporting"):
            return ("tracker", f"heuristic:prefix:{prefix}")
        if prefix in ("adserver", "adservice", "adtech", "pagead", "sponsor"):
            return ("ad_network", f"heuristic:prefix:{prefix}")

    return None


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
        self._cache: Dict[str, DomainClassification] = {}
        self._cache_max = 5000

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
        self._cache.clear()
        logger.info(f"Domain classifier initialized with {len(self.trie)} rules.")

    def add_custom_allowlist(self, domain: str):
        """Adds a domain to user allowlist (always classifies as first_party / benign)."""
        self.custom_allowlist.add(domain.lower().strip())
        self._cache.pop(domain.lower().strip(), None)

    def remove_custom_allowlist(self, domain: str):
        self.custom_allowlist.discard(domain.lower().strip())
        self._cache.pop(domain.lower().strip(), None)

    def add_custom_blocklist(self, domain: str, category: str = "tracker"):
        """Adds a domain to user custom blocklist."""
        self.custom_blocklist[domain.lower().strip()] = category
        self._cache.pop(domain.lower().strip(), None)

    def remove_custom_blocklist(self, domain: str):
        self.custom_blocklist.pop(domain.lower().strip(), None)
        self._cache.pop(domain.lower().strip(), None)

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

        # Check in-memory cache first
        if domain in self._cache:
            return self._cache[domain]

        result = self._classify_internal(domain, check_threat_intel)

        # Store in cache (evict oldest if full)
        if len(self._cache) >= self._cache_max:
            # Remove first 500 entries to avoid constant eviction
            keys_to_remove = list(self._cache.keys())[:500]
            for k in keys_to_remove:
                del self._cache[k]
        self._cache[domain] = result
        return result

    def _classify_internal(self, domain: str, check_threat_intel: bool) -> DomainClassification:
        """Internal multi-layer classification pipeline."""

        # Layer 1: Check custom allowlist (Highest priority)
        if domain in self.custom_allowlist:
            return DomainClassification(
                domain=domain,
                category="first_party",
                is_blocked=False,
                source="custom_allowlist",
                matched_rule=domain,
            )
        for allowed in self.custom_allowlist:
            if domain.endswith("." + allowed):
                return DomainClassification(
                    domain=domain,
                    category="first_party",
                    is_blocked=False,
                    source="custom_allowlist",
                    matched_rule=allowed,
                )

        # Layer 1b: Check custom blocklist (High priority)
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
            if domain.endswith("." + blocked):
                return DomainClassification(
                    domain=domain,
                    category=cat,
                    is_blocked=True,
                    source="custom_blocklist",
                    matched_rule=blocked,
                )

        # Layer 2: Suffix Trie lookup for blocklist / first-party seed rules
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

        # Layer 3: Check Threat Intelligence (URLhaus / VirusTotal)
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

        # Layer 4: Heuristic domain-name pattern analysis
        heuristic_result = heuristic_classify(domain)
        if heuristic_result:
            category, source = heuristic_result
            is_blocked = category in ("tracker", "ad_network", "malicious")
            return DomainClassification(
                domain=domain,
                category=category,
                is_blocked=is_blocked,
                source=source,
                matched_rule=domain,
            )

        # Layer 5: Unknown / Unclassified Domain fallback
        return DomainClassification(
            domain=domain,
            category="unknown",
            is_blocked=False,
            source="none",
            matched_rule=None,
        )

