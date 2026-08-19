"""Domain Blocking & Enrichment API Endpoints."""

import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.database import Database
from backend.hosts_blocker import HostsBlocker

router = APIRouter(prefix="/api/blocking", tags=["blocking"])


class BlockRequest(BaseModel):
    domain: str
    category: str = "tracker"
    reason: Optional[str] = ""


class UnblockRequest(BaseModel):
    domain: str


class ModeToggleRequest(BaseModel):
    test_mode: bool


def get_db() -> Database:
    from backend.main import app_state
    return app_state.database


def get_blocker() -> HostsBlocker:
    from backend.main import app_state
    return app_state.hosts_blocker


@router.get("/status")
async def get_blocking_status(
    db: Database = Depends(get_db),
    blocker: HostsBlocker = Depends(get_blocker),
) -> Dict[str, Any]:
    """Returns the current domain blocking engine status."""
    setting = await db.get_setting("test_mode", default="true")
    test_mode = setting.lower() in ("true", "1", "yes")
    can_write = blocker.can_write_hosts()
    blocked_list = await db.get_blocked_domains()

    return {
        "test_mode": test_mode,
        "hosts_path": str(blocker.hosts_path),
        "can_write_hosts": can_write,
        "active_blocks_count": len(blocked_list),
    }


@router.post("/mode")
async def toggle_blocking_mode(
    req: ModeToggleRequest,
    db: Database = Depends(get_db),
) -> Dict[str, Any]:
    """Toggles Test Mode (simulated) vs Live Block Mode (hosts file)."""
    await db.set_setting("test_mode", "true" if req.test_mode else "false")
    return {
        "status": "success",
        "test_mode": req.test_mode,
        "message": "Switched to Test Mode (Simulated Blocking)" if req.test_mode else "Switched to Live Block Mode (System Hosts File)",
    }


@router.get("/domains")
async def list_blocked_domains(db: Database = Depends(get_db)) -> Dict[str, Any]:
    """Lists all blocked domains."""
    domains = await db.get_blocked_domains()
    return {"count": len(domains), "domains": domains}


@router.post("/block")
async def block_domain(
    req: BlockRequest,
    db: Database = Depends(get_db),
    blocker: HostsBlocker = Depends(get_blocker),
) -> Dict[str, Any]:
    """Blocks a domain in Test Mode or Live Block Mode."""
    from backend.main import app_state

    dom = req.domain.lower().strip().rstrip(".")
    if not dom:
        raise HTTPException(status_code=400, detail="Domain name is required.")

    # 1. Check Protected Domains safety guardrail
    if blocker.is_protected_domain(dom):
        raise HTTPException(
            status_code=400,
            detail="This domain is critical infrastructure and can't be blocked to avoid breaking your system/apps.",
        )

    # 2. Check current mode
    setting = await db.get_setting("test_mode", default="true")
    test_mode = setting.lower() in ("true", "1", "yes")
    mode_str = "test" if test_mode else "live"

    hosts_status = "Simulated in Test Mode"
    if not test_mode:
        success, msg = blocker.block_domain_in_hosts(dom)
        if not success:
            raise HTTPException(status_code=500, detail=msg)
        hosts_status = msg

    # Record in database
    await db.add_blocked_domain(
        domain=dom,
        category=req.category,
        reason=req.reason or "Blocked by user in Glasshouse",
        mode=mode_str,
    )

    # Also add custom block rule to classifier trie
    if app_state.classifier:
        app_state.classifier.add_custom_blocklist(dom, category=req.category)

    return {
        "status": "success",
        "domain": dom,
        "mode": mode_str,
        "message": hosts_status,
    }


@router.post("/unblock")
async def unblock_domain(
    req: UnblockRequest,
    db: Database = Depends(get_db),
    blocker: HostsBlocker = Depends(get_blocker),
) -> Dict[str, Any]:
    """Unblocks a domain and removes it from the hosts file."""
    from backend.main import app_state

    dom = req.domain.lower().strip().rstrip(".")
    if not dom:
        raise HTTPException(status_code=400, detail="Domain name is required.")

    # Remove from hosts file if present
    success, msg = blocker.unblock_domain_in_hosts(dom)

    # Remove from DB
    await db.remove_blocked_domain(dom)

    # Remove from classifier custom blocklist
    if app_state.classifier:
        app_state.classifier.remove_custom_blocklist(dom)

    return {
        "status": "success",
        "domain": dom,
        "message": msg,
    }


# --- Domain Enrichment Endpoint ---

@router.get("/enrichment/{domain}")
async def get_domain_enrichment(
    domain: str,
    db: Database = Depends(get_db),
) -> Dict[str, Any]:
    """Returns deep Layer 3 enrichment signals (WHOIS age, TLS cert, hosting provider, threat intel)."""
    from backend.main import app_state

    dom = domain.lower().strip().rstrip(".")
    if not dom:
        raise HTTPException(status_code=400, detail="Invalid domain")

    # 1. Check DB Cache
    cached = await db.get_domain_enrichment(dom)
    if cached:
        return cached

    # 2. Run enrichment in thread pool
    enrichment = await asyncio.to_thread(app_state.domain_enrichment.enrich_domain, dom)
    threat_report = await asyncio.to_thread(app_state.threat_intel.evaluate_domain, dom)

    threat_vendors = threat_report.vendor_count if threat_report else 0
    threat_source = threat_report.source if threat_report else ""
    threat_details = threat_report.details if threat_report else ""

    # 3. Save to DB Cache
    await db.upsert_domain_enrichment(
        domain=dom,
        ip_address=enrichment.ip_address,
        created_year=enrichment.created_year,
        age_days=enrichment.age_days,
        cert_org=enrichment.cert_org,
        hosting_provider=enrichment.hosting_provider,
        summary_label=enrichment.summary_label,
        threat_vendors=threat_vendors,
        threat_source=threat_source,
        threat_details=threat_details,
    )

    return {
        "domain": dom,
        "ip_address": enrichment.ip_address,
        "created_year": enrichment.created_year,
        "age_days": enrichment.age_days,
        "cert_org": enrichment.cert_org,
        "hosting_provider": enrichment.hosting_provider,
        "summary_label": enrichment.summary_label,
        "is_newly_registered": enrichment.is_newly_registered,
        "threat_vendors": threat_vendors,
        "threat_source": threat_source,
        "threat_details": threat_details,
    }
