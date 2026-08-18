"""Unit tests for TLS ClientHello SNI parser."""

import pytest
from capture.tls_parser import TLSParser, SNIRecord
from scapy.all import IP, TCP, Ether, Raw


def build_client_hello(hostname: str) -> bytes:
    """Constructs a valid binary TLS 1.2 ClientHello payload with SNI extension."""
    host_bytes = hostname.encode("utf-8")
    
    # Server Name extension payload:
    # 2 bytes list len + 1 byte type (0x00) + 2 bytes name len + name bytes
    sni_name_payload = bytes([0x00]) + len(host_bytes).to_bytes(2, "big") + host_bytes
    sni_ext_payload = len(sni_name_payload).to_bytes(2, "big") + sni_name_payload
    # Extension header: 2 bytes type (0x0000) + 2 bytes ext length + payload
    sni_ext = (0x0000).to_bytes(2, "big") + len(sni_ext_payload).to_bytes(2, "big") + sni_ext_payload
    
    # Extensions block: 2 bytes total extensions length + extension bytes
    extensions = len(sni_ext).to_bytes(2, "big") + sni_ext
    
    # ClientHello body:
    # 2 bytes client version (0x0303)
    # 32 bytes random
    # 1 byte session ID len (0)
    # 2 bytes cipher suites len (2) + 2 bytes cipher suite (0x0035)
    # 1 byte compression methods len (1) + 1 byte compression (0x00)
    # + extensions
    client_version = (0x0303).to_bytes(2, "big")
    random_bytes = b"\x01" * 32
    session_id = b"\x00"
    cipher_suites = (2).to_bytes(2, "big") + b"\x00\x35"
    compression = b"\x01\x00"
    
    ch_body = client_version + random_bytes + session_id + cipher_suites + compression + extensions
    
    # Handshake header: 1 byte type (0x01 ClientHello) + 3 bytes length + body
    handshake = bytes([0x01]) + len(ch_body).to_bytes(3, "big") + ch_body
    
    # TLS Record Header: 1 byte content type (0x16 Handshake) + 2 bytes TLS 1.0 (0x0301) + 2 bytes len + handshake
    record_header = bytes([0x16, 0x03, 0x01]) + len(handshake).to_bytes(2, "big")
    
    return record_header + handshake


def test_extract_sni_valid_domains():
    test_domains = [
        "example.com",
        "api.github.com",
        "google-analytics.com",
        "doubleclick.net",
        "tracker.internal.home",
    ]
    for domain in test_domains:
        payload = build_client_hello(domain)
        extracted = TLSParser.extract_sni(payload)
        assert extracted == domain, f"Failed for domain {domain}"


def test_extract_sni_non_tls():
    # Plain HTTP or garbage bytes
    payload = b"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"
    assert TLSParser.extract_sni(payload) is None

    # Too short bytes
    assert TLSParser.extract_sni(b"\x16\x03\x01") is None


def test_extract_sni_server_hello_or_other_handshake():
    # Handshake type 0x02 (ServerHello) instead of 0x01
    payload = bytes([0x16, 0x03, 0x01, 0x00, 0x10, 0x02, 0x00, 0x00, 0x0c]) + b"\x00" * 12
    assert TLSParser.extract_sni(payload) is None


def test_packet_sniffer_process_packet():
    from capture.sniffer import PacketSniffer
    
    domain = "tracker.telemetry.microsoft.com"
    payload = build_client_hello(domain)
    
    packet = (
        Ether(src="aa:bb:cc:dd:ee:ff", dst="11:22:33:44:55:66")
        / IP(src="192.168.1.105", dst="20.190.159.0")
        / TCP(sport=54321, dport=443)
        / Raw(load=payload)
    )
    
    records = []
    sniffer = PacketSniffer(on_sni_extracted=lambda r: records.append(r))
    record = sniffer.process_packet(packet)
    
    assert record is not None
    assert record.sni_domain == domain
    assert record.src_ip == "192.168.1.105"
    assert record.src_mac == "aa:bb:cc:dd:ee:ff"
    assert record.dst_port == 443
    assert len(records) == 1
