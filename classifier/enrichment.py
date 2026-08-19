"""Domain Enrichment Service for Layer 3 Unclassified Domains Fallback.

Extracts secondary signals:
1. WHOIS / RDAP Registration Age (young domains < 30 days are elevated risk).
2. TLS Certificate Inspection (Organization 'O' field).
3. Hosting Provider / ASN Detection (AWS, Google Cloud, Cloudflare, Akamai, Fastly, Azure, etc.).
4. Descriptive synthesis of reputation context.
"""

import socket
import ssl
import time
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple, List
import requests

logger = logging.getLogger(__name__)

# Known cloud/CDN IP prefix heuristics and PTR matches
CLOUD_PROVIDERS = [
    ("Cloudflare", ["cloudflare", "104.", "172.64.", "172.65.", "172.66.", "172.67."]),
    ("Amazon Web Services (AWS)", ["aws", "cloudfront", "amazonaws", "52.", "54.", "3.", "13."]),
    ("Google Cloud", ["1e100", "google", "34.", "35."]),
    ("Microsoft Azure", ["azure", "microsoft", "20.", "40.", "51."]),
    ("Akamai", ["akamai", "akamaiedge", "23."]),
    ("Fastly", ["fastly", "151.101."]),
    ("DigitalOcean", ["digitalocean", "159.203.", "165.227."]),
    ("Hetzner", ["hetzner", "your-server.de"]),
    ("Oracle Cloud", ["oraclecloud", "129.213."]),
]


@dataclass
class DomainEnrichment:
    domain: str
    ip_address: Optional[str]
    created_year: Optional[int]
    age_days: Optional[int]
    cert_org: Optional[str]
    hosting_provider: Optional[str]
    summary_label: str
    is_newly_registered: bool
    enriched_at: float


class DomainEnrichmentService:
    """Provides deep metadata enrichment for network domains."""

    def __init__(self, cache_ttl_hours: int = 48):
        self.cache_ttl_seconds = cache_ttl_hours * 3600
        self._memory_cache: Dict[str, DomainEnrichment] = {}

    def get_tls_cert_org(self, domain: str, timeout: float = 2.0) -> Optional[str]:
        """Inspects remote TLS certificate over port 443 to extract Organization (O)."""
        try:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            with socket.create_connection((domain, 443), timeout=timeout) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert(binary_form=False)
                    if cert and "subject" in cert:
                        for rdn in cert["subject"]:
                            for key, val in rdn:
                                if key == "organizationName" and val:
                                    return str(val)
        except Exception:
            pass
        return None

    def get_hosting_provider(self, domain: str) -> Tuple[Optional[str], Optional[str]]:
        """Resolves domain IP and identifies hosting provider or cloud network."""
        try:
            ip = socket.gethostbyname(domain)
        except Exception:
            return None, None

        # Check PTR hostname
        ptr = ""
        try:
            ptr_res = socket.gethostbyaddr(ip)
            if ptr_res and ptr_res[0]:
                ptr = ptr_res[0].lower()
        except Exception:
            pass

        for provider_name, indicators in CLOUD_PROVIDERS:
            for ind in indicators:
                if (ptr and ind in ptr) or ip.startswith(ind):
                    return ip, provider_name

        if ptr:
            return ip, f"Host: {ptr}"
        return ip, "Independent / Private Host"

    def get_whois_age(self, domain: str, timeout: int = 3) -> Tuple[Optional[int], Optional[int]]:
        """Queries RDAP to determine domain registration year and age in days."""
        try:
            url = f"https://rdap.org/domain/{domain}"
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                data = resp.json()
                events = data.get("events", [])
                for ev in events:
                    if ev.get("eventAction") == "registration":
                        reg_date_str = ev.get("eventDate")
                        if reg_date_str:
                            reg_dt = datetime.fromisoformat(reg_date_str.replace("Z", "+00:00"))
                            now_dt = datetime.now(timezone.utc)
                            age_days = (now_dt - reg_dt).days
                            return reg_dt.year, age_days
        except Exception:
            pass
        return None, None

    def enrich_domain(self, domain: str) -> DomainEnrichment:
        """Runs full Layer 3 enrichment analysis on a domain."""
        domain = domain.lower().strip().rstrip(".")
        if not domain:
            return DomainEnrichment(
                domain="",
                ip_address=None,
                created_year=None,
                age_days=None,
                cert_org=None,
                hosting_provider=None,
                summary_label="Empty domain",
                is_newly_registered=False,
                enriched_at=time.time(),
            )

        # Check cache
        if domain in self._memory_cache:
            item = self._memory_cache[domain]
            if (time.time() - item.enriched_at) < self.cache_ttl_seconds:
                return item

        # Perform lookups
        ip, provider = self.get_hosting_provider(domain)
        cert_org = self.get_tls_cert_org(domain)
        created_year, age_days = self.get_whois_age(domain)

        is_new = bool(age_days is not None and age_days < 30)

        # Synthesize honest, descriptive context
        parts = ["Unclassified"]
        if created_year:
            if is_new:
                parts.append(f"registered {age_days} days ago (new domain)")
            else:
                parts.append(f"registered {created_year}")
        if cert_org:
            parts.append(f"TLS Cert: {cert_org}")
        if provider:
            parts.append(f"hosted on {provider}")
        
        if len(parts) == 1:
            summary = "Unclassified — no tracker/threat match found; insufficient public reputation data."
        else:
            summary = " — ".join([parts[0], ", ".join(parts[1:]) + "; no tracker/threat match found."])

        enrichment = DomainEnrichment(
            domain=domain,
            ip_address=ip,
            created_year=created_year,
            age_days=age_days,
            cert_org=cert_org,
            hosting_provider=provider,
            summary_label=summary,
            is_newly_registered=is_new,
            enriched_at=time.time(),
        )
        self._memory_cache[domain] = enrichment
        return enrichment
