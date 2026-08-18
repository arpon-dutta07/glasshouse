# Tasks — Glasshouse

Ordered so each task is independently testable before moving to the next. Each task lists its acceptance criteria — treat these as the definition of done.

## Phase 0 — Project scaffolding
- [ ] 0.1 Initialize repo structure: `capture/`, `classifier/`, `scoring/`, `backend/`, `dashboard/`, `data/`, `README.md`
- [ ] 0.2 Set up Python virtualenv + `requirements.txt` for `capture`/`classifier`/`scoring`/`backend`
- [ ] 0.3 Set up Next.js app in `dashboard/` with Tailwind
- [ ] 0.4 Write initial `README.md` with project description and the legal/ethical scope note (own-network-only, SNI-only inspection, no content decryption)

**Acceptance:** `pip install -r requirements.txt` and `npm install` both succeed cleanly; empty scaffolds run without errors.

## Phase 1 — Local packet capture prototype (laptop, no network changes yet)
- [ ] 1.1 Write a script that sniffs local interface traffic on `tcp port 443` using Scapy
- [ ] 1.2 Parse TLS ClientHello records and extract the SNI field for single-packet (non-fragmented) handshakes
- [ ] 1.3 Print `(src_ip, sni_domain, timestamp)` to console for each observed handshake

**Acceptance:** Running the script while browsing the web on the same machine prints correct domain names matching what's actually being visited (verify against `curl -v` or browser devtools network tab for a handful of sites).

## Phase 2 — TCP reassembly for fragmented ClientHello
- [ ] 2.1 Detect when a ClientHello spans multiple TCP segments
- [ ] 2.2 Buffer and reassemble TCP streams per (src_ip, src_port, dst_ip, dst_port) tuple before attempting to parse
- [ ] 2.3 Re-run against real traffic and confirm previously-missed large ClientHellos are now captured

**Acceptance:** Capture success rate against a manual browsing session (visit 20+ distinct HTTPS sites) is ≥95%, verified by comparing captured domains against a simultaneous `tcpdump -w` capture reviewed in Wireshark.

## Phase 3 — Domain classification
- [ ] 3.1 Download and load a public tracker blocklist (StevenBlack hosts list or OISD) at startup
- [ ] 3.2 Build a suffix-matching structure (trie or similar) for fast domain lookup
- [ ] 3.3 Implement `classify(domain) -> "tracker" | "unknown"` (v1: anything not matched is "unknown"; skip "first_party" heuristic for now)
- [ ] 3.4 Unit test classifier against a known set of tracker and non-tracker domains

**Acceptance:** Classifier correctly labels a test set of 20 known-tracker domains and 20 known-benign domains with no false negatives on the tracker set.

## Phase 4 — Storage layer
- [ ] 4.1 Create SQLite schema (`devices`, `connections`, `device_scores`) per `design.md` section 3
- [ ] 4.2 Write insertion functions for new devices and new connection records
- [ ] 4.3 Wire capture → classify → store into a single running pipeline

**Acceptance:** Running the full pipeline for 10 minutes while browsing produces a populated `connections` table queryable via `sqlite3` CLI, with correct classifications.

## Phase 5 — Device identification
- [ ] 5.1 Parse DHCP lease file (or implement ARP table polling) to map IP → MAC
- [ ] 5.2 Implement MAC OUI vendor lookup (local vendor DB or small bundled dataset) to auto-label device type (e.g. "Apple device", "Samsung device")
- [ ] 5.3 Store/update device records with MAC, vendor, last_seen on each new connection

**Acceptance:** After a capture session involving 2+ real devices, the `devices` table shows correct MAC addresses and plausible vendor labels for each.

## Phase 6 — Scoring engine
- [ ] 6.1 Implement the v1 scoring formula from `design.md` section 6
- [ ] 6.2 Run scoring on a schedule (every 60s) across all known devices, writing to `device_scores`
- [ ] 6.3 Unit test scoring function against constructed connection sets with known expected score ranges

**Acceptance:** A device with 0 tracker connections scores 100; a device where >50% of connections are trackers scores meaningfully lower (<50) — verify with test fixtures.

## Phase 7 — Backend API
- [ ] 7.1 Implement FastAPI app with the REST endpoints from `design.md` section 7
- [ ] 7.2 Implement `WS /ws/live` broadcasting new connection events to connected clients as they're inserted
- [ ] 7.3 Add CORS config for local dashboard dev server

**Acceptance:** `GET /devices` returns real data from the database; connecting to `/ws/live` and triggering new traffic shows events arriving within ~2 seconds.

## Phase 8 — Dashboard
- [ ] 8.1 Build device list page with score gauges (`/`)
- [ ] 8.2 Build device detail page with live feed subscribed to WebSocket (`/devices/[id]`)
- [ ] 8.3 Add classification breakdown chart (tracker vs unknown vs first-party) per device
- [ ] 8.4 Add device rename functionality (calls `PATCH /devices/{id}`)

**Acceptance:** Dashboard running locally shows live-updating data end-to-end when the full pipeline (capture → classify → store → score → API) is running simultaneously.

## Phase 9 — Move to real network capture
- [ ] 9.1 Configure Raspberry Pi as Wi-Fi AP (hostapd + dnsmasq) OR configure router port mirroring to the Pi
- [ ] 9.2 Deploy capture service on the Pi as a systemd unit with appropriate capabilities (`CAP_NET_RAW`)
- [ ] 9.3 Confirm multi-device capture works: connect 2+ real household devices and confirm all appear correctly in the dashboard with distinct scores

**Acceptance:** System runs unattended for 48 hours on the Pi without crashing or requiring manual restart, capturing traffic from all connected household devices.

## Phase 10 — Polish for GitHub / portfolio
- [ ] 10.1 Write full architecture diagram + explanation in README (can reuse `design.md` content)
- [ ] 10.2 Add setup instructions (Pi flashing, network config, running each service)
- [ ] 10.3 Add score-history trend chart to device detail page (v2 stretch, optional)
- [ ] 10.4 Record a short demo GIF/video for the README

**Acceptance:** A stranger cloning the repo can understand what it does within 2 minutes of reading the README, and can follow setup instructions to reproduce it on their own Pi.
