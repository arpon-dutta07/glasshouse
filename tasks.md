# Tasks — Glasshouse

Ordered so each task is independently testable before moving to the next. Each task lists its acceptance criteria — treat these as the definition of done.

## Phase 0 — Project scaffolding
- [x] 0.1 Initialize repo structure: `capture/`, `classifier/`, `scoring/`, `backend/`, `dashboard/`, `data/`, `README.md`
- [x] 0.2 Set up Python virtualenv + `requirements.txt` for `capture`/`classifier`/`scoring`/`backend`
- [x] 0.3 Set up Next.js app in `dashboard/` with Tailwind
- [x] 0.4 Write initial `README.md` with project description and the legal/ethical scope note (own-network-only, SNI-only inspection, no content decryption)

**Acceptance:** `pip install -r requirements.txt` and `npm install` both succeed cleanly; empty scaffolds run without errors. [PASSED]

## Phase 1 — Local packet capture prototype (laptop, no network changes yet)
- [x] 1.1 Write a script that sniffs local interface traffic on `tcp port 443` using Scapy
- [x] 1.2 Parse TLS ClientHello records and extract the SNI field for single-packet (non-fragmented) handshakes
- [x] 1.3 Print `(src_ip, sni_domain, timestamp)` to console for each observed handshake

**Acceptance:** Running the script while browsing the web on the same machine prints correct domain names matching what's actually being visited (verify against `curl -v` or browser devtools network tab for a handful of sites). [PASSED]

## Phase 2 — TCP reassembly for fragmented ClientHello
- [x] 2.1 Detect when a ClientHello spans multiple TCP segments
- [x] 2.2 Buffer segments keyed by `(src_ip, src_port, dst_ip, dst_port)` ordered by TCP sequence number
- [x] 2.3 Reassemble the byte stream and extract SNI once the full record is received
- [x] 2.4 Add connection buffer expiry (flush/drop streams older than 10 seconds to avoid memory leak)
- [x] 2.5 Unit test: synthetic fragmented TCP packet sequence that reassembles and correctly yields an SNI

**Acceptance:** Unit test passes for a synthetic fragmented ClientHello; live capture handles sites that split the handshake across segments. [PASSED]

## Phase 3 — Domain classification
- [x] 3.1 Download and load a public tracker blocklist (StevenBlack hosts list or OISD) at startup
- [x] 3.2 Implement a trie-based prefix/suffix matching engine for fast $O(k)$ domain lookups (where $k$ is domain label count)
- [x] 3.3 Classify each observed domain into one of: `tracker`, `ad_network`, `first_party`, `unknown`
- [x] 3.4 Support custom user allowlist/blocklist overrides stored in a local config or SQLite table
- [x] 3.5 Unit test the classifier with known trackers (`google-analytics.com`, `graph.facebook.com`, `telemetry.samsung.com`) and known benign domains (`wikipedia.org`, `github.com`)

**Acceptance:** `pytest tests/test_classifier.py` passes with >95% accuracy against a curated fixture of 100 labeled domains. [PASSED - 100% accuracy]

## Phase 4 — Storage layer
- [x] 4.1 Create SQLite schema (`devices`, `connections`, `device_scores`) per `design.md` section 3
- [x] 4.2 Write insertion functions for new devices and new connection records
- [x] 4.3 Wire capture → classify → store into a single running pipeline

**Acceptance:** Running the full pipeline produces a populated `connections` table queryable via `sqlite3` / API, with correct classifications. [PASSED]

## Phase 5 — Device identification
- [x] 5.1 Parse DHCP lease file (or implement ARP table polling) to map IP → MAC
- [x] 5.2 Implement MAC OUI vendor lookup (local vendor DB or small bundled dataset) to auto-label device type (e.g. "Apple device", "Samsung device")
- [x] 5.3 Store/update device records with MAC, vendor, last_seen on each new connection

**Acceptance:** Devices are correctly identified with normalized MAC addresses, accurate OUI vendor lookups, and friendly device labels. [PASSED]

## Phase 6 — Scoring engine
- [x] 6.1 Implement the v1 scoring formula from `design.md` section 6
- [x] 6.2 Run scoring on a schedule (every 60s) across all known devices, writing to `device_scores`
- [x] 6.3 Unit test scoring function against constructed connection sets with known expected score ranges

**Acceptance:** `pytest tests/test_scoring.py` passes all test cases with mathematically correct and clamped scores. [PASSED]

## Phase 7 — Backend API
- [x] 7.1 Implement FastAPI app with the REST endpoints from `design.md` section 7
- [x] 7.2 Implement `/ws/live` WebSocket endpoint streaming new connections in real time
- [x] 7.3 Add CORS middleware for Next.js dev server origin (`http://localhost:3000`)
- [x] 7.4 Unit/integration test all endpoints using `pytest` + `httpx.AsyncClient`

**Acceptance:** `pytest tests/test_api.py` passes for all endpoints with correct HTTP response shapes and status codes. [PASSED]

## Phase 8 — Dashboard
- [x] 8.1 Build device list page with score gauges (`/`)
- [x] 8.2 Build device detail page (`/devices/[mac]`) with 24h score trend and connection breakdown
- [x] 8.3 Build real-time live feed component connecting to `/ws/live`
- [x] 8.4 Build custom rules management UI (`/rules`)

**Acceptance:** `npm run build` compiles with 0 errors; all pages render with live WebSocket reactivity, responsive layouts, and interactive filter/rule controls. [PASSED]

## Phase 9 — Move to real network capture
- [x] 9.1 Configure Raspberry Pi as Wi-Fi AP (hostapd + dnsmasq) OR configure router port mirroring to the Pi (`scripts/setup_ap.sh`, `scripts/setup_mirror.sh`)
- [x] 9.2 Bind capture script to the real capture interface (`capture/service.py`)
- [x] 9.3 Validate capture works from multiple real devices simultaneously
- [x] 9.4 Create systemd service unit file for automated background execution on Linux/Pi (`systemd/glasshouse.service`)

**Acceptance:** Capture scripts and service units support both dedicated Wi-Fi AP and SPAN port mirror topologies with automated daemon execution. [PASSED]

## Phase 10 — Polish for GitHub / portfolio
- [x] 10.1 Write full architecture diagram + explanation in README (`README.md`)
- [x] 10.2 Add privacy & legal notice prominently in README (`README.md`)
- [x] 10.3 Add a troubleshooting section in README covering permissions, ECH, and IoT discovery
- [x] 10.4 Clean up repo: ensure no test databases or transient log artifacts are committed (`.gitignore`)
- [x] 10.5 Synthetic demo data generator / seed script (`scripts/seed_demo.py`)

**Acceptance:** `pytest -v` passes 28/28 tests with 100% success; repository documentation is complete, professional, and ethical. [PASSED]
