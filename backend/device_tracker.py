"""Device identification, IP-to-MAC resolution, and MAC OUI vendor lookup."""

import os
import re
import sys
import subprocess
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Curated top IEEE MAC OUI prefixes (first 6 hex chars normalized without colons/dashes)
CURATED_OUI: Dict[str, str] = {
    # Apple
    "000393": "Apple, Inc.",
    "000502": "Apple, Inc.",
    "000a27": "Apple, Inc.",
    "000a95": "Apple, Inc.",
    "000d93": "Apple, Inc.",
    "0010fa": "Apple, Inc.",
    "001124": "Apple, Inc.",
    "001451": "Apple, Inc.",
    "0016cb": "Apple, Inc.",
    "0017f2": "Apple, Inc.",
    "0019e3": "Apple, Inc.",
    "001b63": "Apple, Inc.",
    "001c43": "Apple, Inc.",
    "001cb3": "Apple, Inc.",
    "001d4f": "Apple, Inc.",
    "001e52": "Apple, Inc.",
    "001ec2": "Apple, Inc.",
    "001f5b": "Apple, Inc.",
    "001ff3": "Apple, Inc.",
    "0021e9": "Apple, Inc.",
    "002241": "Apple, Inc.",
    "002312": "Apple, Inc.",
    "002332": "Apple, Inc.",
    "00236c": "Apple, Inc.",
    "0023df": "Apple, Inc.",
    "002436": "Apple, Inc.",
    "002500": "Apple, Inc.",
    "00254b": "Apple, Inc.",
    "0025bc": "Apple, Inc.",
    "002608": "Apple, Inc.",
    "00264a": "Apple, Inc.",
    "0026b0": "Apple, Inc.",
    "0026bb": "Apple, Inc.",
    "a483e7": "Apple, Inc.",
    "f01898": "Apple, Inc.",
    "f4f15a": "Apple, Inc.",
    "3c0754": "Apple, Inc.",
    "406c8f": "Apple, Inc.",
    "acde48": "Apple, Inc.",
    "bc5436": "Apple, Inc.",
    "dc2b61": "Apple, Inc.",

    # Samsung
    "000278": "Samsung Electronics",
    "0007ab": "Samsung Electronics",
    "000918": "Samsung Electronics",
    "000dae": "Samsung Electronics",
    "001247": "Samsung Electronics",
    "0012fb": "Samsung Electronics",
    "001377": "Samsung Electronics",
    "001599": "Samsung Electronics",
    "0015b9": "Samsung Electronics",
    "00166b": "Samsung Electronics",
    "00166c": "Samsung Electronics",
    "0017c9": "Samsung Electronics",
    "0017d5": "Samsung Electronics",
    "0018af": "Samsung Electronics",
    "508569": "Samsung Electronics",
    "606c66": "Samsung Electronics",
    "745e1c": "Samsung Electronics",
    "842519": "Samsung Electronics",
    "9439e5": "Samsung Electronics",
    "a00798": "Samsung Electronics",
    "b85a73": "Samsung Electronics",
    "e47cf9": "Samsung Electronics",

    # Google / Alphabet
    "001a11": "Google, Inc.",
    "3c5ab4": "Google, Inc.",
    "546009": "Google, Inc.",
    "702c1f": "Google, Inc.",
    "94ebcd": "Google, Inc.",
    "d86c63": "Google, Inc.",
    "f40304": "Google, Inc.",
    "f4f5d8": "Google, Inc.",

    # Amazon
    "00bb3a": "Amazon Technologies",
    "18742e": "Amazon Technologies",
    "34d270": "Amazon Technologies",
    "44650d": "Amazon Technologies",
    "50dc79": "Amazon Technologies",
    "6837e9": "Amazon Technologies",
    "74c246": "Amazon Technologies",
    "84d6d0": "Amazon Technologies",
    "ac63be": "Amazon Technologies",
    "cc9e00": "Amazon Technologies",
    "fc65de": "Amazon Technologies",

    # Espressif (IoT smart devices, ESP8266/ESP32)
    "240ac4": "Espressif Inc.",
    "246f28": "Espressif Inc.",
    "24b2de": "Espressif Inc.",
    "30aea4": "Espressif Inc.",
    "840d8e": "Espressif Inc.",
    "84cca8": "Espressif Inc.",
    "84f3eb": "Espressif Inc.",
    "a020a6": "Espressif Inc.",
    "ac67b2": "Espressif Inc.",
    "bcddc2": "Espressif Inc.",
    "cc50e3": "Espressif Inc.",
    "dc4f22": "Espressif Inc.",

    # Raspberry Pi Foundation
    "b827eb": "Raspberry Pi Foundation",
    "dca632": "Raspberry Pi Foundation",
    "e45f01": "Raspberry Pi Foundation",
    "28cdc1": "Raspberry Pi Foundation",

    # TP-Link
    "000ae0": "TP-Link Technologies",
    "001478": "TP-Link Technologies",
    "0019e0": "TP-Link Technologies",
    "002127": "TP-Link Technologies",
    "0023cd": "TP-Link Technologies",
    "002586": "TP-Link Technologies",
    "002719": "TP-Link Technologies",
    "50c7bf": "TP-Link Technologies",

    # Sony
    "00014a": "Sony Interactive / Corp",
    "00041f": "Sony Interactive / Corp",
    "0013a9": "Sony Interactive / Corp",
    "0019c5": "Sony Interactive / Corp",
    "001dba": "Sony Interactive / Corp",
    "0024be": "Sony Interactive / Corp",
    "709e29": "Sony Interactive / Corp",

    # LG Electronics
    "0005c9": "LG Electronics",
    "001417": "LG Electronics",
    "0019a1": "LG Electronics",
    "001c62": "LG Electronics",
    "001e75": "LG Electronics",
    "001f6b": "LG Electronics",
    "10f96f": "LG Electronics",

    # Microsoft
    "0003ff": "Microsoft Corp",
    "000d3a": "Microsoft Corp",
    "00125a": "Microsoft Corp",
    "00155d": "Microsoft Corp",
    "0017fa": "Microsoft Corp",
    "001d42": "Microsoft Corp",
    "002248": "Microsoft Corp",
    "0025ae": "Microsoft Corp",
    "281878": "Microsoft Corp",
    "7ce9d3": "Microsoft Corp",

    # Intel
    "0002b3": "Intel Corporate",
    "000347": "Intel Corporate",
    "000423": "Intel Corporate",
    "0007e9": "Intel Corporate",
    "000c76": "Intel Corporate",
    "000e0c": "Intel Corporate",
    "001302": "Intel Corporate",
    "0013e8": "Intel Corporate",
    "001500": "Intel Corporate",

    # Roku
    "000d4b": "Roku, Inc.",
    "080581": "Roku, Inc.",
    "20dfb9": "Roku, Inc.",
    "ac3a7a": "Roku, Inc.",
    "d83134": "Roku, Inc.",

    # Xiaomi
    "009ee8": "Xiaomi Communications",
    "04cf8c": "Xiaomi Communications",
    "0c1dae": "Xiaomi Communications",
    "14f65a": "Xiaomi Communications",
    "185936": "Xiaomi Communications",
    "286c07": "Xiaomi Communications",
    "34ce00": "Xiaomi Communications",
    "50642b": "Xiaomi Communications",
    "640980": "Xiaomi Communications",
    "7802f8": "Xiaomi Communications",
    "7c49eb": "Xiaomi Communications",
    "8cbebe": "Xiaomi Communications",
}


def normalize_mac(mac: str) -> str:
    """Normalizes MAC address string to lower-case colon-separated format (aa:bb:cc:dd:ee:ff)."""
    cleaned = re.sub(r"[^0-9a-fA-F]", "", mac).lower()
    if len(cleaned) == 12:
        return ":".join(cleaned[i:i+2] for i in range(0, 12, 2))
    return mac.lower().strip()


class DeviceTracker:
    """Tracks active LAN devices, maps IP <-> MAC addresses, and resolves vendors."""

    def __init__(self, oui_db: Optional[Dict[str, str]] = None):
        self.oui_db = oui_db or CURATED_OUI
        self.ip_to_mac_cache: Dict[str, str] = {}
        self.mac_to_ip_cache: Dict[str, str] = {}

    def lookup_vendor(self, mac: str) -> Optional[str]:
        """Resolves MAC address OUI prefix to manufacturer name."""
        cleaned = re.sub(r"[^0-9a-fA-F]", "", mac).lower()
        if len(cleaned) < 6:
            return None

        oui_prefix = cleaned[:6]
        return self.oui_db.get(oui_prefix, "Generic Network Device")

    def suggest_device_name(self, mac: str, vendor: Optional[str] = None, ip: Optional[str] = None) -> str:
        """Generates a friendly human-readable name for an identified device."""
        v = vendor or self.lookup_vendor(mac) or "Device"
        short_vendor = v.split(",")[0].split("/")[0].strip()
        last_octets = mac.split(":")[-2:] if ":" in mac else [mac[-4:-2], mac[-2:]]
        suffix = ":".join(last_octets).upper()
        return f"{short_vendor} ({suffix})"

    def parse_arp_output(self, text: str) -> Dict[str, str]:
        """Parses stdout of arp -a across Windows, Linux, and macOS."""
        mapping = {}
        # Match lines like: 192.168.1.100  00-11-22-33-44-55  dynamic
        # or (192.168.1.100) at 00:11:22:33:44:55 on en0
        ip_mac_pattern = re.compile(
            r"(?:\(?(\d{1,3}(?:\.\d{1,3}){3})\)?)\s+(?:at\s+)?([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})"
        )
        for line in text.splitlines():
            match = ip_mac_pattern.search(line)
            if match:
                ip = match.group(1)
                raw_mac = match.group(2)
                mac = normalize_mac(raw_mac)
                if mac != "ff:ff:ff:ff:ff:ff" and not mac.startswith("01:00:5e"):
                    mapping[ip] = mac
        return mapping

    def parse_proc_net_arp(self, text: str) -> Dict[str, str]:
        """Parses Linux /proc/net/arp file content."""
        mapping = {}
        # Header: IP address       HW type     Flags       HW address            Mask     Device
        for line in text.splitlines()[1:]:
            parts = line.split()
            if len(parts) >= 4:
                ip = parts[0]
                raw_mac = parts[3]
                if raw_mac != "00:00:00:00:00:00":
                    mac = normalize_mac(raw_mac)
                    mapping[ip] = mac
        return mapping

    def parse_dnsmasq_leases(self, text: str) -> Dict[str, Dict[str, str]]:
        """Parses dnsmasq.leases file to extract (ip, mac, hostname)."""
        leases = {}
        # Format: timestamp mac ip hostname client-id
        for line in text.splitlines():
            parts = line.split()
            if len(parts) >= 4:
                raw_mac = parts[1]
                ip = parts[2]
                hostname = parts[3] if parts[3] != "*" else None
                mac = normalize_mac(raw_mac)
                leases[ip] = {"mac": mac, "hostname": hostname}
        return leases

    def refresh_arp_cache(self) -> Dict[str, str]:
        """Scans local system ARP table and updates cache."""
        mapping = {}
        # Try /proc/net/arp on Linux
        proc_arp = Path("/proc/net/arp")
        if proc_arp.exists():
            try:
                content = proc_arp.read_text(encoding="utf-8")
                mapping.update(self.parse_proc_net_arp(content))
            except Exception as e:
                logger.warning(f"Error reading /proc/net/arp: {e}")

        # Fallback to running arp -a command
        if not mapping:
            try:
                cmd = ["arp", "-a"]
                out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=3).decode("utf-8", errors="ignore")
                mapping.update(self.parse_arp_output(out))
            except Exception as e:
                logger.debug(f"Could not run arp -a: {e}")

        for ip, mac in mapping.items():
            self.ip_to_mac_cache[ip] = mac
            self.mac_to_ip_cache[mac] = ip

        return mapping

    def resolve_mac_for_ip(self, ip: str) -> Optional[str]:
        """Resolves IP to MAC address using cache and ARP refresh."""
        if ip in self.ip_to_mac_cache:
            return self.ip_to_mac_cache[ip]

        self.refresh_arp_cache()
        return self.ip_to_mac_cache.get(ip)
