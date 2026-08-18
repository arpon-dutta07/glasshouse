# PRD — Glasshouse

## 1. Problem
Devices on a home network constantly make outbound connections to ad networks, analytics services, and trackers, invisibly and without user awareness. Because almost all of this traffic is TLS-encrypted, ordinary users have no visibility into who their devices are talking to. Existing tools (Pi-hole, etc.) block at the DNS level but don't give a live, per-device, human-readable picture of *how leaky* each device is over time.

## 2. Goal
Build a self-hosted dashboard that:
- Passively observes TLS handshakes on the home network (without decrypting any content)
- Extracts the destination domain (SNI) of each connection
- Classifies each domain as tracker / ad network / first-party / unknown
- Attributes each connection to a specific device on the network
- Computes and displays a live, per-device "privacy score"
- Shows a live feed and historical trends per device

## 3. Non-goals (explicitly out of scope for v1)
- No decryption of TLS content — SNI-only inspection
- No blocking/filtering functionality (this is observability only, not a Pi-hole replacement) — may become a v2 feature
- No mobile app — web dashboard only
- No multi-network / cloud-hosted multi-tenant support — single home network, self-hosted

## 4. Target user
Primarily the builder themself (a portfolio/learning project), secondarily anyone technical enough to run a Pi on their home network who wants visibility into their own traffic.

## 5. Core user stories
1. As a user, I can see a list of all devices on my network with a live privacy score for each.
2. As a user, I can click into a device and see a live feed of domains it's contacting, each tagged as tracker/ad/first-party/unknown.
3. As a user, I can see which specific third-party trackers are most active across my whole network.
4. As a user, I can see a device's score trend over the past 7/30 days.
5. As a user, the system correctly labels devices (e.g. "Arpita's Phone") rather than showing raw MAC/IP addresses, once I've named them once.

## 6. Success criteria (how we know v1 is "done")
- Correctly extracts SNI from real TLS ClientHello packets on a live home network, including fragmented ones, with >95% capture success rate over a test period
- Classifies domains against a public blocklist with no manual per-domain work required
- Dashboard updates within ~2 seconds of a new connection being observed
- Runs continuously on a Raspberry Pi (or equivalent) without manual restarts for at least 48 hours
- README explains architecture + legal/ethical scope clearly enough for a GitHub visitor to understand the project in under 2 minutes

## 7. Constraints
- Must run entirely on local hardware (Raspberry Pi or home server) — no cloud dependency required for core function
- Must only ever inspect the SNI field of the TLS handshake, never attempt to decrypt payloads
- Intended for use only on networks/devices the operator owns or has explicit consent to monitor

## 8. Phased scope
- **v1 (MVP):** capture → parse → classify → score → live dashboard, single Pi, SQLite storage
- **v2 (stretch):** JA3/JA3S fingerprinting to identify the *app* generating traffic (not just domain), historical trend graphs, Postgres for scale, optional blocking mode
