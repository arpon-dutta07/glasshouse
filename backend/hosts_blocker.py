"""Hosts File Blocking Manager for Local-Machine Privacy Enforcement.

Safely manages domain blocking by appending/removing '0.0.0.0 domain' entries
within an isolated delimited section in the Windows hosts file (C:\\Windows\\System32\\drivers\\etc\\hosts).
"""

import os
import sys
import logging
from pathlib import Path
from typing import List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

# Delimiters for isolating Glasshouse entries
START_MARKER = "# --- GLASSHOUSE BLOCKED DOMAINS START ---"
END_MARKER = "# --- GLASSHOUSE BLOCKED DOMAINS END ---"

# CRITICAL SAFETY LIST: Core infrastructure domains that can NEVER be blocked
PROTECTED_DOMAINS = [
    "google.com",
    "googleapis.com",
    "gstatic.com",
    "googleusercontent.com",
    "1e100.net",
    "apple.com",
    "icloud.com",
    "aaplimg.com",
    "apple-dns.net",
    "microsoft.com",
    "windows.com",
    "live.com",
    "office.com",
    "azure.com",
    "windowsupdate.com",
    "cloudflare.com",
    "cloudflare-dns.com",
    "akamai.net",
    "akamaiedge.net",
    "akamaitechnologies.com",
    "amazonaws.com",
    "amazon.com",
    "github.com",
    "githubusercontent.com",
    "fastly.net",
    "fastly.com",
    "localhost",
    "127.0.0.1",
    "broadcasthost",
]


class HostsBlocker:
    """Manages local machine hosts-file blocking with strict safety guardrails."""

    def __init__(self, hosts_path: Optional[str] = None):
        if hosts_path:
            self.hosts_path = Path(hosts_path)
        elif os.environ.get("HOSTS_FILE_PATH"):
            self.hosts_path = Path(os.environ["HOSTS_FILE_PATH"])
        elif sys.platform == "win32":
            self.hosts_path = Path(os.environ.get("SystemRoot", "C:\\Windows")) / "System32" / "drivers" / "etc" / "hosts"
        else:
            self.hosts_path = Path("/etc/hosts")

    def is_protected_domain(self, domain: str) -> bool:
        """Returns True if domain is critical infrastructure that cannot be blocked."""
        dom = domain.lower().strip().rstrip(".")
        for protected in PROTECTED_DOMAINS:
            if dom == protected or dom.endswith("." + protected):
                return True
        return False

    def can_write_hosts(self) -> bool:
        """Checks whether Glasshouse has write permissions to the hosts file."""
        try:
            if not self.hosts_path.exists():
                return False
            # Test opening in append mode without modifying
            with open(self.hosts_path, "a", encoding="utf-8") as f:
                pass
            return True
        except Exception:
            return False

    def read_hosts_content(self) -> str:
        """Reads the full hosts file content."""
        if not self.hosts_path.exists():
            return ""
        try:
            return self.hosts_path.read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            logger.error(f"Failed to read hosts file at {self.hosts_path}: {e}")
            raise PermissionError(f"Unable to read hosts file: {e}")

    def get_currently_blocked_in_hosts(self) -> Set[str]:
        """Extracts domains currently blocked inside the Glasshouse section."""
        content = self.read_hosts_content()
        if START_MARKER not in content or END_MARKER not in content:
            return set()

        try:
            section = content.split(START_MARKER)[1].split(END_MARKER)[0]
            blocked = set()
            for line in section.splitlines():
                line = line.strip()
                if line.startswith("0.0.0.0"):
                    parts = line.split()
                    if len(parts) >= 2:
                        blocked.add(parts[1].lower().strip())
            return blocked
        except Exception as e:
            logger.warning(f"Error parsing Glasshouse section in hosts file: {e}")
            return set()

    def block_domain_in_hosts(self, domain: str) -> Tuple[bool, str]:
        """Adds '0.0.0.0 domain' inside the Glasshouse section in the hosts file."""
        dom = domain.lower().strip().rstrip(".")
        if self.is_protected_domain(dom):
            return False, "This domain is critical infrastructure and can't be blocked to avoid breaking your system/apps."

        try:
            content = self.read_hosts_content()
            subdomains = [dom]
            # If standard root domain, also block www.
            if dom.count(".") == 1 and not dom.startswith("www."):
                subdomains.append(f"www.{dom}")

            if START_MARKER in content and END_MARKER in content:
                before = content.split(START_MARKER)[0]
                section = content.split(START_MARKER)[1].split(END_MARKER)[0]
                after = content.split(END_MARKER)[1]

                existing_lines = [l for l in section.splitlines() if l.strip()]
                for s in subdomains:
                    entry = f"0.0.0.0 {s}"
                    if entry not in existing_lines:
                        existing_lines.append(entry)

                new_section = "\n" + "\n".join(existing_lines) + "\n"
                new_content = before + START_MARKER + new_section + END_MARKER + after
            else:
                entries = [f"0.0.0.0 {s}" for s in subdomains]
                block = f"\n\n{START_MARKER}\n" + "\n".join(entries) + f"\n{END_MARKER}\n"
                new_content = content.rstrip() + block

            self.hosts_path.write_text(new_content, encoding="utf-8")
            logger.info(f"Successfully added hosts entry for {dom}")
            return True, f"Blocked {dom} in hosts file."
        except PermissionError:
            return False, "Permission denied writing to hosts file. Run Glasshouse as Administrator."
        except Exception as e:
            return False, f"Failed to modify hosts file: {str(e)}"

    def unblock_domain_in_hosts(self, domain: str) -> Tuple[bool, str]:
        """Removes the domain from the Glasshouse section in the hosts file."""
        dom = domain.lower().strip().rstrip(".")
        try:
            content = self.read_hosts_content()
            if START_MARKER not in content or END_MARKER not in content:
                return True, f"{dom} is not blocked in hosts file."

            before = content.split(START_MARKER)[0]
            section = content.split(START_MARKER)[1].split(END_MARKER)[0]
            after = content.split(END_MARKER)[1]

            subdomains_to_remove = {dom, f"www.{dom}"}
            existing_lines = section.splitlines()
            remaining_lines = []
            for line in existing_lines:
                tokens = line.strip().split()
                if len(tokens) >= 2 and tokens[0] == "0.0.0.0" and tokens[1] in subdomains_to_remove:
                    continue
                if line.strip():
                    remaining_lines.append(line.strip())

            new_section = "\n" + "\n".join(remaining_lines) + "\n" if remaining_lines else "\n"
            new_content = before + START_MARKER + new_section + END_MARKER + after

            self.hosts_path.write_text(new_content, encoding="utf-8")
            logger.info(f"Successfully removed hosts entry for {dom}")
            return True, f"Unblocked {dom} in hosts file."
        except PermissionError:
            return False, "Permission denied writing to hosts file. Run Glasshouse as Administrator."
        except Exception as e:
            return False, f"Failed to modify hosts file: {str(e)}"
