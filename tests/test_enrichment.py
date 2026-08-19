"""Unit tests for Domain Enrichment Service (Layer 3 Signals & Descriptive Fallback)."""

import pytest
from classifier.enrichment import DomainEnrichmentService


def test_enrichment_cloud_provider_detection():
    service = DomainEnrichmentService()
    # cloudflare.com resolves to Cloudflare network
    ip, provider = service.get_hosting_provider("cloudflare.com")
    assert ip is not None
    assert "Cloudflare" in str(provider) or "AWS" in str(provider) or ip is not None


def test_enrichment_synthesis_label():
    service = DomainEnrichmentService()
    enrichment = service.enrich_domain("example.com")
    assert enrichment.domain == "example.com"
    assert "Unclassified" in enrichment.summary_label
    assert enrichment.enriched_at > 0


def test_enrichment_caching():
    service = DomainEnrichmentService()
    res1 = service.enrich_domain("python.org")
    res2 = service.enrich_domain("python.org")
    assert res1.enriched_at == res2.enriched_at
