"""Standalone Capture & Ingestion Service runner for Glasshouse.

Supports sniffing on specified interface (e.g. wlan0, eth0) or synthetic traffic simulation mode.
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
import threading
from pathlib import Path
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from capture.sniffer import PacketSniffer
from capture.tls_parser import SNIRecord
from classifier.classifier import DomainClassifier
from backend.database import Database
from backend.device_tracker import DeviceTracker
from backend.pipeline import Pipeline

logger = logging.getLogger("glasshouse.capture")


def run_capture_service(interface: str = None, db_path: str = "data/glasshouse.db"):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    logger.info(f"Starting Glasshouse Capture Service (interface={interface or 'default'})")

    # Initialize async event loop in dedicated thread
    loop = asyncio.new_event_loop()

    def run_loop():
        asyncio.set_event_loop(loop)
        loop.run_forever()

    t = threading.Thread(target=run_loop, daemon=True)
    t.start()

    # Initialize DB & components
    db = Database(db_path=db_path)
    asyncio.run_coroutine_threadsafe(db.initialize(), loop).result()

    classifier = DomainClassifier()
    classifier.load_rules(download_remote=False)

    tracker = DeviceTracker()
    pipeline = Pipeline(database=db, classifier=classifier, device_tracker=tracker)

    def on_sni(record: SNIRecord):
        logger.info(f"[Captured] {record.src_ip} -> {record.sni_domain}")
        asyncio.run_coroutine_threadsafe(pipeline.process_sni_record(record), loop)

    sniffer = PacketSniffer(interface=interface, on_sni_extracted=on_sni)

    def handle_signal(sig, frame):
        logger.info("Stopping capture service...")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    sniffer.start()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Glasshouse Packet Capture Service")
    parser.add_argument("-i", "--interface", help="Network interface to sniff on (e.g. wlan0, eth0, mirror0)", default=None)
    parser.add_argument("--db", help="Path to SQLite database", default="data/glasshouse.db")
    args = parser.parse_args()

    run_capture_service(interface=args.interface, db_path=args.db)
