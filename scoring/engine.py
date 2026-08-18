"""Privacy scoring engine for Glasshouse.

Computes privacy scores for devices based on rolling connection history.
Formula:
    tracker_ratio = tracker_connections / total_connections
    unique_tracker_count = count(distinct tracker/ad_network domains)
    score = max(0, round(100 - (tracker_ratio * 60) - min(unique_tracker_count * 2, 40)))
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import asyncio
import logging
from backend.database import Database

logger = logging.getLogger(__name__)


@dataclass
class ScoreResult:
    device_mac: str
    score: int
    tracker_count: int
    ad_network_count: int
    total_count: int
    unique_tracker_count: int
    tracker_ratio: float
    grade: str  # 'A' | 'B' | 'C' | 'D' | 'F'
    status_label: str  # 'Excellent' | 'Fair' | 'Concerning' | 'Critical'
    computed_at: datetime


def calculate_privacy_score(
    connections: List[Dict],
    device_mac: str = "",
    computed_at: Optional[datetime] = None,
) -> ScoreResult:
    """Calculates privacy score from a list of connection dictionaries."""
    now = computed_at or datetime.now(timezone.utc)
    total_count = len(connections)

    if total_count == 0:
        return ScoreResult(
            device_mac=device_mac,
            score=100,
            tracker_count=0,
            ad_network_count=0,
            total_count=0,
            unique_tracker_count=0,
            tracker_ratio=0.0,
            grade="A",
            status_label="Excellent",
            computed_at=now,
        )

    tracker_conns = [c for c in connections if c.get("classification") == "tracker"]
    ad_conns = [c for c in connections if c.get("classification") == "ad_network"]
    all_tracking_conns = tracker_conns + ad_conns

    tracker_count = len(tracker_conns)
    ad_network_count = len(ad_conns)
    tracking_total = len(all_tracking_conns)

    unique_trackers = {c.get("sni_domain", "").lower() for c in all_tracking_conns if c.get("sni_domain")}
    unique_tracker_count = len(unique_trackers)

    tracker_ratio = tracking_total / total_count

    # Formula from design.md:
    # score = max(0, 100 - (tracker_ratio * 60) - min(unique_tracker_count * 2, 40))
    deduction_ratio = tracker_ratio * 60.0
    deduction_unique = min(unique_tracker_count * 2.0, 40.0)
    raw_score = 100.0 - deduction_ratio - deduction_unique
    final_score = int(max(0, min(100, round(raw_score))))

    # Grades & labels
    if final_score >= 90:
        grade = "A"
        status_label = "Excellent"
    elif final_score >= 75:
        grade = "B"
        status_label = "Good"
    elif final_score >= 60:
        grade = "C"
        status_label = "Fair"
    elif final_score >= 40:
        grade = "D"
        status_label = "Concerning"
    else:
        grade = "F"
        status_label = "Critical"

    return ScoreResult(
        device_mac=device_mac,
        score=final_score,
        tracker_count=tracker_count,
        ad_network_count=ad_network_count,
        total_count=total_count,
        unique_tracker_count=unique_tracker_count,
        tracker_ratio=tracker_ratio,
        grade=grade,
        status_label=status_label,
        computed_at=now,
    )


class ScoringService:
    """Periodically computes and updates privacy scores for all network devices."""

    def __init__(self, database: Database, interval_seconds: int = 60, window_hours: int = 24):
        self.database = database
        self.interval_seconds = interval_seconds
        self.window_hours = window_hours
        self._is_running = False
        self._task: Optional[asyncio.Task] = None

    async def compute_all_scores(self) -> Dict[str, ScoreResult]:
        """Calculates scores for all devices based on the rolling time window."""
        devices = await self.database.get_all_devices()
        since_time = datetime.now(timezone.utc) - timedelta(hours=self.window_hours)
        since_iso = since_time.isoformat()
        results = {}

        for dev in devices:
            mac = dev["mac_address"]
            conns = await self.database.get_device_connections_since(mac, since_iso)
            score_res = calculate_privacy_score(conns, device_mac=mac)
            await self.database.record_score(
                device_mac=mac,
                score=score_res.score,
                tracker_count=score_res.tracker_count + score_res.ad_network_count,
                total_count=score_res.total_count,
                computed_at=score_res.computed_at,
            )
            results[mac] = score_res

        return results

    async def _loop(self):
        while self._is_running:
            try:
                await self.compute_all_scores()
            except Exception as e:
                logger.error(f"Error computing privacy scores: {e}")
            await asyncio.sleep(self.interval_seconds)

    def start(self):
        if not self._is_running:
            self._is_running = True
            self._task = asyncio.create_task(self._loop())

    def stop(self):
        self._is_running = False
        if self._task:
            self._task.cancel()
