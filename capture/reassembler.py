"""TCP stream reassembler for fragmented TLS ClientHello handshakes.

Buffers TCP segments keyed by 4-tuple (src_ip, src_port, dst_ip, dst_port),
re-orders by sequence number, reassembles contiguous byte streams, and extracts SNI.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
import time
from typing import Callable, Dict, List, Optional, Tuple
from capture.tls_parser import TLSParser, SNIRecord


StreamKey = Tuple[str, int, str, int]


@dataclass
class Segment:
    seq: int
    data: bytes
    timestamp: float


@dataclass
class TCPStream:
    key: StreamKey
    src_mac: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    expected_length: Optional[int] = None
    initial_seq: Optional[int] = None
    segments: List[Segment] = field(default_factory=list)


class TCPReassembler:
    """Manages stream buffers and reassembles fragmented TLS ClientHello packets."""

    def __init__(
        self,
        timeout_seconds: float = 10.0,
        max_streams: int = 10000,
        on_sni_extracted: Optional[Callable[[SNIRecord], None]] = None,
    ):
        self.timeout_seconds = timeout_seconds
        self.max_streams = max_streams
        self.on_sni_extracted = on_sni_extracted
        self.streams: Dict[StreamKey, TCPStream] = {}
        self.last_cleanup = time.time()

    def _cleanup_expired_streams(self, now: float):
        """Flushes streams that have been inactive longer than timeout_seconds."""
        throttle_interval = max(0.05, min(self.timeout_seconds / 2.0, 1.0))
        if (now - self.last_cleanup) < throttle_interval and len(self.streams) < self.max_streams:
            return

        self.last_cleanup = now
        expired_keys = [
            k for k, stream in self.streams.items()
            if (now - stream.last_seen) > self.timeout_seconds
        ]
        for k in expired_keys:
            del self.streams[k]

        # If still exceeding max_streams, evict oldest
        if len(self.streams) > self.max_streams:
            sorted_streams = sorted(self.streams.items(), key=lambda item: item[1].last_seen)
            to_remove = len(self.streams) - self.max_streams
            for k, _ in sorted_streams[:to_remove]:
                del self.streams[k]

    def _assemble_contiguous_data(self, stream: TCPStream) -> bytes:
        """Assembles contiguous payload bytes sorted by sequence number."""
        if not stream.segments:
            return b""

        # Sort segments by sequence number
        sorted_segs = sorted(stream.segments, key=lambda s: s.seq)
        
        # If we know initial sequence number, assemble strictly
        contiguous_bytes = bytearray()
        expected_seq = sorted_segs[0].seq

        for seg in sorted_segs:
            if seg.seq == expected_seq:
                contiguous_bytes.extend(seg.data)
                expected_seq += len(seg.data)
            elif seg.seq < expected_seq:
                # Overlapping segment
                overlap = expected_seq - seg.seq
                if len(seg.data) > overlap:
                    non_overlap = seg.data[overlap:]
                    contiguous_bytes.extend(non_overlap)
                    expected_seq += len(non_overlap)
            else:
                # Gap in sequence numbers - wait for missing segment
                break

        return bytes(contiguous_bytes)

    def handle_tcp_packet(
        self,
        src_ip: str,
        src_port: int,
        dst_ip: str,
        dst_port: int,
        seq: int,
        payload: bytes,
        flags: int = 0,
        src_mac: Optional[str] = None,
    ) -> Optional[SNIRecord]:
        """Processes a TCP packet and returns SNIRecord if a complete ClientHello was reassembled."""
        now = time.time()
        self._cleanup_expired_streams(now)

        key: StreamKey = (src_ip, src_port, dst_ip, dst_port)

        # RST (0x04) or FIN (0x01) terminates the stream buffer
        if flags & 0x05:
            if key in self.streams:
                del self.streams[key]
            return None

        if not payload:
            return None

        # Check if single packet contains full ClientHello immediately
        if key not in self.streams:
            if payload.startswith(b"\x16\x03"):
                # Could be a TLS Handshake
                domain = TLSParser.extract_sni(payload)
                if domain:
                    record = SNIRecord(
                        src_ip=src_ip,
                        src_mac=src_mac,
                        dst_ip=dst_ip,
                        src_port=src_port,
                        dst_port=dst_port,
                        sni_domain=domain,
                        timestamp=datetime.now(timezone.utc),
                    )
                    if self.on_sni_extracted:
                        self.on_sni_extracted(record)
                    return record

                # If TLS handshake but SNI wasn't extractable yet (e.g. fragmented), start buffering stream
                stream = TCPStream(key=key, src_mac=src_mac, created_at=now, last_seen=now, initial_seq=seq)
                if len(payload) >= 5:
                    stream.expected_length = 5 + int.from_bytes(payload[3:5], "big")
                stream.segments.append(Segment(seq=seq, data=payload, timestamp=now))
                self.streams[key] = stream
                return None
            else:
                # Not a TLS handshake starting packet
                return None

        # Existing stream
        stream = self.streams[key]
        stream.last_seen = now
        if src_mac and not stream.src_mac:
            stream.src_mac = src_mac

        stream.segments.append(Segment(seq=seq, data=payload, timestamp=now))

        # Check expected length if not yet known
        assembled = self._assemble_contiguous_data(stream)
        if stream.expected_length is None and len(assembled) >= 5 and assembled.startswith(b"\x16\x03"):
            stream.expected_length = 5 + int.from_bytes(assembled[3:5], "big")

        if stream.expected_length and len(assembled) >= stream.expected_length:
            # Full TLS Handshake record has been reassembled!
            domain = TLSParser.extract_sni(assembled[:stream.expected_length])
            # Remove stream
            del self.streams[key]

            if domain:
                record = SNIRecord(
                    src_ip=src_ip,
                    src_mac=stream.src_mac,
                    dst_ip=dst_ip,
                    src_port=src_port,
                    dst_port=dst_port,
                    sni_domain=domain,
                    timestamp=datetime.now(timezone.utc),
                )
                if self.on_sni_extracted:
                    self.on_sni_extracted(record)
                return record

        return None
