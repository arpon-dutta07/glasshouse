"""Unit tests for HostsBlocker engine and Safety Guardrails."""

import pytest
from pathlib import Path
from backend.hosts_blocker import HostsBlocker, START_MARKER, END_MARKER, PROTECTED_DOMAINS


def test_protected_domains_guardrail(tmp_path):
    hosts_file = tmp_path / "hosts"
    hosts_file.write_text("127.0.0.1 localhost\n", encoding="utf-8")

    blocker = HostsBlocker(hosts_path=str(hosts_file))

    for core_dom in ["google.com", "api.google.com", "microsoft.com", "apple.com", "cloudflare.com"]:
        assert blocker.is_protected_domain(core_dom) is True
        success, msg = blocker.block_domain_in_hosts(core_dom)
        assert success is False
        assert "critical infrastructure" in msg

    # Non-protected tracker domain
    assert blocker.is_protected_domain("tracking.ad-network-corp.com") is False


def test_hosts_block_and_unblock_cycle(tmp_path):
    hosts_file = tmp_path / "hosts"
    initial_content = "127.0.0.1 localhost\n::1 localhost\n"
    hosts_file.write_text(initial_content, encoding="utf-8")

    blocker = HostsBlocker(hosts_path=str(hosts_file))

    # 1. Block first tracker
    success, msg = blocker.block_domain_in_hosts("badtracker.org")
    assert success is True
    content = hosts_file.read_text(encoding="utf-8")
    assert START_MARKER in content
    assert END_MARKER in content
    assert "0.0.0.0 badtracker.org" in content

    # 2. Block second tracker
    success, msg = blocker.block_domain_in_hosts("analytics-spy.net")
    assert success is True
    content = hosts_file.read_text(encoding="utf-8")
    assert "0.0.0.0 badtracker.org" in content
    assert "0.0.0.0 analytics-spy.net" in content

    # Verify existing user entries remain intact
    assert "127.0.0.1 localhost" in content
    assert "::1 localhost" in content

    # 3. Check parsed blocked domains
    blocked_set = blocker.get_currently_blocked_in_hosts()
    assert "badtracker.org" in blocked_set
    assert "analytics-spy.net" in blocked_set

    # 4. Unblock first tracker
    success, msg = blocker.unblock_domain_in_hosts("badtracker.org")
    assert success is True
    content = hosts_file.read_text(encoding="utf-8")
    assert "0.0.0.0 badtracker.org" not in content
    assert "0.0.0.0 analytics-spy.net" in content

    # 5. Unblock second tracker
    success, msg = blocker.unblock_domain_in_hosts("analytics-spy.net")
    assert success is True
    content = hosts_file.read_text(encoding="utf-8")
    assert "0.0.0.0 analytics-spy.net" not in content
