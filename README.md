# 🔍 Glasshouse

> **Passive TLS Network Privacy Observability & Per-Device Score Engine**

Glasshouse is a self-hosted network monitoring and privacy diagnostic platform. It provides real-time visibility into outbound tracker, telemetry, and ad-network connections initiated by smart TVs, IoT sensors, mobile devices, and computers on your local network.

---

## ⚡ Architecture Overview

```
[Local Devices (TVs, IoT, Phones, PCs)]
                     │
                     ▼ (Port 443 Outbound)
   [Wi-Fi AP (hostapd/dnsmasq) OR Managed Switch SPAN Port]
                     │
                     ▼
          [Glasshouse Sniffer (Scapy)]
                     │
                     ▼
          [TCP Stream Reassembler] ── (Buffers & handles fragmented ClientHellos)
                     │
                     ▼
      [TLS ClientHello SNI Parser] ── (Extracts domain from Extension 0x0000)
                     │
                     ▼
   [Suffix Domain Trie Classifier] ── (StevenBlack / OISD blocklists + User Rules)
                     │
                     ▼
             [SQLite Storage] ──────── (Async aiosqlite device & connection records)
                     │
                     ▼
          [Privacy Score Engine] ───── (Rolling 24h weighted tracker deduction)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
 [FastAPI REST Endpoints]  [WebSocket /ws/live]
          │                     │
          └──────────┬──────────┘
                     ▼
     [Next.js + Tailwind Cyber Dashboard]
```

---

## 🛡️ Ethical & Legal Boundaries

> [!IMPORTANT]
> **Strict Privacy Guarantees:**
> 1. **SNI-Only Inspection:** Glasshouse *only* inspects the unencrypted `Server Name Indication (SNI)` extension in standard TLS `ClientHello` handshake records.
> 2. **Zero Decryption / Zero MITM:** Glasshouse never terminates TLS sessions, intercepts encrypted payloads, installs root certificates, or performs man-in-the-middle decryption.
> 3. **Authorized Networks Only:** Glasshouse is strictly intended for private home laboratories or networks owned by the operator, or where explicit consent has been provided by all network participants.

---

## 🧮 Privacy Scoring Formula

Glasshouse computes a per-device privacy score ($0 - 100$) over a rolling 24-hour window based on connection proportions and tracker breadth:

$$\text{tracker\_ratio} = \frac{\text{tracker\_connections} + \text{ad\_network\_connections}}{\text{total\_connections}}$$

$$\text{unique\_trackers} = \text{count}(\text{distinct tracker domains})$$

$$\text{Score} = \max\Big(0, \, 100 - (\text{tracker\_ratio} \times 60) - \min(\text{unique\_trackers} \times 2, \, 40)\Big)$$

| Score Range | Grade | Rating | Status Indicator |
| :--- | :--- | :--- | :--- |
| **90 – 100** | A | Excellent | 🟢 Green |
| **75 – 89** | B | Good | 🔵 Cyan |
| **60 – 74** | C | Fair | 🟡 Amber |
| **40 – 59** | D | Concerning | 🟠 Orange |
| **0 – 39** | F | Critical | 🔴 Rose/Red |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional on Windows) Npcap installed with WinPcap API-compatible mode enabled

### 1. Install Dependencies
```bash
# Python backend dependencies
pip install -r requirements.txt

# Dashboard frontend dependencies
cd dashboard
npm install
cd ..
```

### 2. Seed Realistic Demo Data (Optional)
```bash
python scripts/seed_demo.py
```

### 3. Run Backend API Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Run Frontend Dashboard
```bash
cd dashboard
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Glasshouse radar dashboard.

---

## 📡 Deployment Modes (Raspberry Pi / Linux)

### Mode A: Dedicated Wi-Fi Access Point (Recommended for IoT)
Turn your Raspberry Pi into an isolated monitoring AP where target devices connect directly:
```bash
sudo ./scripts/setup_ap.sh
```

### Mode B: Managed Switch Port Mirroring (SPAN)
Mirror your home router or switch traffic to the Raspberry Pi's secondary ethernet interface:
```bash
sudo ./scripts/setup_mirror.sh eth1
python capture/service.py --interface eth1
```

### Mode C: Automated Background Service (systemd)
```bash
sudo cp systemd/glasshouse.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now glasshouse.service
```

---

## 🔧 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck and service status |
| `GET` | `/api/devices` | List all discovered LAN devices with latest score |
| `GET` | `/api/devices/{mac}` | Deep-dive telemetry, score history, and connection logs |
| `GET` | `/api/connections` | Filterable connection stream (`classification`, `device_mac`, `limit`) |
| `GET` | `/api/stats` | Network-wide privacy score average, tracker ratios, and top offending domains |
| `GET` | `/api/custom-rules` | List user custom allowlist and blocklist overrides |
| `POST` | `/api/custom-rules` | Add custom rule (`{"domain": "...", "action": "allow|block", "category": "..."}`) |
| `DELETE`| `/api/custom-rules/{domain}` | Remove custom rule |
| `WS` | `/ws/live` | Real-time WebSocket connection event broadcast |

---

## ❓ Troubleshooting & FAQs

### 1. Scapy Sniffer Permission Errors on Linux (`Operation not permitted`)
Raw packet sniffing requires raw socket capabilities. Run:
```bash
sudo setcap cap_net_raw,cap_net_admin=eip $(readlink -f $(which python))
```

### 2. Running on Windows
On Windows, Scapy uses Npcap for packet capture. If capturing live network traffic directly on Windows, ensure [Npcap](https://npcap.com/) is installed with the *"WinPcap API-compatible Mode"* option checked.

### 3. Encrypted ClientHello (ECH)
If clients support draft ECH and DNS HTTPS records, the inner SNI is encrypted. Glasshouse continues to inspect standard outer SNI and legacy TLS handshakes.

### 4. Device IP Changes (DHCP Leases)
Glasshouse keys devices primarily by hardware MAC address. When a device receives a new DHCP IP address, the system automatically updates the device's IP mapping without losing historical privacy scores.

---

## 🧪 Running Automated Tests

```bash
# Run complete test suite (TLS parsing, reassembly, classifier, storage, scoring, API)
pytest -v
```

---

## 📄 License
MIT License. Created for local network privacy awareness and diagnostics.
