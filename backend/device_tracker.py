"""Device identification, IP-to-MAC resolution, and MAC OUI vendor lookup.

Loads the full IEEE OUI vendor database (~38K vendors) from mac-vendor-lookup's
bundled vendor table for instant O(1) synchronous lookups without async event-loop conflicts,
with a curated fallback dictionary for offline/edge cases.
"""

import os
import re
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set

logger = logging.getLogger(__name__)

# Compact curated fallback for common home-network OUI prefixes
_CURATED_OUI: Dict[str, str] = {
    # Apple
    "0026BB": "Apple, Inc.", "A483E7": "Apple, Inc.", "F01898": "Apple, Inc.",
    "3C0754": "Apple, Inc.", "406C8F": "Apple, Inc.", "ACDE48": "Apple, Inc.",
    "BC5436": "Apple, Inc.", "DC2B61": "Apple, Inc.", "F4F15A": "Apple, Inc.",
    # Samsung
    "508569": "Samsung Electronics", "606C66": "Samsung Electronics",
    "745E1C": "Samsung Electronics", "842519": "Samsung Electronics",
    "A00798": "Samsung Electronics", "E47CF9": "Samsung Electronics",
    # Google
    "3C5AB4": "Google, Inc.", "546009": "Google, Inc.", "F4F5D8": "Google, Inc.",
    # Amazon
    "44650D": "Amazon Technologies", "6837E9": "Amazon Technologies",
    "FC65DE": "Amazon Technologies", "AC63BE": "Amazon Technologies",
    # Espressif (IoT)
    "240AC4": "Espressif Inc.", "84CCA8": "Espressif Inc.",
    "A020A6": "Espressif Inc.", "CC50E3": "Espressif Inc.",
    # Raspberry Pi
    "B827EB": "Raspberry Pi Foundation", "DCA632": "Raspberry Pi Foundation",
    "E45F01": "Raspberry Pi Foundation", "28CDC1": "Raspberry Pi Foundation",
    # TP-Link
    "50C7BF": "TP-Link Technologies", "002127": "TP-Link Technologies",
    # Roku
    "080581": "Roku, Inc.", "D83134": "Roku, Inc.", "AC3A7A": "Roku, Inc.",
    # Xiaomi
    "7802F8": "Xiaomi Communications", "286C07": "Xiaomi Communications",
    "640980": "Xiaomi Communications", "50642B": "Xiaomi Communications",
    # Microsoft
    "001D42": "Microsoft Corp", "281878": "Microsoft Corp",
    # Intel
    "000E0C": "Intel Corporate", "001500": "Intel Corporate",
    # Sony
    "001DBA": "Sony Interactive", "709E29": "Sony Interactive",
    # LG
    "001E75": "LG Electronics", "10F96F": "LG Electronics",
    # Realtek (common Wi-Fi chipsets)
    "9C2F9D": "Realtek Semiconductor", "E4A8DF": "Realtek Semiconductor",
    # Qualcomm
    "0026B6": "Qualcomm", "8C0F6F": "Qualcomm",
    # Huawei
    "E43E69": "Huawei Technologies", "C8D15E": "Huawei Technologies",
    # OnePlus
    "94652D": "OnePlus Technology",
}


def _load_ieee_vendors() -> Dict[str, str]:
    """Loads the IEEE OUI database synchronously from mac-vendor-lookup's cache."""
    vendors: Dict[str, str] = dict(_CURATED_OUI)
    try:
        from mac_vendor_lookup import BaseMacLookup
        cache_file = BaseMacLookup().find_vendors_list()
        if cache_file and os.path.exists(cache_file):
            with open(cache_file, "rb") as f:
                for line in f.read().splitlines():
                    if b":" in line:
                        prefix, vendor = line.split(b":", 1)
                        clean_prefix = prefix.decode("utf-8", errors="ignore").strip().upper()
                        clean_vendor = vendor.decode("utf-8", errors="ignore").strip()
                        vendors[clean_prefix] = clean_vendor
            logger.info(f"Loaded {len(vendors)} IEEE MAC OUI vendor prefixes into memory")
    except Exception as e:
        logger.debug(f"Could not load extended IEEE OUI table: {e}. Using curated OUI fallback.")
    return vendors


# Traffic-pattern domain sets for device type guessing
_APPLE_DOMAINS = {"apple.com", "icloud.com", "apple-dns.net", "mzstatic.com", "apple.news"}
_ANDROID_DOMAINS = {"googleapis.com", "google.com", "gstatic.com", "android.com", "android.clients.google.com"}
_WINDOWS_DOMAINS = {"microsoft.com", "windowsupdate.com", "windows.net", "live.com", "msn.com"}
_SMART_TV_DOMAINS = {"samsungcloudsolution.com", "samsungads.com", "roku.com", "lgtvsdp.com", "lgappstv.com"}
_IOT_DOMAINS = {"iot.espressif.com", "pool.ntp.org", "devicehub.io"}

# Vendor keywords for device type classification
_MOBILE_VENDORS = {"apple", "samsung", "xiaomi", "huawei", "oneplus", "oppo", "vivo", "motorola", "nokia", "realme"}
_LAPTOP_VENDORS = {"apple", "dell", "lenovo", "hp", "asus", "acer", "microsoft", "intel"}
_TV_VENDORS = {"roku", "sony interactive", "lg electronics", "vizio", "tcl", "hisense"}
_IOT_VENDORS = {"espressif", "raspberry pi", "tuya", "shenzhen", "sonoff"}
_ROUTER_VENDORS = {"tp-link", "netgear", "asus", "cisco", "ubiquiti", "linksys", "d-link", "arris"}


def normalize_mac(mac: str) -> str:
    """Normalizes MAC address string to lower-case colon-separated format (aa:bb:cc:dd:ee:ff)."""
    cleaned = re.sub(r"[^0-9a-fA-F]", "", mac).lower()
    if len(cleaned) == 12:
        return ":".join(cleaned[i:i+2] for i in range(0, 12, 2))
    return mac.lower().strip()


class DeviceTracker:
    """Tracks active LAN devices, maps IP <-> MAC addresses, and resolves vendors."""

    def __init__(self, oui_db: Optional[Dict[str, str]] = None):
        self.oui_db = oui_db if oui_db is not None else _load_ieee_vendors()
        self.ip_to_mac_cache: Dict[str, str] = {}
        self.mac_to_ip_cache: Dict[str, str] = {}
        self._domain_history: Dict[str, Set[str]] = {}  # mac -> set of observed domains

    def lookup_vendor(self, mac: str) -> Optional[str]:
        """Resolves MAC address OUI prefix to manufacturer name (O(1) dictionary lookup)."""
        cleaned = re.sub(r"[^0-9a-fA-F]", "", mac).upper()
        if len(cleaned) < 6:
            return None

        # Look up 6-character OUI prefix
        oui_prefix = cleaned[:6]
        return self.oui_db.get(oui_prefix)

    def guess_device_type(self, vendor: Optional[str] = None, mac: Optional[str] = None) -> str:
        """Guesses device type based on vendor name and observed traffic patterns.

        Returns one of: "Phone", "Laptop", "Smart TV", "IoT", "Router", "Streaming", "Tablet", "Device"
        """
        v = (vendor or "").lower()

        # Check observed domains for this MAC
        domains_seen: Set[str] = set()
        if mac and mac in self._domain_history:
            domains_seen = self._domain_history[mac]

        # Traffic-pattern based guessing (secondary signal)
        apple_score = sum(1 for d in domains_seen if any(d.endswith(ad) for ad in _APPLE_DOMAINS))
        android_score = sum(1 for d in domains_seen if any(d.endswith(ad) for ad in _ANDROID_DOMAINS))
        windows_score = sum(1 for d in domains_seen if any(d.endswith(wd) for wd in _WINDOWS_DOMAINS))
        tv_score = sum(1 for d in domains_seen if any(d.endswith(td) for td in _SMART_TV_DOMAINS))

        # Vendor-based type (primary signal)
        if any(kw in v for kw in _TV_VENDORS):
            return "Smart TV"
        if any(kw in v for kw in _IOT_VENDORS):
            return "IoT"
        if any(kw in v for kw in _ROUTER_VENDORS) and "apple" not in v:
            return "Router"

        # For ambiguous vendors (Apple, Samsung, etc.), use traffic patterns
        if "apple" in v:
            if tv_score > 0:
                return "Apple TV"
            return "iPhone/Mac"
        if any(kw in v for kw in {"samsung", "xiaomi", "huawei", "oneplus", "oppo", "vivo", "motorola", "realme"}):
            return "Phone"

        # Traffic-pattern fallback
        if apple_score > android_score and apple_score > 0:
            return "iPhone/Mac"
        if android_score > apple_score and android_score > 0:
            return "Android"
        if windows_score > 0:
            return "PC"
        if tv_score > 0:
            return "Smart TV"

        # Generic vendor-based
        if any(kw in v for kw in _LAPTOP_VENDORS):
            return "Laptop"

        return "Device"

    def record_domain(self, mac: str, domain: str):
        """Records an observed domain for a MAC address (used for device type guessing)."""
        mac = mac.lower().strip()
        if mac not in self._domain_history:
            self._domain_history[mac] = set()
        # Keep only the root domain for pattern matching
        parts = domain.lower().split(".")
        if len(parts) >= 2:
            root = ".".join(parts[-2:])
            self._domain_history[mac].add(root)
        self._domain_history[mac].add(domain.lower())

    def suggest_device_name(self, mac: str, vendor: Optional[str] = None, ip: Optional[str] = None) -> str:
        """Generates a friendly human-readable name for an identified device."""
        v = vendor or self.lookup_vendor(mac)
        device_type = self.guess_device_type(vendor=v, mac=mac)

        # Build short vendor prefix
        if v:
            # Clean up vendor name for display
            short = v.split(",")[0].split("/")[0].split("Co.")[0].strip()
            # Remove redundant suffixes
            for suffix in [" Corporation", " Technologies", " Corp", " Inc.", " Inc", " Ltd", " Electronics", " Semiconductor"]:
                short = short.replace(suffix, "").strip()
        else:
            short = "Unknown"

        # Get last two octets for uniqueness
        last_octets = mac.split(":")[-2:] if ":" in mac else [mac[-4:-2], mac[-2:]]
        suffix = ":".join(o.upper() for o in last_octets)

        # Build name: "Apple iPhone/Mac (39:CD)" or "Samsung Phone (39:CD)"
        if device_type != "Device" and short != "Unknown":
            return f"{short} {device_type} ({suffix})"
        elif short != "Unknown":
            return f"{short} Device ({suffix})"
        else:
            return f"Unknown Device ({suffix})"

    def parse_arp_output(self, text: str) -> Dict[str, str]:
        """Parses stdout of arp -a across Windows, Linux, and macOS."""
        mapping = {}
        ip_mac_pattern = re.compile(
            r"(?:\(?([\d]{1,3}(?:\.[\d]{1,3}){3})\)?)[\s]+(?:at\s+)?([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})"
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
