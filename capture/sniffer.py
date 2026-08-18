"""Live and PCAP packet sniffer for TLS handshakes with TCP stream reassembly.

Sniffs traffic on tcp port 443 and extracts SNI records.
"""

from datetime import datetime, timezone
import logging
from typing import Callable, Optional
from scapy.all import sniff, IP, IPv6, TCP, Ether, Packet, Raw
from capture.tls_parser import TLSParser, SNIRecord
from capture.reassembler import TCPReassembler

logger = logging.getLogger(__name__)


class PacketSniffer:
    """Sniffs network packets on TCP port 443 and parses TLS ClientHello SNI with stream reassembly."""

    def __init__(
        self,
        interface: Optional[str] = None,
        on_sni_extracted: Optional[Callable[[SNIRecord], None]] = None,
        bpf_filter: str = "tcp port 443",
        timeout_seconds: float = 10.0,
    ):
        self.interface = interface
        self.on_sni_extracted = on_sni_extracted
        self.bpf_filter = bpf_filter
        self.reassembler = TCPReassembler(
            timeout_seconds=timeout_seconds,
            on_sni_extracted=on_sni_extracted,
        )
        self.is_running = False

    def process_packet(self, packet: Packet) -> Optional[SNIRecord]:
        """Processes a single raw packet, delegating to TCPReassembler."""
        if not packet.haslayer(TCP):
            return None

        tcp_layer = packet[TCP]
        payload = bytes(tcp_layer.payload)

        # Extract IP and MAC info
        src_ip = "0.0.0.0"
        dst_ip = "0.0.0.0"
        if packet.haslayer(IP):
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
        elif packet.haslayer(IPv6):
            src_ip = packet[IPv6].src
            dst_ip = packet[IPv6].dst

        src_mac = None
        if packet.haslayer(Ether):
            src_mac = packet[Ether].src.lower()

        return self.reassembler.handle_tcp_packet(
            src_ip=src_ip,
            src_port=tcp_layer.sport,
            dst_ip=dst_ip,
            dst_port=tcp_layer.dport,
            seq=tcp_layer.seq,
            payload=payload,
            flags=int(tcp_layer.flags),
            src_mac=src_mac,
        )

    def start(self, count: int = 0, timeout: Optional[int] = None):
        """Starts live packet sniffing."""
        self.is_running = True
        logger.info(f"Starting packet sniffer on filter '{self.bpf_filter}' (interface={self.interface})")
        try:
            sniff(
                iface=self.interface,
                filter=self.bpf_filter,
                prn=self.process_packet,
                count=count,
                timeout=timeout,
                store=0,
            )
        finally:
            self.is_running = False
