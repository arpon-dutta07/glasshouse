"""Asynchronous SQLite database interface for Glasshouse."""

import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
import aiosqlite

DEFAULT_DB_PATH = "data/glasshouse.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS devices (
    mac_address TEXT PRIMARY KEY,
    ip_address TEXT,
    device_name TEXT,
    vendor TEXT,
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_mac TEXT,
    timestamp TIMESTAMP NOT NULL,
    destination_ip TEXT,
    sni_domain TEXT NOT NULL,
    classification TEXT NOT NULL,
    list_source TEXT,
    FOREIGN KEY(device_mac) REFERENCES devices(mac_address)
);

CREATE INDEX IF NOT EXISTS idx_connections_device_mac ON connections(device_mac);
CREATE INDEX IF NOT EXISTS idx_connections_timestamp ON connections(timestamp);
CREATE INDEX IF NOT EXISTS idx_connections_classification ON connections(classification);
CREATE INDEX IF NOT EXISTS idx_connections_sni_domain ON connections(sni_domain);

CREATE TABLE IF NOT EXISTS device_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_mac TEXT NOT NULL,
    computed_at TIMESTAMP NOT NULL,
    score INTEGER NOT NULL,
    tracker_count INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    FOREIGN KEY(device_mac) REFERENCES devices(mac_address)
);

CREATE INDEX IF NOT EXISTS idx_device_scores_mac ON device_scores(device_mac, computed_at DESC);

CREATE TABLE IF NOT EXISTS custom_rules (
    domain TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_domains (
    domain TEXT PRIMARY KEY,
    blocked_at TIMESTAMP NOT NULL,
    category TEXT NOT NULL,
    reason TEXT,
    mode TEXT NOT NULL DEFAULT 'test',
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS domain_enrichments (
    domain TEXT PRIMARY KEY,
    ip_address TEXT,
    created_year INTEGER,
    age_days INTEGER,
    cert_org TEXT,
    hosting_provider TEXT,
    summary_label TEXT,
    threat_vendors INTEGER DEFAULT 0,
    threat_source TEXT,
    threat_details TEXT,
    cached_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


class Database:
    """Async SQLite wrapper with high-level queries for Glasshouse."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    async def initialize(self):
        """Initializes tables and indexes."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(SCHEMA)
            await db.commit()

    async def purge_pseudo_devices(self):
        """Purges obsolete pseudo-MAC entries when real devices exist."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM devices WHERE mac_address LIKE 'ip:%'")
            await db.commit()

    async def purge_all_data(self):
        """Deletes all device, connection, and score data. Used to reset after seed/demo data."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM device_scores")
            await db.execute("DELETE FROM connections")
            await db.execute("DELETE FROM devices")
            await db.commit()

    async def re_resolve_all_device_vendors(self, device_tracker):
        """One-time startup migration: re-resolves vendor names and friendly device names for all stored devices."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT mac_address, ip_address, device_name, vendor FROM devices")
            devices = await cursor.fetchall()
            for dev in devices:
                mac = dev["mac_address"]
                current_vendor = dev["vendor"]
                current_name = dev["device_name"]
                
                resolved_vendor = device_tracker.lookup_vendor(mac)
                resolved_name = device_tracker.suggest_device_name(mac, vendor=resolved_vendor, ip=dev["ip_address"])
                
                # Update if different or currently Generic/None
                if resolved_vendor != current_vendor or resolved_name != current_name:
                    await db.execute(
                        "UPDATE devices SET vendor = ?, device_name = ? WHERE mac_address = ?",
                        (resolved_vendor, resolved_name, mac),
                    )
            await db.commit()

    async def upsert_device(
        self,
        mac_address: str,
        ip_address: Optional[str] = None,
        device_name: Optional[str] = None,
        vendor: Optional[str] = None,
        timestamp: Optional[datetime] = None,
    ):
        """Inserts or updates a network device record."""
        now = (timestamp or datetime.now(timezone.utc)).isoformat()
        mac = mac_address.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO devices (mac_address, ip_address, device_name, vendor, first_seen, last_seen)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(mac_address) DO UPDATE SET
                    ip_address = COALESCE(excluded.ip_address, devices.ip_address),
                    device_name = COALESCE(excluded.device_name, devices.device_name),
                    vendor = COALESCE(excluded.vendor, devices.vendor),
                    last_seen = excluded.last_seen
                """,
                (mac, ip_address, device_name, vendor, now, now),
            )
            await db.commit()

    async def delete_device(self, mac_address: str):
        """Removes a device and its associated connections and scores."""
        mac = mac_address.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM connections WHERE device_mac = ?", (mac,))
            await db.execute("DELETE FROM device_scores WHERE device_mac = ?", (mac,))
            await db.execute("DELETE FROM devices WHERE mac_address = ?", (mac,))
            await db.commit()

    async def update_device_name(self, mac_address: str, device_name: str):
        """Updates the custom friendly name for a device."""
        mac = mac_address.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE devices SET device_name = ? WHERE mac_address = ?",
                (device_name.strip(), mac),
            )
            await db.commit()

    async def get_device(self, mac_address: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single device by MAC address."""
        mac = mac_address.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM devices WHERE mac_address = ?", (mac,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_all_devices(self) -> List[Dict[str, Any]]:
        """Retrieves all observed devices ordered by last seen."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM devices ORDER BY last_seen DESC")
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def record_connection(
        self,
        sni_domain: str,
        classification: str,
        device_mac: Optional[str] = None,
        destination_ip: Optional[str] = None,
        list_source: Optional[str] = None,
        timestamp: Optional[datetime] = None,
    ) -> int:
        """Records a new TLS ClientHello connection event."""
        ts = (timestamp or datetime.now(timezone.utc)).isoformat()
        mac = device_mac.lower().strip() if device_mac else None
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                INSERT INTO connections (device_mac, timestamp, destination_ip, sni_domain, classification, list_source)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (mac, ts, destination_ip, sni_domain.lower().strip(), classification, list_source),
            )
            await db.commit()
            return cursor.lastrowid

    async def get_recent_connections(
        self,
        limit: int = 50,
        device_mac: Optional[str] = None,
        classification: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves recent connections with optional filters."""
        query = """
            SELECT c.*, d.device_name, d.vendor, d.ip_address as src_ip
            FROM connections c
            LEFT JOIN devices d ON c.device_mac = d.mac_address
            WHERE 1=1
        """
        params: List[Any] = []

        if device_mac:
            query += " AND c.device_mac = ?"
            params.append(device_mac.lower().strip())
        if classification:
            query += " AND c.classification = ?"
            params.append(classification)

        query += " ORDER BY c.timestamp DESC LIMIT ?"
        params.append(limit)

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def get_connections_in_window(
        self,
        device_mac: str,
        since_timestamp: datetime,
    ) -> List[Dict[str, Any]]:
        """Retrieves all connections for a device since a given timestamp."""
        ts_str = since_timestamp.isoformat()
        return await self.get_device_connections_since(device_mac, ts_str)

    async def get_device_connections_since(
        self,
        device_mac: str,
        since_iso: str,
    ) -> List[Dict[str, Any]]:
        """Retrieves connections for a device since an ISO timestamp string."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT * FROM connections
                WHERE device_mac = ? AND timestamp >= ?
                ORDER BY timestamp ASC
                """,
                (device_mac.lower().strip(), since_iso),
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def record_device_score(
        self,
        device_mac: str,
        score: int,
        tracker_count: int,
        total_count: int,
        computed_at: Optional[datetime] = None,
    ):
        """Saves a computed privacy score snapshot."""
        ts = (computed_at or datetime.now(timezone.utc)).isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO device_scores (device_mac, computed_at, score, tracker_count, total_count)
                VALUES (?, ?, ?, ?, ?)
                """,
                (device_mac.lower().strip(), ts, score, tracker_count, total_count),
            )
            await db.commit()

    async def record_score(
        self,
        device_mac: str,
        score: int,
        tracker_count: int,
        total_count: int,
        computed_at: Optional[datetime] = None,
    ):
        """Alias for record_device_score."""
        return await self.record_device_score(
            device_mac=device_mac,
            score=score,
            tracker_count=tracker_count,
            total_count=total_count,
            computed_at=computed_at,
        )

    async def get_latest_scores(self) -> Dict[str, Dict[str, Any]]:
        """Returns the most recent score snapshot for each device."""
        query = """
            SELECT s.*
            FROM device_scores s
            INNER JOIN (
                SELECT device_mac, MAX(computed_at) as max_time
                FROM device_scores
                GROUP BY device_mac
            ) latest ON s.device_mac = latest.device_mac AND s.computed_at = latest.max_time
        """
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(query)
            rows = await cursor.fetchall()
            return {row["device_mac"]: dict(row) for row in rows}

    async def get_device_score_history(
        self,
        device_mac: str,
        limit: int = 24,
    ) -> List[Dict[str, Any]]:
        """Returns historical scores for a device."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT * FROM device_scores
                WHERE device_mac = ?
                ORDER BY computed_at ASC LIMIT ?
                """,
                (device_mac.lower().strip(), limit),
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def get_score_history(
        self,
        device_mac: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Alias for get_device_score_history."""
        return await self.get_device_score_history(device_mac=device_mac, limit=limit)

    async def add_custom_rule(self, domain: str, action: str, category: str):
        """Adds or updates a custom user rule."""
        ts = datetime.now(timezone.utc).isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO custom_rules (domain, action, category, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(domain) DO UPDATE SET
                    action = excluded.action,
                    category = excluded.category,
                    created_at = excluded.created_at
                """,
                (domain.lower().strip(), action, category, ts),
            )
            await db.commit()

    async def get_custom_rules(self) -> List[Dict[str, Any]]:
        """Returns all custom user rules."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM custom_rules ORDER BY created_at DESC")
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def delete_custom_rule(self, domain: str):
        """Deletes a custom user rule."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM custom_rules WHERE domain = ?", (domain.lower().strip(),))
            await db.commit()

    # --- Blocked Domains Table Queries ---

    async def add_blocked_domain(
        self,
        domain: str,
        category: str,
        reason: str = "",
        mode: str = "test",
    ):
        """Records a domain in the blocked domains table."""
        ts = datetime.now(timezone.utc).isoformat()
        dom = domain.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO blocked_domains (domain, blocked_at, category, reason, mode, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
                ON CONFLICT(domain) DO UPDATE SET
                    blocked_at = excluded.blocked_at,
                    category = excluded.category,
                    reason = excluded.reason,
                    mode = excluded.mode,
                    is_active = 1
                """,
                (dom, ts, category, reason, mode),
            )
            await db.commit()

    async def remove_blocked_domain(self, domain: str):
        """Removes or deactivates a domain from blocked_domains."""
        dom = domain.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM blocked_domains WHERE domain = ?", (dom,))
            await db.commit()

    async def get_blocked_domains(self) -> List[Dict[str, Any]]:
        """Returns all currently blocked domains."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM blocked_domains WHERE is_active = 1 ORDER BY blocked_at DESC")
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def get_blocked_domain_set(self) -> Set[str]:
        """Returns set of all active blocked domains for instant lookups."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("SELECT domain FROM blocked_domains WHERE is_active = 1")
            rows = await cursor.fetchall()
            return {r[0].lower().strip() for r in rows}

    async def is_domain_blocked(self, domain: str) -> bool:
        """Checks if a domain or its parent domain is actively blocked."""
        dom = domain.lower().strip()
        blocked_set = await self.get_blocked_domain_set()
        if dom in blocked_set:
            return True
        for b in blocked_set:
            if dom.endswith("." + b):
                return True
        return False

    # --- App Settings Queries ---

    async def get_setting(self, key: str, default: str = "") -> str:
        """Retrieves a persistent setting value."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
            row = await cursor.fetchone()
            return row["value"] if row else default

    async def set_setting(self, key: str, value: str):
        """Saves a persistent setting value."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, str(value)),
            )
            await db.commit()

    # --- Domain Enrichment Cache Queries ---

    async def get_domain_enrichment(self, domain: str) -> Optional[Dict[str, Any]]:
        """Retrieves cached enrichment data for a domain."""
        dom = domain.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM domain_enrichments WHERE domain = ?", (dom,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def upsert_domain_enrichment(
        self,
        domain: str,
        ip_address: Optional[str] = None,
        created_year: Optional[int] = None,
        age_days: Optional[int] = None,
        cert_org: Optional[str] = None,
        hosting_provider: Optional[str] = None,
        summary_label: str = "",
        threat_vendors: int = 0,
        threat_source: str = "",
        threat_details: str = "",
    ):
        """Caches domain enrichment data."""
        now = datetime.now(timezone.utc).isoformat()
        dom = domain.lower().strip()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO domain_enrichments (
                    domain, ip_address, created_year, age_days, cert_org,
                    hosting_provider, summary_label, threat_vendors, threat_source, threat_details, cached_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(domain) DO UPDATE SET
                    ip_address = COALESCE(excluded.ip_address, domain_enrichments.ip_address),
                    created_year = COALESCE(excluded.created_year, domain_enrichments.created_year),
                    age_days = COALESCE(excluded.age_days, domain_enrichments.age_days),
                    cert_org = COALESCE(excluded.cert_org, domain_enrichments.cert_org),
                    hosting_provider = COALESCE(excluded.hosting_provider, domain_enrichments.hosting_provider),
                    summary_label = excluded.summary_label,
                    threat_vendors = excluded.threat_vendors,
                    threat_source = excluded.threat_source,
                    threat_details = excluded.threat_details,
                    cached_at = excluded.cached_at
                """,
                (
                    dom,
                    ip_address,
                    created_year,
                    age_days,
                    cert_org,
                    hosting_provider,
                    summary_label,
                    threat_vendors,
                    threat_source,
                    threat_details,
                    now,
                ),
            )
            await db.commit()
