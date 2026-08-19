"""Device identification, IP-to-MAC resolution, and MAC OUI vendor lookup.

Loads the full IEEE OUI vendor database (~38K vendors) from mac-vendor-lookup's
bundled vendor table for instant O(1) synchronous lookups without async event-loop conflicts,
with a curated fallback dictionary for offline/edge cases.
"""

import os
import re
import socket
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


def _get_local_machine_info():
    """Detects local hostname and outbound IP address."""
    hostname = socket.gethostname()
    local_ip = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 53))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    return hostname, local_ip


def normalize_mac(mac: str) -> str:
    """Normalizes MAC address string to lower-case colon-separated format (aa:bb:cc:dd:ee:ff)."""
    if not mac:
        return ""
    if mac.startswith("ip:"):
        return mac.lower().strip()
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
        self.hostname_cache: Dict[str, str] = {}
        self.local_hostname, self.local_ip = _get_local_machine_info()
        self._domain_history: Dict[str, Set[str]] = {}

    def lookup_vendor(self, mac: str) -> Optional[str]:
        """Resolves MAC address OUI prefix to manufacturer name (O(1) dictionary lookup)."""
        if not mac or mac.startswith("ip:"):
            return None

        cleaned = re.sub(r"[^0-9a-fA-F]", "", mac).upper()
        if len(cleaned) < 6:
            return None

        oui_prefix = cleaned[:6]
        vendor = self.oui_db.get(oui_prefix)
        logger.info(f"[OUI Lookup] MAC: {mac} (OUI: {oui_prefix}) -> Vendor: {vendor or 'Unresolved'}")
        return vendor

    def resolve_hostname(self, ip: str) -> Optional[str]:
        """Tries to resolve device hostname via local reverse DNS."""
        if not ip:
            return None
        if ip in self.hostname_cache:
            return self.hostname_cache[ip]

        # Check if local machine
        if ip == self.local_ip:
            self.hostname_cache[ip] = self.local_hostname
            return self.local_hostname

        try:
            name, _, _ = socket.gethostbyaddr(ip)
            if name and name != ip:
                # Remove common local domain suffixes
                clean_name = name.replace(".lan", "").replace(".local", "").replace(".home", "")
                self.hostname_cache[ip] = clean_name
                return clean_name
        except Exception:
            pass

        return None

    def record_domain(self, mac: str, domain: str):
        """Records an observed domain for a MAC address."""
        mac = mac.lower().strip()
        if mac not in self._domain_history:
            self._domain_history[mac] = set()
        self._domain_history[mac].add(domain.lower())

    def suggest_device_name(self, mac: str, vendor: Optional[str] = None, ip: Optional[str] = None) -> str:
        """Generates a clean, accurate human-readable name for an identified device."""
        if not mac:
            return "Unknown Device"

        # 1. If this is the local PC running Glasshouse, identify it accurately
        if (ip and ip == self.local_ip) or (ip and ip in ("127.0.0.1", "localhost")):
            return f"This PC ({self.local_hostname})"

        # 2. Try reverse DNS hostname (e.g. Arpan-Laptop, iPhone, Samsung-TV)
        if ip:
            hostname = self.resolve_hostname(ip)
            if hostname and hostname != ip:
                return hostname

        # 3. Pseudo-MAC fallback
        if mac.startswith("ip:"):
            host_ip = mac.replace("ip:", "")
            return f"Host ({host_ip})"

        # 4. Use OUI Vendor name
        v = vendor or self.lookup_vendor(mac)

        # Extract last 4 hex characters of MAC (e.g. 39:CD)
        last_octets = mac.split(":")[-2:] if ":" in mac else [mac[-4:-2], mac[-2:]]
        suffix = ":".join(o.upper() for o in last_octets) if len(last_octets) == 2 else mac[-4:].upper()

        if v:
            short = v.split(",")[0].split("/")[0].split("Co.")[0].strip()
            for corp_suffix in [
                " Corporation", " Technologies", " Corp", " Inc.", " Inc",
                " Ltd", " Electronics", " Semiconductor", " Technology"
            ]:
                short = short.replace(corp_suffix, "").strip()

            if short:
                return f"{short} Device ({suffix})"

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

    def refresh_arp_cache(self) -> Dict[str, str]:
        """Scans local system ARP table and updates cache."""
        mapping = {}
        proc_arp = Path("/proc/net/arp")
        if proc_arp.exists():
            try:
                content = proc_arp.read_text(encoding="utf-8")
                mapping.update(self.parse_proc_net_arp(content))
            except Exception as e:
                logger.warning(f"Error reading /proc/net/arp: {e}")

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
