#!/usr/bin/env bash
# ==============================================================================
# Glasshouse Raspberry Pi Wi-Fi AP Setup Script
# Configures hostapd + dnsmasq + iptables NAT for dedicated IoT/Device monitoring
# ==============================================================================

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root (sudo ./setup_ap.sh)" 1>&2
   exit 1
fi

AP_IFACE="wlan0"
UPSTREAM_IFACE="eth0"
SSID="Glasshouse-Observed"
PASSPHRASE="glasshouse123"

echo "[*] Installing hostapd and dnsmasq..."
apt-get update -y
apt-get install -y hostapd dnsmasq iptables-persistent

echo "[*] Stopping default services..."
systemctl stop hostapd || true
systemctl stop dnsmasq || true

echo "[*] Configuring static IP for ${AP_IFACE}..."
cat <<EOF >> /etc/dhcpcd.conf
interface ${AP_IFACE}
    static ip_address=192.168.44.1/24
    nohook wpa_supplicant
EOF

echo "[*] Configuring dnsmasq DHCP/DNS..."
mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig || true
cat <<EOF > /etc/dnsmasq.conf
interface=${AP_IFACE}
dhcp-range=192.168.44.10,192.168.44.200,255.255.255.0,24h
domain=lan
dhcp-leasefile=/var/lib/misc/dnsmasq.leases
EOF

echo "[*] Configuring hostapd AP (${SSID})..."
cat <<EOF > /etc/hostapd/hostapd.conf
interface=${AP_IFACE}
driver=nl80211
ssid=${SSID}
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=${PASSPHRASE}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
EOF

sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd

echo "[*] Enabling IPv4 forwarding..."
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p

echo "[*] Configuring iptables NAT from ${AP_IFACE} to ${UPSTREAM_IFACE}..."
iptables -t nat -A POSTROUTING -o ${UPSTREAM_IFACE} -j MASQUERADE
iptables -A FORWARD -i ${UPSTREAM_IFACE} -o ${AP_IFACE} -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i ${AP_IFACE} -o ${UPSTREAM_IFACE} -j ACCEPT
netfilter-persistent save

echo "[*] Unmasking and starting hostapd & dnsmasq..."
systemctl unmask hostapd
systemctl enable hostapd
systemctl start hostapd
systemctl enable dnsmasq
systemctl start dnsmasq

echo "[+] Wi-Fi Access Point '${SSID}' successfully configured on ${AP_IFACE}!"
echo "[+] Connect devices to '${SSID}' and run Glasshouse to passively observe telemetry."
