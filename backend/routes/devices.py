"""Device REST endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from backend.database import Database

router = APIRouter(prefix="/api/devices", tags=["devices"])


def get_db() -> Database:
    from backend.main import app_state
    return app_state.database


@router.get("")
async def list_devices(db: Database = Depends(get_db)):
    """Returns the monitored host device with real-time live privacy scores and exact handshake counts."""
    devices = await db.get_all_devices()
    latest_scores = await db.get_latest_scores()
    
    result = []
    for dev in devices:
        mac = dev.get("mac_address", "").lower().strip()
        live_stats = await db.get_device_live_stats(mac)
        
        score = live_stats["score"]
        tracker_count = live_stats["tracker_count"]
        total_count = live_stats["total_count"]

        if mac in latest_scores and latest_scores[mac].get("total_count", 0) >= total_count:
            score = latest_scores[mac]["score"]
            tracker_count = latest_scores[mac]["tracker_count"]
            total_count = latest_scores[mac]["total_count"]

        dev["current_score"] = score
        dev["current_tracker_count"] = tracker_count
        dev["current_total_count"] = total_count
        result.append(dev)

    return {"devices": result, "count": len(result)}


@router.get("/{mac}")
async def get_device(mac: str, db: Database = Depends(get_db)):
    """Returns details, score history, and recent connections for a specific device."""
    device = await db.get_device(mac)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    live_stats = await db.get_device_live_stats(mac)
    scores = await db.get_score_history(mac, limit=50)
    recent_conns = await db.get_recent_connections(limit=50, device_mac=mac)

    device["current_score"] = live_stats["score"]
    device["current_tracker_count"] = live_stats["tracker_count"]
    device["current_total_count"] = live_stats["total_count"]

    return {
        "device": device,
        "score_history": scores,
        "recent_connections": recent_conns,
    }


@router.patch("/{mac}")
async def update_device_name(mac: str, payload: dict, db: Database = Depends(get_db)):
    """Updates device custom display name."""
    new_name = payload.get("device_name")
    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="Device name cannot be empty")
    
    ok = await db.update_device_name(mac, new_name.strip())
    if not ok:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "ok", "device_name": new_name.strip()}


@router.delete("/{mac}")
async def delete_device_record(mac: str, db: Database = Depends(get_db)):
    """Deletes a device and related connection records."""
    ok = await db.delete_device(mac)
    if not ok:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"status": "ok", "deleted_mac": mac}
