"""TLS ClientHello Server Name Indication (SNI) parser.

Extracts the plaintext destination domain name from TLS ClientHello handshakes
without decrypting any packet payloads or inspecting encrypted session traffic.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
import struct


@dataclass
class SNIRecord:
    src_ip: str
    src_mac: Optional[str]
    sni_domain: str
    timestamp: datetime
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None


class TLSParser:
    """Parses raw TLS handshake bytes to extract Server Name Indication (SNI)."""

    TLS_HANDSHAKE_TYPE = 0x16
    CLIENT_HELLO_TYPE = 0x01
    EXTENSION_SERVER_NAME = 0x0000
    NAME_TYPE_HOSTNAME = 0x00

    @classmethod
    def extract_sni(cls, payload: bytes) -> Optional[str]:
        """Extracts the SNI hostname from raw TLS payload bytes.
        
        Returns domain string if found, otherwise None.
        """
        if len(payload) < 9:
            return None

        # Check for TLS Handshake Record (Content Type = 0x16)
        content_type = payload[0]
        if content_type != cls.TLS_HANDSHAKE_TYPE:
            return None

        # TLS Record Header:
        # byte 0: Content Type (0x16)
        # bytes 1-2: Version (e.g. 0x0301)
        # bytes 3-4: Record Length
        # byte 5: Handshake Type (0x01 for ClientHello)
        # bytes 6-8: Handshake Length (3 bytes)
        # bytes 9-10: Client Version
        # bytes 11-42: Random (32 bytes)
        
        pos = 5
        if pos >= len(payload):
            return None

        handshake_type = payload[pos]
        if handshake_type != cls.CLIENT_HELLO_TYPE:
            return None

        pos += 1  # Skip handshake type
        if pos + 3 > len(payload):
            return None
        # Handshake length (3 bytes)
        handshake_len = int.from_bytes(payload[pos:pos + 3], "big")
        pos += 3

        # Client Version (2 bytes) + Random (32 bytes)
        pos += 2 + 32
        if pos >= len(payload):
            return None

        # Session ID
        session_id_len = payload[pos]
        pos += 1 + session_id_len
        if pos + 2 > len(payload):
            return None

        # Cipher Suites
        cipher_suites_len = int.from_bytes(payload[pos:pos + 2], "big")
        pos += 2 + cipher_suites_len
        if pos >= len(payload):
            return None

        # Compression Methods
        compression_methods_len = payload[pos]
        pos += 1 + compression_methods_len
        if pos + 2 > len(payload):
            return None

        # Extensions Length
        extensions_len = int.from_bytes(payload[pos:pos + 2], "big")
        pos += 2
        extensions_end = min(pos + extensions_len, len(payload))

        # Loop through TLS Extensions
        while pos + 4 <= extensions_end:
            ext_type = int.from_bytes(payload[pos:pos + 2], "big")
            ext_len = int.from_bytes(payload[pos + 2:pos + 4], "big")
            pos += 4

            if ext_type == cls.EXTENSION_SERVER_NAME:
                # Inside Server Name Extension:
                # 2 bytes: Server Name List Length
                if pos + 2 > len(payload):
                    return None
                list_len = int.from_bytes(payload[pos:pos + 2], "big")
                name_pos = pos + 2
                name_end = min(name_pos + list_len, pos + ext_len)

                while name_pos + 3 <= name_end:
                    name_type = payload[name_pos]
                    name_len = int.from_bytes(payload[name_pos + 1:name_pos + 3], "big")
                    name_pos += 3

                    if name_type == cls.NAME_TYPE_HOSTNAME:
                        if name_pos + name_len <= len(payload):
                            hostname_bytes = payload[name_pos:name_pos + name_len]
                            try:
                                hostname = hostname_bytes.decode("utf-8").lower().strip()
                                return hostname
                            except UnicodeDecodeError:
                                return None
                    name_pos += name_len
                return None

            pos += ext_len

        return None
