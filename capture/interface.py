"""Auto-detect the active network interface for packet capture.

Works on Windows (Npcap/NPF), Linux, and macOS. Supports override via
GLASSHOUSE_IFACE environment variable.
"""

import logging
import os
import socket
from typing import Optional

logger = logging.getLogger(__name__)

# Interface name substrings that indicate virtual/filter/loopback adapters to skip
_VIRTUAL_KEYWORDS = frozenset([
    "loopback", "virtual", "wfp", "filter", "debug", "tunnel",
    "teredo", "isatap", "6to4", "kernel debugger",
])


def _get_outbound_ip() -> Optional[str]:
    """Returns the local IP address used for outbound internet traffic."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect(("8.8.8.8", 53))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        logger.warning(f"Could not determine outbound IP: {e}")
        return None


def detect_active_interface() -> Optional[str]:
    """Detects the active network interface suitable for packet capture.

    Priority:
    1. GLASSHOUSE_IFACE environment variable (explicit override)
    2. Scapy interface whose IPv4 address matches the outbound IP
    3. First non-virtual interface with a valid IP address
    4. None (fall back to Scapy default)

    Returns:
        Interface name string compatible with Scapy's sniff(iface=...) parameter,
        or None to use Scapy's default.
    """
    # 1. Check environment variable override
    env_iface = os.environ.get("GLASSHOUSE_IFACE")
    if env_iface:
        logger.info(f"Using interface from GLASSHOUSE_IFACE: {env_iface}")
        return env_iface

    # 2. Try to detect via Scapy IFACES
    try:
        from scapy.all import IFACES, conf
    except ImportError:
        logger.warning("Scapy not available for interface detection")
        return None

    outbound_ip = _get_outbound_ip()
    logger.info(f"Outbound IP detected: {outbound_ip}")

    best_match = None
    fallback_match = None

    for iface in IFACES.values():
        name = getattr(iface, "name", "") or ""
        description = getattr(iface, "description", "") or ""
        ip = getattr(iface, "ip", "") or ""
        mac = getattr(iface, "mac", "") or ""

        # Skip virtual/filter/loopback interfaces
        combined = f"{name} {description}".lower()
        if any(kw in combined for kw in _VIRTUAL_KEYWORDS):
            continue

        # Skip interfaces without a MAC (likely virtual)
        if not mac or mac == "00:00:00:00:00:00":
            continue

        # Skip interfaces without an IP
        if not ip or ip == "0.0.0.0" or ip == "127.0.0.1":
            continue

        # Best match: IP matches outbound
        if outbound_ip and ip == outbound_ip:
            best_match = name
            logger.info(f"Matched active interface: {name} ({description}) IP={ip} MAC={mac}")
            break

        # Fallback: first real interface with an IP
        if fallback_match is None:
            fallback_match = name

    result = best_match or fallback_match
    if result:
        logger.info(f"Selected capture interface: {result}")
    else:
        logger.warning("No suitable interface found; Scapy will use its default")

    return result
