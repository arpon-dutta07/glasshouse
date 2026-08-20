<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Scapy-2.5+-2E7D32?style=for-the-badge&logo=wireshark&logoColor=white" alt="Scapy" />
  <img src="https://img.shields.io/badge/SQLite-Embedded-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Tests-28%2F28%20Passing-brightgreen?style=for-the-badge" alt="Tests" />
</p>

<h1 align="center">🔍 Glasshouse</h1>

<p align="center">
  <strong>Passive TLS Network Privacy Observability & Per-Device Score Engine</strong>
</p>

<p align="center">
  <em>See through your network. Know exactly who your devices are talking to — without breaking a single packet.</em>
</p>

---

## 🧠 What is Glasshouse?

Glasshouse is a **self-hosted, privacy-first network monitoring platform** that gives you complete visibility into the outbound connections made by every device on your home network — smart TVs, IoT sensors, phones, laptops, and everything in between.

Every time a device on your network opens an HTTPS connection, it performs a TLS handshake. Inside that handshake, before any encryption begins, the device announces the destination domain in plaintext via a field called **Server Name Indication (SNI)**. Glasshouse passively captures these handshakes, extracts the SNI domain, classifies it against public tracker and ad-network blocklists, and computes a rolling **privacy score** for each device — all in real time, all without decrypting a single byte of your traffic.

Think of it as a **credit score for your devices' privacy hygiene**.

---

## 🤔 The Problem It Solves

Modern connected devices are constantly phoning home. Your smart TV pings Samsung telemetry servers. Your phone reports to analytics platforms. Your laptop leaks data to ad networks, trackers, and measurement services — all silently, all behind TLS encryption, and all without your knowledge.

**Existing solutions fall short:**

| Tool | Limitation |
| :--- | :--- |
| **Pi-hole** | Blocks at DNS level but doesn't show per-device leakiness or compute privacy scores |
| **Wireshark** | Powerful but overwhelming; requires manual packet inspection, not built for continuous monitoring |
| **Browser extensions** | Only cover browser traffic; miss OS-level telemetry, IoT devices, and app-layer tracking |
| **Router logs** | Show IPs, not domains; no classification, no scoring, no historical trends |

**Glasshouse fills the gap** by providing:
- ✅ **Per-device attribution** — know exactly which device contacted which tracker
- ✅ **Automatic classification** — every domain is categorized as tracker, ad network, first-party, malicious, or unknown
- ✅ **Live privacy scoring** — a rolling 24-hour score that tells you how "leaky" each device is
- ✅ **Real-time dashboard** — sub-2-second updates via WebSocket, no page refreshes needed
- ✅ **Zero decryption** — only inspects the unencrypted SNI field, never touches encrypted payloads

---

## ⚡ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    LOCAL NETWORK DEVICES                             │
│        (Smart TVs, IoT, Phones, Laptops, Consoles)                  │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ Port 443 (HTTPS) Outbound
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│     Wi-Fi AP (hostapd/dnsmasq) OR Managed Switch SPAN Port          │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ Mirrored / Bridged Traffic
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   CAPTURE LAYER  (capture/)                          │
│                                                                      │
│  ┌─────────────────┐    ┌───────────────────────┐                    │
│  │  Packet Sniffer  │───▶│  TCP Stream Reassembler│                   │
│  │  (Scapy BPF)    │    │  (4-tuple keyed, seq-  │                   │
│  │  tcp port 443   │    │   ordered, 10s timeout)│                   │
│  └─────────────────┘    └───────────┬───────────┘                    │
│                                     │                                │
│                         ┌───────────▼───────────┐                    │
│                         │  TLS ClientHello Parser│                    │
│                         │  Extension 0x0000 (SNI)│                    │
│                         └───────────┬───────────┘                    │
└─────────────────────────────────────┼────────────────────────────────┘
                                      │ SNIRecord(src_ip, src_mac,
                                      │   sni_domain, timestamp)
                                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│              CLASSIFICATION LAYER  (classifier/)                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Layer 1: Suffix Domain Trie                                    │   │
│  │   • StevenBlack Unified Hosts (91K+ rules)                    │   │
│  │   • EasyPrivacy + EasyList (Firebog mirror)                   │   │
│  │   • OISD Basic Domains                                        │   │
│  │   • 90+ curated seed rules (offline bootstrap)                │   │
│  │   • Custom user allowlist / blocklist overrides                │   │
│  └────────────────────────────┬───────────────────────────────────┘   │
│                               │ No match?                            │
│  ┌────────────────────────────▼───────────────────────────────────┐   │
│  │ Layer 2: Threat Intelligence                                   │   │
│  │   • URLhaus (abuse.ch) — free, no API key                     │   │
│  │   • VirusTotal API v3 — rate-limited, 3+ vendor consensus     │   │
│  └────────────────────────────┬───────────────────────────────────┘   │
│                               │ Still unknown?                       │
│  ┌────────────────────────────▼───────────────────────────────────┐   │
│  │ Layer 3: Domain Enrichment (Fallback Context)                  │   │
│  │   • WHOIS/RDAP registration age (young domain flagging)        │   │
│  │   • TLS certificate Organization field                         │   │
│  │   • Hosting provider / ASN identification                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ DomainClassification
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    STORAGE & SCORING LAYER                            │
│                                                                      │
│  ┌──────────────┐   ┌────────────────────┐   ┌──────────────────┐    │
│  │ SQLite (async)│   │  Privacy Score      │   │  Device Tracker   │   │
│  │ • devices    │   │  Engine             │   │  • ARP table poll │   │
│  │ • connections│◀──│  • 60s cycle         │   │  • MAC OUI lookup │   │
│  │ • scores    │   │  • 24h rolling window│   │  • rDNS hostname  │   │
│  │ • rules     │   │  • weighted formula  │   │  • auto-naming    │   │
│  │ • enrichment│   └────────────────────┘   └──────────────────┘    │
│  └──────┬───────┘                                                    │
└─────────┼────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   API & PRESENTATION LAYER                            │
│                                                                      │
│  ┌───────────────────────────────┐   ┌─────────────────────────────┐ │
│  │ FastAPI Backend (backend/)     │   │ Next.js Dashboard           │ │
│  │                               │   │ (dashboard/)                │ │
│  │  REST Endpoints:              │   │                             │ │
│  │  • GET  /api/devices          │   │  Pages:                     │ │
│  │  • GET  /api/devices/{mac}    │   │  • /         Overview Radar │ │
│  │  • GET  /api/connections      │   │  • /devices/[mac]  Detail   │ │
│  │  • GET  /api/stats            │   │  • /rules    Custom Rules   │ │
│  │  • POST /api/custom-rules     │   │  • /blocked  Block Manager  │ │
│  │  • POST /api/blocking/block   │   │                             │ │
│  │  • GET  /api/blocking/status  │   │  Components:                │ │
│  │  • GET  /api/blocking/enrich  │   │  • ScoreGauge (credit-style)│ │
│  │                               │   │  • LiveFeed (terminal-style)│ │
│  │  WebSocket:                   │   │  • DeviceCard (stats grid)  │ │
│  │  • WS  /ws/live               │───│  • DomainDetailModal        │ │
│  │                               │   │  • BlockModal (safety UI)   │ │
│  └───────────────────────────────┘   └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Five independently testable modules: **Capture → Classify → Store → Score → Serve/Visualize**.

---

## 🛡️ Ethical & Legal Boundaries

> [!IMPORTANT]
> **Strict Privacy Guarantees — This is Non-Negotiable**
>
> 1. **SNI-Only Inspection** — Glasshouse *only* reads the plaintext `Server Name Indication (SNI)` extension inside TLS `ClientHello` handshake records. This field is transmitted in the clear by design in the TLS protocol.
> 2. **Zero Decryption / Zero MITM** — Glasshouse never terminates TLS sessions, never intercepts encrypted payloads, never installs root certificates, and never performs man-in-the-middle attacks. It is physically incapable of reading your passwords, messages, or browsing content.
> 3. **Authorized Networks Only** — Glasshouse is intended *exclusively* for private home networks owned by the operator, or where explicit consent has been obtained from all network participants. Do not deploy on networks you do not own or control.

---

## ✨ Features

### Core Capabilities

| Feature | Description |
| :--- | :--- |
| **Passive TLS Sniffing** | Captures TLS ClientHello packets on port 443 using Scapy with BPF filters — zero interference with network traffic |
| **TCP Stream Reassembly** | Handles fragmented ClientHello handshakes split across multiple TCP segments, with 10-second expiry and LRU eviction |
| **Multi-Layer Domain Classification** | Three-tier classification pipeline: blocklist trie → threat intelligence → domain enrichment |
| **Per-Device Privacy Scoring** | Rolling 24-hour weighted score (0–100) computed every 60 seconds for every device on the network |
| **Real-Time WebSocket Feed** | Sub-2-second dashboard updates via `/ws/live` — every new connection streams live to connected clients |
| **Device Auto-Identification** | MAC OUI vendor lookup (38K+ IEEE prefixes), ARP table polling, reverse DNS resolution, and smart device naming |
| **Custom Rules Engine** | User-defined allowlists and blocklists with priority override above all blocklist sources |
| **Domain Blocking** | Optional hosts-file-level blocking with test mode, safety guardrails, and protected domain enforcement |
| **Threat Intelligence** | Layer 2 checks against URLhaus (abuse.ch) and VirusTotal API v3 with rate limiting and 48-hour caching |
| **Domain Enrichment** | Layer 3 fallback signals: WHOIS/RDAP registration age, TLS certificate org, hosting provider/ASN detection |

### Dashboard

| Page | What It Shows |
| :--- | :--- |
| **Overview (`/`)** | Network-wide privacy score gauge, tracker ratio percentage, total inspected handshakes, live terminal feed |
| **Device Detail (`/devices/[mac]`)** | Per-device score trend, connection breakdown by classification, live domain stream, rename & delete actions |
| **Custom Rules (`/rules`)** | Manage allowlist/blocklist overrides, add/remove rules with category selection |
| **Blocked Domains (`/blocked`)** | Active block manager with test/live mode toggle, one-click block/unblock, safety domain protection |

---

## 🧮 Privacy Scoring Formula

Glasshouse computes a per-device privacy score on a **0 – 100 scale** over a **rolling 24-hour window**:

$$\text{tracker\_ratio} = \frac{\text{tracker\_connections} + \text{ad\_network\_connections}}{\text{total\_connections}}$$

$$\text{unique\_trackers} = \text{count}(\text{distinct tracker/ad domains contacted})$$

$$\text{Score} = \max\Big(0, \; 100 - (\text{tracker\_ratio} \times 60) - \min(\text{unique\_trackers} \times 2, \; 40)\Big)$$

The formula penalizes both the **proportion** of tracking connections (up to 60 points) and the **breadth** of unique trackers contacted (up to 40 points). A device that talks to zero trackers scores a perfect 100.

| Score Range | Grade | Rating | Indicator |
| :--- | :--- | :--- | :--- |
| **90 – 100** | A | Excellent | 🟢 Green |
| **75 – 89** | B | Good | 🔵 Cyan |
| **60 – 74** | C | Fair | 🟡 Amber |
| **40 – 59** | D | Concerning | 🟠 Orange |
| **0 – 39** | F | Critical | 🔴 Red |

---

## 🧱 Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| Packet Capture | **Python 3.10+ / Scapy** | Rapid prototyping with native raw socket support |
| TCP Reassembly | **Custom reassembler** | 4-tuple keyed stream buffers with sequence ordering, overlap handling, and timeout eviction |
| TLS Parsing | **Manual binary parser** | Zero-dependency, struct-level ClientHello → SNI extraction (Extension Type `0x0000`) |
| Classification | **Suffix Domain Trie** | O(k) lookup where k = domain label count; efficient parent-domain matching |
| Blocklists | **StevenBlack, EasyPrivacy, EasyList, OISD** | Merged multi-source coverage with local caching |
| Threat Intel | **URLhaus (abuse.ch) + VirusTotal v3** | Free + premium dual-layer malicious domain detection |
| Storage | **SQLite via aiosqlite** | Zero-ops embedded database, async I/O, perfect for single-node deployment |
| Backend API | **FastAPI** | Native async/await, automatic OpenAPI docs, built-in WebSocket support |
| Real-Time Updates | **WebSocket `/ws/live`** | JSON event broadcast to all connected dashboard clients |
| Frontend | **Next.js 16 + React 19 + Tailwind CSS 4** | Server components, modern React, utility-first styling |
| Device ID | **MAC OUI + ARP + rDNS** | IEEE vendor database (38K+ prefixes) with hostname resolution fallback |
| Deployment | **systemd service** | Auto-restart, capability-bound, production-ready daemon |

---

## 📁 Project Structure

```
glasshouse/
├── capture/                    # Packet capture & TLS parsing
│   ├── sniffer.py              # Live Scapy packet sniffer (BPF: tcp port 443)
│   ├── reassembler.py          # TCP stream reassembler for fragmented ClientHellos
│   ├── tls_parser.py           # Binary TLS ClientHello SNI extractor
│   ├── interface.py            # Auto-detect active network interface (Win/Linux/Mac)
│   └── service.py              # Standalone capture service entry point
│
├── classifier/                 # Domain classification engine
│   ├── classifier.py           # Multi-layer classification pipeline (L1→L2→L3)
│   ├── trie.py                 # Suffix domain trie (reversed-label O(k) matching)
│   ├── blocklist_loader.py     # Multi-source blocklist downloader, parser, and cache
│   ├── threat_intel.py         # URLhaus + VirusTotal threat intelligence service
│   └── enrichment.py           # WHOIS/RDAP, TLS cert, hosting provider enrichment
│
├── scoring/                    # Privacy scoring engine
│   └── engine.py               # Rolling 24h weighted score computation + async scheduler
│
├── backend/                    # FastAPI application
│   ├── main.py                 # App lifecycle, startup/shutdown, middleware, route registration
│   ├── database.py             # Async SQLite schema, CRUD operations, migrations
│   ├── pipeline.py             # Capture → classify → store → broadcast pipeline
│   ├── device_tracker.py       # MAC OUI lookup, ARP resolution, hostname detection
│   ├── hosts_blocker.py        # System hosts file blocking with safety guardrails
│   └── routes/
│       ├── devices.py          # GET/PATCH/DELETE /api/devices endpoints
│       ├── connections.py      # GET /api/connections (filterable stream)
│       ├── stats.py            # GET /api/stats (network-wide aggregations)
│       ├── rules.py            # GET/POST/DELETE /api/custom-rules
│       ├── blocking.py         # POST /api/blocking/block|unblock, GET enrichment
│       └── ws.py               # WebSocket /ws/live broadcast manager
│
├── dashboard/                  # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Overview: score gauge, tracker ratio, live feed
│       │   ├── devices/[mac]/  # Device detail: score trend, connection log
│       │   ├── rules/          # Custom allowlist/blocklist rule management
│       │   └── blocked/        # Domain blocking manager (test/live mode)
│       ├── components/
│       │   ├── ScoreGauge.tsx   # Animated SVG privacy score gauge
│       │   ├── LiveFeed.tsx     # Terminal-style real-time connection stream
│       │   ├── DeviceCard.tsx   # Device summary card with score + stats
│       │   ├── HostDeviceCard.tsx # Hero card for the monitoring host device
│       │   ├── BlockModal.tsx   # Block confirmation with safety check UI
│       │   ├── DomainDetailModal.tsx # Deep-dive domain enrichment modal
│       │   ├── CategoryLegend.tsx    # Classification color legend
│       │   ├── DeploymentBanner.tsx  # Setup/onboarding banner
│       │   ├── AnimatedCounter.tsx   # Odometer-style number animations
│       │   └── Navbar.tsx       # Navigation bar with page routing
│       └── lib/                # API client, utilities, types
│
├── scripts/
│   ├── seed_demo.py            # Generate realistic demo data for development
│   ├── setup_ap.sh             # Configure Raspberry Pi as Wi-Fi access point
│   └── setup_mirror.sh         # Configure SPAN port mirror interface
│
├── systemd/
│   └── glasshouse.service      # systemd unit file for production deployment
│
├── tests/                      # Comprehensive test suite (28 tests)
│   ├── test_tls_parser.py      # TLS ClientHello SNI extraction
│   ├── test_reassembler.py     # TCP stream reassembly (fragmented packets)
│   ├── test_classifier.py      # Multi-layer domain classification (100% accuracy)
│   ├── test_storage.py         # Database CRUD operations
│   ├── test_scoring.py         # Privacy score formula correctness
│   ├── test_device_tracker.py  # MAC OUI + ARP + hostname resolution
│   ├── test_api.py             # FastAPI endpoint integration tests
│   ├── test_enrichment.py      # Domain enrichment service
│   ├── test_threat_intel.py    # Threat intelligence layer
│   └── test_hosts_blocker.py   # Hosts file blocking safety
│
├── data/
│   ├── glasshouse.db           # SQLite database (auto-created)
│   └── blocklists/             # Cached blocklist files (auto-downloaded)
│
├── requirements.txt            # Python dependencies
├── package.json                # Workspace-level npm scripts
├── design.md                   # Technical design document
├── PRD.md                      # Product requirements document
└── tasks.md                    # Phased implementation task tracker
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Notes |
| :--- | :--- | :--- |
| **Python** | 3.10+ | Core backend and capture engine |
| **Node.js** | 18+ | Dashboard frontend |
| **npm** | 9+ | Package management |
| **Npcap** *(Windows only)* | Latest | Install with "WinPcap API-compatible Mode" enabled |

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/glasshouse.git
cd glasshouse
```

### 2. Install Dependencies

```bash
# Python backend
pip install -r requirements.txt

# Dashboard frontend
cd dashboard
npm install
cd ..
```

### 3. Seed Demo Data *(Optional — recommended for first-time exploration)*

```bash
python scripts/seed_demo.py
```

This generates realistic synthetic devices, connection histories, and privacy scores so you can explore the dashboard immediately without live network traffic.

### 4. Start the Backend API

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
- Initialize the SQLite database and apply schema
- Load classification rules (90+ curated seed domains)
- Start the privacy scoring engine (60-second cycle)
- Begin live packet capture on the detected network interface
- Open the WebSocket broadcast channel

### 5. Start the Dashboard

```bash
cd dashboard
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** to view the Glasshouse dashboard.

---

## 📡 Deployment Modes

### Mode A — Dedicated Wi-Fi Access Point *(Recommended for IoT Monitoring)*

Turn your Raspberry Pi into an isolated monitoring access point. Devices connect to the Pi's Wi-Fi, and Glasshouse captures all their outbound TLS traffic directly.

```bash
sudo ./scripts/setup_ap.sh
```

This configures `hostapd` and `dnsmasq` to create a dedicated monitoring network.

### Mode B — Managed Switch Port Mirroring (SPAN)

Mirror your existing router or switch traffic to the Raspberry Pi's secondary ethernet interface. No network reconfiguration required for client devices.

```bash
sudo ./scripts/setup_mirror.sh eth1
python capture/service.py --interface eth1
```

### Mode C — Automated Background Service (systemd)

For production deployment on a Raspberry Pi or Linux server:

```bash
sudo cp systemd/glasshouse.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now glasshouse.service

# Check status
sudo systemctl status glasshouse.service

# View logs
sudo journalctl -u glasshouse.service -f
```

The service runs with `CAP_NET_RAW` and `CAP_NET_ADMIN` capabilities for raw packet capture, auto-restarts on failure, and starts on boot.

---

## 🔧 REST API Reference

### Device Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/devices` | List all discovered devices with live privacy scores |
| `GET` | `/api/devices/{mac}` | Device detail: score history, recent connections, tracker breakdown |
| `PATCH` | `/api/devices/{mac}` | Rename a device (`{"device_name": "Arpita's Phone"}`) |
| `DELETE` | `/api/devices/{mac}` | Delete device and all associated connection records |

### Connection & Stats Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/connections` | Filterable connection stream (`classification`, `device_mac`, `limit`) |
| `GET` | `/api/stats` | Network-wide: average score, tracker ratio, top offending domains |
| `GET` | `/api/health` | Service health check and version info |

### Custom Rules Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/custom-rules` | List all user allowlist and blocklist overrides |
| `POST` | `/api/custom-rules` | Add a rule: `{"domain": "...", "action": "allow\|block", "category": "..."}` |
| `DELETE` | `/api/custom-rules/{domain}` | Remove a custom rule |

### Domain Blocking Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/blocking/status` | Current blocking engine status (test/live mode, permissions) |
| `POST` | `/api/blocking/mode` | Toggle test mode vs. live blocking: `{"test_mode": true\|false}` |
| `GET` | `/api/blocking/domains` | List all currently blocked domains |
| `POST` | `/api/blocking/block` | Block a domain: `{"domain": "...", "category": "tracker"}` |
| `POST` | `/api/blocking/unblock` | Unblock a domain: `{"domain": "..."}` |
| `GET` | `/api/blocking/enrichment/{domain}` | Deep Layer 3 enrichment: WHOIS age, TLS cert, hosting, threat intel |

### WebSocket

| Protocol | Endpoint | Description |
| :--- | :--- | :--- |
| `WS` | `/ws/live` | Real-time connection event broadcast (JSON per event) |

**WebSocket event payload:**
```json
{
  "id": 1234,
  "device_mac": "a4:83:e7:12:34:56",
  "src_ip": "192.168.1.42",
  "dst_ip": "142.250.80.46",
  "sni_domain": "google-analytics.com",
  "classification": "tracker",
  "is_blocked": true,
  "source": "seed",
  "timestamp": "2026-08-20T14:32:01+00:00"
}
```

---

## 🧪 Testing

Glasshouse includes a comprehensive test suite covering every layer of the system:

```bash
# Run the complete test suite
pytest -v
```

| Test File | Coverage Area | Tests |
| :--- | :--- | :--- |
| `test_tls_parser.py` | TLS ClientHello binary parsing, SNI extraction | ✅ |
| `test_reassembler.py` | TCP stream reassembly, fragmentation handling, timeout eviction | ✅ |
| `test_classifier.py` | Multi-layer classification pipeline (100% accuracy on curated fixtures) | ✅ |
| `test_storage.py` | SQLite CRUD: devices, connections, scores, rules | ✅ |
| `test_scoring.py` | Privacy score formula, grade boundaries, edge cases | ✅ |
| `test_device_tracker.py` | MAC normalization, OUI lookup, hostname resolution | ✅ |
| `test_api.py` | FastAPI endpoint integration (httpx AsyncClient) | ✅ |
| `test_enrichment.py` | Domain enrichment signals (WHOIS, TLS cert, hosting) | ✅ |
| `test_threat_intel.py` | Threat intelligence (URLhaus, VirusTotal) | ✅ |
| `test_hosts_blocker.py` | Hosts file blocking, safety guardrails, protected domains | ✅ |

**Result: 28/28 tests passing** ✅

---

## 🗃️ Data Model

```sql
-- Network devices identified by hardware MAC address
CREATE TABLE devices (
    id              INTEGER PRIMARY KEY,
    mac_address     TEXT UNIQUE NOT NULL,
    ip_address      TEXT,
    device_name     TEXT,
    vendor          TEXT,
    first_seen      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen       TIMESTAMP
);

-- Every observed TLS handshake with classification
CREATE TABLE connections (
    id              INTEGER PRIMARY KEY,
    device_mac      TEXT NOT NULL,
    sni_domain      TEXT NOT NULL,
    classification  TEXT NOT NULL,  -- 'tracker' | 'ad_network' | 'malicious' | 'first_party' | 'unknown'
    destination_ip  TEXT,
    list_source     TEXT,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rolling privacy scores per device
CREATE TABLE device_scores (
    id              INTEGER PRIMARY KEY,
    device_mac      TEXT NOT NULL,
    score           INTEGER NOT NULL,
    tracker_count   INTEGER DEFAULT 0,
    total_count     INTEGER DEFAULT 0,
    computed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_connections_device_time ON connections(device_mac, timestamp);
CREATE INDEX idx_scores_device_time ON device_scores(device_mac, computed_at);
```

---

## ❓ Troubleshooting

### Permission Errors on Linux (`Operation not permitted`)

Raw packet sniffing requires `CAP_NET_RAW`. Either run as root or grant capabilities:

```bash
sudo setcap cap_net_raw,cap_net_admin=eip $(readlink -f $(which python))
```

### Running on Windows

Scapy uses Npcap for packet capture on Windows. Install [Npcap](https://npcap.com/) with the **"WinPcap API-compatible Mode"** option checked. Run the backend with administrator privileges.

### Encrypted ClientHello (ECH)

If clients support draft ECH and DNS HTTPS records, the inner SNI is encrypted and invisible. Glasshouse continues to inspect standard outer SNI and legacy TLS handshakes. As ECH adoption grows, visibility will decrease for ECH-enabled connections — this is a deliberate browser privacy improvement, not a Glasshouse limitation.

### Device IP Changes (DHCP Lease Renewal)

Glasshouse keys devices primarily by **hardware MAC address**, not IP. When a device receives a new DHCP IP address, the system automatically updates the IP mapping without losing any historical privacy scores or connection records.

### Interface Detection

Glasshouse auto-detects the active network interface by matching the outbound IP. Override with the `GLASSHOUSE_IFACE` environment variable:

```bash
GLASSHOUSE_IFACE=eth1 python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Hosts File Blocking Not Working

Domain blocking in live mode requires write access to the system hosts file. On Windows, run as Administrator. On Linux, ensure the process has write permissions to `/etc/hosts`. Use test mode for simulated blocking without system modifications.

---

## 🗺️ Roadmap

| Version | Feature | Status |
| :--- | :--- | :--- |
| **v1.0** | Capture → Parse → Classify → Score → Dashboard | ✅ Complete |
| **v1.1** | Multi-layer classification, threat intel, domain enrichment, hosts blocking | ✅ Complete |
| **v2.0** | JA3/JA3S TLS fingerprinting (identify the *app* generating traffic) | 🔮 Planned |
| **v2.0** | Historical trend graphs with 7d/30d/90d ranges | 🔮 Planned |
| **v2.0** | PostgreSQL support for scale | 🔮 Planned |
| **v2.0** | Optional DNS-level blocking mode (Pi-hole style) | 🔮 Planned |

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests — all contributions help make Glasshouse better.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run the test suite (`pytest -v`) and ensure all 28 tests pass
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

Built for local network privacy awareness, education, and diagnostics.

---

<p align="center">
  <sub>Made with care for network transparency. If your smart TV is talking to 47 different trackers, you deserve to know about it.</sub>
</p>
