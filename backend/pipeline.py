"""Integrated packet capture, classification, and persistence pipeline."""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Callable, List, Optional
from capture.tls_parser import SNIRecord
from classifier.classifier import DomainClassifier, DomainClassification
from backend.database import Database
from backend.device_tracker import DeviceTracker

logger = logging.getLogger(__name__)


class Pipeline:
    """Coordinates capture -> classification -> database storage -> live event broadcast."""

    def __init__(
        self,
        database: Database,
        classifier: DomainClassifier,
        device_tracker: Optional[DeviceTracker] = None,
        on_event: Optional[Callable[[dict], None]] = None,
    ):
        self.database = database
        self.classifier = classifier
        self.device_tracker = device_tracker or DeviceTracker()
        self.on_event = on_event
        self.event_subscribers: List[Callable[[dict], None]] = []

    def subscribe(self, callback: Callable[[dict], None]):
        """Registers a live event subscriber."""
        if callback not in self.event_subscribers:
            self.event_subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[dict], None]):
        if callback in self.event_subscribers:
            self.event_subscribers.remove(callback)

    async def process_sni_record(self, record: SNIRecord) -> dict:
        """Classifies and stores an SNI record, then broadcasts event."""
        # 1. Classify domain
        classification = self.classifier.classify(record.sni_domain)

        # 2. Resolve MAC and Vendor if not already in packet
        src_mac = record.src_mac
        if not src_mac:
            src_mac = self.device_tracker.resolve_mac_for_ip(record.src_ip)
        
        device_mac = src_mac or f"ip:{record.src_ip}"

        # Record domain for device type pattern matching
        self.device_tracker.record_domain(device_mac, record.sni_domain)

        # Resolve vendor (always re-resolve to backfill previously-unknown devices)
        vendor = self.device_tracker.lookup_vendor(device_mac) if src_mac else None
        device_name = self.device_tracker.suggest_device_name(device_mac, vendor=vendor, ip=record.src_ip)

        await self.database.upsert_device(
            mac_address=device_mac,
            ip_address=record.src_ip,
            device_name=device_name,
            vendor=vendor,
            timestamp=record.timestamp,
        )

        # 3. Store connection record
        conn_id = await self.database.record_connection(
            sni_domain=record.sni_domain,
            classification=classification.category,
            timestamp=record.timestamp,
            device_mac=device_mac,
            destination_ip=record.dst_ip,
            list_source=classification.source,
        )

        # 4. Construct live event object
        event = {
            "id": conn_id,
            "device_mac": device_mac,
            "src_ip": record.src_ip,
            "dst_ip": record.dst_ip,
            "sni_domain": record.sni_domain,
            "classification": classification.category,
            "is_blocked": classification.is_blocked,
            "source": classification.source,
            "timestamp": record.timestamp.isoformat(),
        }

        # 5. Broadcast to subscribers
        if self.on_event:
            self.on_event(event)

        for sub in list(self.event_subscribers):
            try:
                sub(event)
            except Exception as e:
                logger.warning(f"Error in event subscriber: {e}")

        return event
