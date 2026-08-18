"""Connection log REST endpoints."""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from backend.database import Database

router = APIRouter(prefix="/api/connections", tags=["connections"])


def get_db() -> Database:
    from backend.main import app_state
    return app_state.database


@router.get("")
async def list_connections(
    limit: int = Query(50, ge=1, le=500),
    device_mac: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
    db: Database = Depends(get_db),
):
    """Returns recent connection records with optional filtering."""
    conns = await db.get_recent_connections(
        limit=limit,
        device_mac=device_mac,
        classification=classification,
    )
    return {"connections": conns, "count": len(conns)}
