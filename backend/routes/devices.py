"""Device REST endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from backend.database import Database

router = APIRouter(prefix="/api/devices", tags=["devices"])


def get_db() -> Database:
    from backend.main import app_state
    return app_state.database


@router.get("")
async def list_devices(active_only: bool = Query(False), db: Database = Depends(get_db)):
    """Returns devices on the network with dynamic online presence and privacy scores."""
    from backend.main import app_state
    tracker = getattr(app_state, "device_tracker", None)
    active_macs = tracker.get_active_macs() if tracker else set()

    devices = await db.get_all_devices()
    latest_scores = await db.get_latest_scores()
    
    result = []
    for dev in devices:
        mac = dev.get("mac_address", "").lower()
        is_online = mac in active_macs
        dev["is_online"] = is_online

        if mac in latest_scores:
            dev["current_score"] = latest_scores[mac]["score"]
            dev["current_tracker_count"] = latest_scores[mac]["tracker_count"]
            dev["current_total_count"] = latest_scores[mac]["total_count"]
        else:
            dev["current_score"] = 100
            dev["current_tracker_count"] = 0
            dev["current_total_count"] = 0

        if not active_only or is_online:
            result.append(dev)

    return {"devices": result, "count": len(result)}


@router.get("/{mac}")
async def get_device(mac: str, db: Database = Depends(get_db)):
    """Returns details, score history, and recent connections for a specific device."""
    device = await db.get_device(mac)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    scores = await db.get_score_history(mac, limit=50)
    recent_conns = await db.get_recent_connections(limit=50, device_mac=mac)
    latest_score = scores[0] if scores else None
    device["current_score"] = latest_score["score"] if latest_score else 100
    device["current_tracker_count"] = latest_score["tracker_count"] if latest_score else 0
    device["current_total_count"] = latest_score["total_count"] if latest_score else 0

    return {
        "device": device,
        "score_history": scores,
        "recent_connections": recent_conns,
    }


@router.patch("/{mac}")
async def update_device_name(mac: str, payload: dict, db: Database = Depends(get_db)):
    """Allows user to customize/rename a device."""
    new_name = payload.get("device_name", "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Device name cannot be empty")
    await db.update_device_name(mac, new_name)
    return {"status": "ok", "mac": mac, "device_name": new_name}


@router.delete("/{mac}")
async def delete_device(mac: str, db: Database = Depends(get_db)):
    """Removes an obsolete or disconnected device from the system."""
    await db.delete_device(mac)
    return {"status": "ok", "deleted": mac}


@router.post("/scan")
async def scan_network_devices(db: Database = Depends(get_db)):
    """Actively sweeps local Wi-Fi subnet to discover all connected devices (phones, TVs, laptops, router)."""
    from backend.main import app_state
    tracker = app_state.device_tracker
    if not tracker:
        raise HTTPException(status_code=500, detail="Device tracker not initialized")

    mapping = tracker.scan_local_subnet()
    discovered = []

    for ip, mac in mapping.items():
        vendor = tracker.lookup_vendor(mac)
        name = tracker.suggest_device_name(mac, vendor=vendor, ip=ip)
        await db.upsert_device(
            mac_address=mac,
            ip_address=ip,
            device_name=name,
            vendor=vendor,
        )
        discovered.append({"ip": ip, "mac": mac, "name": name, "vendor": vendor})

    # Ensure local PC is also registered
    if tracker.local_ip:
        local_mac = tracker.local_mac or tracker.ip_to_mac_cache.get(tracker.local_ip) or f"ip:{tracker.local_ip}"
        local_vendor = tracker.lookup_vendor(local_mac) if not local_mac.startswith("ip:") else None
        local_name = tracker.suggest_device_name(local_mac, vendor=local_vendor, ip=tracker.local_ip)
        await db.upsert_device(
            mac_address=local_mac,
            ip_address=tracker.local_ip,
            device_name=local_name,
            vendor=local_vendor,
        )

    # Clean up any obsolete pseudo-MACs for which a physical MAC exists
    await db.purge_pseudo_devices()

    all_devices = await db.get_all_devices()
    return {"status": "ok", "discovered": discovered, "devices": all_devices}


