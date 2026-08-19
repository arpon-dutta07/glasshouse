"""Network-wide statistics and telemetry aggregation endpoints."""

from fastapi import APIRouter, Depends
from typing import Dict, Any
from backend.database import Database
import aiosqlite

router = APIRouter(prefix="/api/stats", tags=["stats"])


def get_db() -> Database:
    from backend.main import app_state
    return app_state.database


@router.get("")
async def get_network_stats(db: Database = Depends(get_db)) -> Dict[str, Any]:
    """Aggregates high-level network privacy metrics."""
    async with aiosqlite.connect(db.db_path) as conn:
        conn.row_factory = aiosqlite.Row

        # Total devices
        cur = await conn.execute("SELECT COUNT(*) as count FROM devices")
        row = await cur.fetchone()
        total_devices = row["count"] if row else 0

        # Average network privacy score
        cur = await conn.execute(
            """
            SELECT AVG(score) as avg_score 
            FROM (
                SELECT score FROM device_scores
                WHERE (device_mac, computed_at) IN (
                    SELECT device_mac, MAX(computed_at) FROM device_scores GROUP BY device_mac
                )
            )
            """
        )
        row = await cur.fetchone()
        avg_score = round(row["avg_score"], 1) if row and row["avg_score"] is not None else 100.0

        # Classification counts
        cur = await conn.execute(
            """
            SELECT classification, COUNT(*) as count 
            FROM connections 
            GROUP BY classification
            """
        )
        rows = await cur.fetchall()
        class_counts = {r["classification"]: r["count"] for r in rows}
        total_connections = sum(class_counts.values())

        # Tracker percentage
        trackers_and_ads = class_counts.get("tracker", 0) + class_counts.get("ad_network", 0)
        tracker_percentage = round((trackers_and_ads / total_connections * 100.0), 1) if total_connections > 0 else 0.0

        # Top tracker domains
        cur = await conn.execute(
            """
            SELECT sni_domain as domain, sni_domain, classification as category, classification, COUNT(*) as hits
            FROM connections
            WHERE classification IN ('tracker', 'ad_network')
            GROUP BY sni_domain
            ORDER BY hits DESC
            LIMIT 10
            """
        )
        rows = await cur.fetchall()
        top_trackers = [dict(r) for r in rows]

        return {
            "total_devices": total_devices,
            "network_average_score": avg_score,
            "total_connections": total_connections,
            "tracker_percentage": tracker_percentage,
            "classification_breakdown": class_counts,
            "top_trackers": top_trackers,
        }
