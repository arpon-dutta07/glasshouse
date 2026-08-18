"""Unit tests for TCP stream reassembly of fragmented TLS ClientHellos."""

import time
import pytest
from capture.reassembler import TCPReassembler
from capture.tls_parser import SNIRecord
from tests.test_tls_parser import build_client_hello


def test_reassembly_two_fragments():
    domain = "fragmented-example.analytics.google.com"
    full_payload = build_client_hello(domain)
    split_idx = len(full_payload) // 2

    part1 = full_payload[:split_idx]
    part2 = full_payload[split_idx:]

    reassembler = TCPReassembler(timeout_seconds=5.0)

    # First segment: partial payload
    rec1 = reassembler.handle_tcp_packet(
        src_ip="192.168.1.50",
        src_port=49152,
        dst_ip="142.250.190.46",
        dst_port=443,
        seq=1000,
        payload=part1,
        src_mac="00:11:22:33:44:55",
    )
    assert rec1 is None, "Should not produce record from partial segment"

    # Second segment: remaining payload
    rec2 = reassembler.handle_tcp_packet(
        src_ip="192.168.1.50",
        src_port=49152,
        dst_ip="142.250.190.46",
        dst_port=443,
        seq=1000 + len(part1),
        payload=part2,
        src_mac="00:11:22:33:44:55",
    )

    assert rec2 is not None, "Should produce record once reassembled"
    assert rec2.sni_domain == domain
    assert rec2.src_ip == "192.168.1.50"
    assert rec2.src_mac == "00:11:22:33:44:55"
    assert len(reassembler.streams) == 0, "Stream buffer should be cleaned up after completion"


def test_reassembly_three_fragments_out_of_order():
    domain = "telemetry.smarttv.samsung.com"
    full_payload = build_client_hello(domain)
    
    # Split into 3 parts
    p1 = full_payload[:40]
    p2 = full_payload[40:100]
    p3 = full_payload[100:]

    reassembler = TCPReassembler(timeout_seconds=5.0)

    # Arrive in order: p1, then p3 (gap), then p2
    rec1 = reassembler.handle_tcp_packet(
        src_ip="192.168.1.60", src_port=50000, dst_ip="1.2.3.4", dst_port=443,
        seq=1000, payload=p1,
    )
    assert rec1 is None

    rec3 = reassembler.handle_tcp_packet(
        src_ip="192.168.1.60", src_port=50000, dst_ip="1.2.3.4", dst_port=443,
        seq=1000 + len(p1) + len(p2), payload=p3,
    )
    assert rec3 is None

    rec2 = reassembler.handle_tcp_packet(
        src_ip="192.168.1.60", src_port=50000, dst_ip="1.2.3.4", dst_port=443,
        seq=1000 + len(p1), payload=p2,
    )
    assert rec2 is not None
    assert rec2.sni_domain == domain


def test_reassembler_stream_expiry():
    domain = "expired-stream.com"
    full_payload = build_client_hello(domain)
    part1 = full_payload[:30]

    # Reassembler with 0.1s timeout
    reassembler = TCPReassembler(timeout_seconds=0.1)

    reassembler.handle_tcp_packet(
        src_ip="192.168.1.70", src_port=55555, dst_ip="9.9.9.9", dst_port=443,
        seq=500, payload=part1,
    )
    assert len(reassembler.streams) == 1

    time.sleep(0.2)
    # Trigger cleanup with dummy packet
    reassembler.handle_tcp_packet(
        src_ip="192.168.1.80", src_port=55556, dst_ip="9.9.9.9", dst_port=443,
        seq=1, payload=b"non_tls",
    )
    assert len(reassembler.streams) == 0, "Expired stream should be evicted"


def test_reassembler_rst_fin():
    domain = "rst-stream.com"
    full_payload = build_client_hello(domain)
    part1 = full_payload[:30]

    reassembler = TCPReassembler(timeout_seconds=10.0)
    reassembler.handle_tcp_packet(
        src_ip="192.168.1.90", src_port=60000, dst_ip="8.8.8.8", dst_port=443,
        seq=100, payload=part1,
    )
    assert len(reassembler.streams) == 1

    # Send RST (flag 0x04)
    reassembler.handle_tcp_packet(
        src_ip="192.168.1.90", src_port=60000, dst_ip="8.8.8.8", dst_port=443,
        seq=130, payload=b"", flags=0x04,
    )
    assert len(reassembler.streams) == 0, "RST should immediately evict stream"
