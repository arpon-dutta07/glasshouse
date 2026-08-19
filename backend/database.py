"""Asynchronous SQLite database interface for Glasshouse."""

import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
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

    async def update_device_name(self, mac_address: str, device_name: str):
        """Updates custom friendly device name in the database."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE devices SET device_name = ? WHERE mac_address = ?",
                (device_name.strip(), mac_address.lower().strip()),
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
        """Inserts or updates a device record."""
        mac_address = mac_address.lower().strip()
        ts = (timestamp or datetime.now(timezone.utc)).isoformat()

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
                (mac_address, ip_address, device_name, vendor, ts, ts),
            )
            await db.commit()

    async def record_connection(
        self,
        sni_domain: str,
        classification: str,
        timestamp: Optional[datetime] = None,
        device_mac: Optional[str] = None,
        destination_ip: Optional[str] = None,
        list_source: Optional[str] = None,
    ) -> int:
        """Inserts a connection record."""
        ts = (timestamp or datetime.now(timezone.utc)).isoformat()
        if device_mac:
            device_mac = device_mac.lower().strip()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                INSERT INTO connections (device_mac, timestamp, destination_ip, sni_domain, classification, list_source)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (device_mac, ts, destination_ip, sni_domain.lower(), classification, list_source),
            )
            await db.commit()
            return cursor.lastrowid

    async def record_score(
        self,
        device_mac: str,
        score: int,
        tracker_count: int,
        total_count: int,
        computed_at: Optional[datetime] = None,
    ):
        """Inserts a device score entry."""
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

    async def get_all_devices(self) -> List[Dict[str, Any]]:
        """Returns all registered devices with their latest score and stats."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT 
                    d.mac_address,
                    d.ip_address,
                    d.device_name,
                    d.vendor,
                    d.first_seen,
                    d.last_seen,
                    s.score as current_score,
                    s.tracker_count as current_tracker_count,
                    s.total_count as current_total_count,
                    s.computed_at as score_computed_at
                FROM devices d
                LEFT JOIN (
                    SELECT device_mac, score, tracker_count, total_count, computed_at
                    FROM device_scores
                    WHERE (device_mac, computed_at) IN (
                        SELECT device_mac, MAX(computed_at)
                        FROM device_scores
                        GROUP BY device_mac
                    )
                ) s ON d.mac_address = s.device_mac
                ORDER BY d.last_seen DESC
                """
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def get_device(self, mac_address: str) -> Optional[Dict[str, Any]]:
        """Returns details for a single device."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT * FROM devices WHERE mac_address = ?
                """,
                (mac_address.lower().strip(),),
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_recent_connections(
        self,
        limit: int = 50,
        device_mac: Optional[str] = None,
        classification: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Returns recent connections with optional filters."""
        query = "SELECT c.*, d.device_name, d.vendor FROM connections c LEFT JOIN devices d ON c.device_mac = d.mac_address WHERE 1=1"
        params = []

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
            cursor = await db.execute(query, tuple(params))
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def get_device_connections_since(
        self,
        device_mac: str,
        since_iso: str,
    ) -> List[Dict[str, Any]]:
        """Returns connections for a device since a given ISO timestamp."""
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

    async def get_score_history(
        self,
        device_mac: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Returns score history for a device."""
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
