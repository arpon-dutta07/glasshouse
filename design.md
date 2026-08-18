# Design — Glasshouse

## 1. Architecture Overview

```
[Home devices] --> [Router, mirrored/AP traffic] --> [Capture service]
                                                             |
                                                    parses TLS ClientHello (SNI)
                                                             |
                                                    [Classifier] (blocklist match)
                                                             |
                                                    [SQLite/Postgres storage]
                                                             |
                                                    [Scoring engine]
                                                             |
                                                    [Backend API + WebSocket]
                                                             |
                                                    [Next.js dashboard]
```

Five independently testable components: **capture, classify, store, score, serve/visualize**.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Packet capture & TLS parsing | Python + Scapy (v1) | Fastest to prototype; swap to Go + gopacket later if reassembly performance becomes an issue |
| Domain classification | Python, in-process trie/set lookup against downloaded blocklists | No external calls needed at runtime |
| Storage | SQLite (v1) → Postgres (v2 if scaling) | Zero-ops for a single Pi deployment |
| Backend API | FastAPI (Python) | Same language as capture layer, native WebSocket support, async |
| Real-time updates | WebSocket (`/ws/live`) | Sub-2-second dashboard updates |
| Frontend | Next.js + React + Tailwind | Matches builder's existing frontend comfort |
| Device identification | DHCP lease parsing + MAC OUI vendor lookup | No manual device setup required beyond optional renaming |

## 3. Data model

```sql
CREATE TABLE devices (
    id INTEGER PRIMARY KEY,
    mac_address TEXT UNIQUE NOT NULL,
    display_name TEXT,
    vendor TEXT,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP
);

CREATE TABLE connections (
    id INTEGER PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id),
    domain TEXT NOT NULL,
    classification TEXT NOT NULL CHECK(classification IN ('tracker','ad_network','first_party','unknown')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_scores (
    id INTEGER PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id),
    score INTEGER NOT NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_connections_device_time ON connections(device_id, timestamp);
```

## 4. Capture & parsing module (`capture/`)

- Listens on the mirrored/AP interface, filters `tcp port 443`
- Reassembles fragmented TCP streams before attempting TLS ClientHello parsing (this is the highest-risk technical component — budget the most iteration time here)
- Extracts `(src_mac, src_ip, sni_domain, timestamp)` per handshake
- Pushes each record onto an internal queue (e.g. `asyncio.Queue` or a lightweight message queue) consumed by the classifier

## 5. Classifier module (`classifier/`)

- On startup, downloads/loads a blocklist (StevenBlack hosts list or OISD) into a suffix-matching trie
- Exposes `classify(domain: str) -> Literal["tracker","ad_network","first_party","unknown"]`
- "first_party" heuristic: domain's registrable root matches an app the device is known to use (best-effort, v2 refinement — v1 can default anything not on the blocklist to "unknown")

## 6. Scoring module (`scoring/`)

- Runs on a schedule (e.g. every 60s) or on-demand per device
- v1 formula (tunable):
  `score = max(0, 100 - (tracker_ratio * 60) - min(unique_tracker_count * 2, 40))`
- Writes result to `device_scores` with timestamp, so history is queryable for trend charts

## 7. Backend API (`backend/`)

REST:
- `GET /devices` → list devices with current score
- `GET /devices/{id}` → device detail
- `GET /devices/{id}/connections?since=` → recent connections
- `GET /devices/{id}/score-history?range=7d|30d`
- `PATCH /devices/{id}` → rename device

WebSocket:
- `WS /ws/live` → streams new connection events as `{device_id, domain, classification, timestamp}` for the live feed

## 8. Frontend (`dashboard/`)

- `/` — grid of device cards (name, score gauge, top tracker count)
- `/devices/[id]` — live feed (subscribed to WebSocket), classification breakdown chart, score trend line
- Score gauge styled like a credit-score meter (red → yellow → green)

## 9. Deployment target

- Raspberry Pi 3B+/4, configured either as the network's Wi-Fi AP (hostapd + dnsmasq) or receiving mirrored traffic from a managed switch/router
- Capture service run as a systemd service for auto-restart
- Backend + frontend can run on the same Pi or a separate always-on machine on the LAN

## 10. Key technical risks (flag these early to the coding agent)

1. TCP reassembly for fragmented TLS ClientHello — most likely source of dropped/incomplete captures
2. Requires elevated permissions (raw socket / promiscuous mode) — capture service needs to run with appropriate privileges (e.g. `CAP_NET_RAW`), document this clearly in setup instructions
3. Mapping IP → device reliably requires either static DHCP leases or continuous ARP/MAC tracking, since IPs can change
