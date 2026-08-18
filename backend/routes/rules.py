"""Custom domain classification rules management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List
from backend.database import Database

router = APIRouter(prefix="/api/custom-rules", tags=["rules"])


class CustomRulePayload(BaseModel):
    domain: str = Field(..., examples=["my-device-telemetry.local"])
    action: str = Field(..., pattern="^(allow|block)$", examples=["block"])
    category: str = Field("tracker", pattern="^(tracker|ad_network|first_party|unknown)$")


def get_db() -> Database:
    from backend.main import app_state
    return app_state.database


@router.get("")
async def get_rules(db: Database = Depends(get_db)):
    """Returns all custom user rules."""
    rules = await db.get_custom_rules()
    return {"rules": rules, "count": len(rules)}


@router.post("")
async def add_rule(payload: CustomRulePayload, db: Database = Depends(get_db)):
    """Adds or updates a custom classification rule."""
    from backend.main import app_state

    domain = payload.domain.lower().strip()
    await db.add_custom_rule(
        domain=domain,
        action=payload.action,
        category=payload.category,
    )

    # Sync into in-memory classifier
    if payload.action == "allow":
        app_state.classifier.add_custom_allowlist(domain)
        app_state.classifier.remove_custom_blocklist(domain)
    else:
        app_state.classifier.add_custom_blocklist(domain, category=payload.category)
        app_state.classifier.remove_custom_allowlist(domain)

    return {"status": "success", "domain": domain, "action": payload.action, "category": payload.category}


@router.delete("/{domain}")
async def delete_rule(domain: str, db: Database = Depends(get_db)):
    """Deletes a custom user rule."""
    from backend.main import app_state

    clean_domain = domain.lower().strip()
    await db.delete_custom_rule(clean_domain)
    app_state.classifier.remove_custom_allowlist(clean_domain)
    app_state.classifier.remove_custom_blocklist(clean_domain)

    return {"status": "deleted", "domain": clean_domain}
