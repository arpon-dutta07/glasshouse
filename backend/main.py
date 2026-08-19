"""Glasshouse Backend API Application."""

import asyncio
from contextlib import asynccontextmanager
import logging
import threading
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import Database
from backend.device_tracker import DeviceTracker
from backend.pipeline import Pipeline
from backend.hosts_blocker import HostsBlocker
from classifier.classifier import DomainClassifier
from classifier.threat_intel import ThreatIntelService
from classifier.enrichment import DomainEnrichmentService
from scoring.engine import ScoringService
from capture.sniffer import PacketSniffer
from capture.tls_parser import SNIRecord
from capture.interface import detect_active_interface
from backend.routes.devices import router as devices_router
from backend.routes.connections import router as connections_router
from backend.routes.stats import router as stats_router
from backend.routes.rules import router as rules_router
from backend.routes.blocking import router as blocking_router
from backend.routes.ws import router as ws_router, manager as ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("glasshouse")


class AppState:
    def __init__(self):
        self.database: Optional[Database] = None
        self.classifier: Optional[DomainClassifier] = None
        self.device_tracker: Optional[DeviceTracker] = None
        self.pipeline: Optional[Pipeline] = None
        self.scoring_service: Optional[ScoringService] = None
        self.sniffer: Optional[PacketSniffer] = None
        self.capture_thread: Optional[threading.Thread] = None
        self.hosts_blocker: Optional[HostsBlocker] = None
        self.threat_intel: Optional[ThreatIntelService] = None
        self.domain_enrichment: Optional[DomainEnrichmentService] = None
        self.db_path: str = "data/glasshouse.db"


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initializes DB, rules, scoring, and background tasks."""
    logger.info("Initializing Glasshouse backend...")

    # 1. Initialize Database
    app_state.database = Database(db_path=app_state.db_path)
    await app_state.database.initialize()

    # 2. Initialize Threat Intel and Domain Enrichment Services
    app_state.threat_intel = ThreatIntelService()
    app_state.domain_enrichment = DomainEnrichmentService()

    # 3. Initialize Multi-Layer Domain Classifier
    app_state.classifier = DomainClassifier(
        threat_intel=app_state.threat_intel,
        enrichment=app_state.domain_enrichment,
    )
    app_state.classifier.load_rules(download_remote=False)

    # 4. Load stored custom rules into classifier
    stored_rules = await app_state.database.get_custom_rules()
    for rule in stored_rules:
        if rule["action"] == "allow":
            app_state.classifier.add_custom_allowlist(rule["domain"])
        else:
            app_state.classifier.add_custom_blocklist(rule["domain"], category=rule["category"])

    # 5. Initialize Hosts Blocker & load blocked domains into classifier
    app_state.hosts_blocker = HostsBlocker()
    blocked_domains = await app_state.database.get_blocked_domains()
    for b in blocked_domains:
        app_state.classifier.add_custom_blocklist(b["domain"], category=b.get("category", "tracker"))

    # 6. Initialize DeviceTracker and run vendor re-resolution migration on existing devices
    app_state.device_tracker = DeviceTracker()
    try:
        await app_state.database.re_resolve_all_device_vendors(app_state.device_tracker)
        logger.info("Device vendor records re-resolved successfully.")
    except Exception as e:
        logger.warning(f"Could not re-resolve existing device vendors: {e}")

    # 6b. Continuous runtime Wi-Fi device discovery & live presence monitor
    async def periodic_network_device_monitor():
        while True:
            try:
                mapping = await asyncio.to_thread(app_state.device_tracker.scan_local_subnet)
                now = datetime.now(timezone.utc)
                from backend.device_tracker import infer_vendor_from_name

                for ip, mac in mapping.items():
                    if not mac or mac == "00:00:00:00:00:00":
                        continue
                    vendor = app_state.device_tracker.lookup_vendor(mac)
                    name = app_state.device_tracker.suggest_device_name(mac, vendor=vendor, ip=ip)
                    if not vendor:
                        vendor = infer_vendor_from_name(name)
                    await app_state.database.upsert_device(
                        mac_address=mac,
                        ip_address=ip,
                        device_name=name,
                        vendor=vendor,
                        timestamp=now,
                    )

                if app_state.device_tracker.local_ip:
                    local_mac = app_state.device_tracker.local_mac or app_state.device_tracker.ip_to_mac_cache.get(app_state.device_tracker.local_ip) or f"ip:{app_state.device_tracker.local_ip}"
                    local_vendor = app_state.device_tracker.lookup_vendor(local_mac) if not local_mac.startswith("ip:") else None
                    local_name = app_state.device_tracker.suggest_device_name(local_mac, vendor=local_vendor, ip=app_state.device_tracker.local_ip)
                    await app_state.database.upsert_device(
                        mac_address=local_mac,
                        ip_address=app_state.device_tracker.local_ip,
                        device_name=local_name,
                        vendor=local_vendor,
                        timestamp=now,
                    )

                # Sync connection & disconnection session records
                active_macs = app_state.device_tracker.get_active_macs()
                await app_state.database.sync_device_sessions(active_macs, now)
                await app_state.database.purge_pseudo_devices()
            except Exception as e:
                logger.debug(f"Error during network monitor loop: {e}")

            await asyncio.sleep(10)

    asyncio.create_task(periodic_network_device_monitor())

    # 7. Initialize Pipeline with WebSocket broadcast hook
    def broadcast_to_ws(event: dict):
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(ws_manager.broadcast(event))

    app_state.pipeline = Pipeline(
        database=app_state.database,
        classifier=app_state.classifier,
        device_tracker=app_state.device_tracker,
        on_event=broadcast_to_ws,
    )

    # 8. Initialize and start Scoring Service
    app_state.scoring_service = ScoringService(
        database=app_state.database,
        interval_seconds=60,
        window_hours=24,
    )
    app_state.scoring_service.start()

    # 9. Start live packet capture in background thread
    capture_loop = asyncio.get_event_loop()

    def on_sni_captured(record: SNIRecord):
        """Callback from sniffer thread — logs and feeds into pipeline."""
        classification = app_state.classifier.classify(record.sni_domain)
        logger.info(
            f"[LIVE] {record.timestamp.strftime('%Y-%m-%dT%H:%M:%S%z')} "
            f"{record.src_ip} ({record.src_mac or 'unknown-mac'}) -> "
            f"{record.sni_domain} [{classification.category}]"
        )
        asyncio.run_coroutine_threadsafe(
            app_state.pipeline.process_sni_record(record), capture_loop
        )

    try:
        interface = detect_active_interface()
        app_state.sniffer = PacketSniffer(
            interface=interface,
            on_sni_extracted=on_sni_captured,
        )
        app_state.capture_thread = threading.Thread(
            target=app_state.sniffer.start,
            daemon=True,
            name="glasshouse-capture",
        )
        app_state.capture_thread.start()
        logger.info(f"Live packet capture started on interface: {interface or 'default'}")
    except Exception as e:
        logger.error(
            f"Failed to start packet capture: {e}. "
            f"Ensure Npcap is installed (Windows) and the process has admin/root privileges."
        )

    logger.info("Glasshouse backend startup complete (API + live capture).")
    yield

    # Teardown
    logger.info("Shutting down Glasshouse backend...")
    if app_state.sniffer:
        app_state.sniffer.is_running = False
        logger.info("Capture thread signaled to stop.")
    if app_state.scoring_service:
        app_state.scoring_service.stop()


app = FastAPI(
    title="Glasshouse Privacy Observability API",
    description="Network TLS ClientHello SNI Privacy Classification, Threat Intel, and Hosts-File Blocking Engine",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS middleware for Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(devices_router)
app.include_router(connections_router)
app.include_router(stats_router)
app.include_router(rules_router)
app.include_router(blocking_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "glasshouse", "version": "1.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
