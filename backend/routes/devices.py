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
    """Returns all registered devices on the network."""
    devices = await db.get_all_devices()
    return {"devices": devices, "count": len(devices)}


@router.get("/{mac}")
async def get_device(mac: str, db: Database = Depends(get_db)):
    """Returns details, score history, and recent connections for a specific device."""
    device = await db.get_device(mac)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    scores = await db.get_score_history(mac, limit=50)
    recent_conns = await db.get_recent_connections(limit=50, device_mac=mac)

    return {
        "device": device,
        "score_history": scores,
        "recent_connections": recent_conns,
    }
