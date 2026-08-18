#!/usr/bin/env bash
# ==============================================================================
# Glasshouse Port Mirroring / SPAN Interface Setup Script
# Puts the capture interface into promiscuous mode without assigning an IP
# ==============================================================================

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root (sudo ./setup_mirror.sh <iface>)" 1>&2
   exit 1
fi

MIRROR_IFACE="${1:-eth1}"

echo "[*] Setting interface ${MIRROR_IFACE} to promiscuous mode..."
ip link set "${MIRROR_IFACE}" promisc on
ip link set "${MIRROR_IFACE}" up

echo "[*] Ensuring interface has no IP assigned (passive listening only)..."
ip addr flush dev "${MIRROR_IFACE}" || true

echo "[+] Interface ${MIRROR_IFACE} is ready in promiscuous mode for passive Glasshouse capture!"
