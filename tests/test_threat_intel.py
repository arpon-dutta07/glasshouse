"""Unit tests for Threat Intelligence Service (Layer 2 Malicious Detection)."""

import pytest
from classifier.threat_intel import ThreatIntelService, ThreatReport


def test_threat_intel_clean_domain():
    service = ThreatIntelService()
    report = service.evaluate_domain("wikipedia.org")
    assert report.domain == "wikipedia.org"
    assert report.is_malicious is False
    assert report.vendor_count == 0


def test_threat_intel_known_malicious_domain():
    service = ThreatIntelService()
    report = service.evaluate_domain("malware-delivery.test")
    assert report.domain == "malware-delivery.test"
    assert report.is_malicious is True
    assert report.vendor_count >= 3
    assert "VirusTotal" in report.source or "URLhaus" in report.source


def test_threat_intel_caching():
    service = ThreatIntelService()
    # First call
    rep1 = service.evaluate_domain("clean-cache-test.org")
    # Second call should hit memory cache
    rep2 = service.evaluate_domain("clean-cache-test.org")
    assert rep1.checked_at == rep2.checked_at


def test_threat_intel_mock_urlhaus_response(monkeypatch):
    service = ThreatIntelService()

    def mock_check_urlhaus(domain, timeout=4):
        if domain == "badpayload.biz":
            return True, 6, "Listed in URLhaus (6 malicious payloads)"
        return False, 0, "No threats"

    monkeypatch.setattr(service, "check_urlhaus", mock_check_urlhaus)

    rep = service.evaluate_domain("badpayload.biz")
    assert rep.is_malicious is True
    assert rep.vendor_count == 6
    assert rep.source == "URLhaus"
