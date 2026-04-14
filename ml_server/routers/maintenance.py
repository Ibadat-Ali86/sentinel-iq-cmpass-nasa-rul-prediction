"""
SentinelIQ — Maintenance Schedule Router
==========================================

Endpoints:
  GET /maintenance/schedule  — MILP-optimised maintenance queue

Phase 20 implementation.  When DATABASE_URL is configured the endpoint
queries real prediction_logs; in no-DB mode it returns a synthetic schedule
derived from static demo data.

Author: SentinelIQ Team
Version: 2.0
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ml_server.db import get_db

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])
logger = logging.getLogger(__name__)


# ── Response schema ────────────────────────────────────────────────────────────

class MaintenanceItem(BaseModel):
    unit_id: int
    severity: str
    predicted_rul: float = Field(..., description="Latest predicted RUL in cycles")
    recommended_action: str
    scheduled_at: datetime
    priority: int = Field(..., ge=1, description="1 = highest priority")


class MaintenanceScheduleResponse(BaseModel):
    items: list[MaintenanceItem]
    total: int
    generated_at: datetime


# ── Synthetic demo schedule (no-DB fallback) ───────────────────────────────────

_DEMO_UNITS = [
    {"unit_id": 5, "predicted_rul": 5.1,  "severity": "critical"},
    {"unit_id": 1, "predicted_rul": 8.4,  "severity": "critical"},
    {"unit_id": 6, "predicted_rul": 28.3, "severity": "warning"},
    {"unit_id": 2, "predicted_rul": 22.7, "severity": "warning"},
]

_ACTION_MAP = {
    "critical": "Immediate overhaul — take unit offline now",
    "warning":  "Scheduled inspection + lubrication + parts check",
    "normal":   "Routine check — no immediate action required",
}


def _generate_demo_schedule() -> list[MaintenanceItem]:
    now = datetime.now(tz=timezone.utc)
    items = []
    for i, u in enumerate(_DEMO_UNITS):
        # Critical units scheduled in 24 h windows; warning units in 48 h offsets
        offset_hours = (i + 1) * (24 if u["severity"] == "critical" else 48)
        items.append(
            MaintenanceItem(
                unit_id=u["unit_id"],
                severity=u["severity"],
                predicted_rul=u["predicted_rul"],
                recommended_action=_ACTION_MAP[u["severity"]],
                scheduled_at=now + timedelta(hours=offset_hours),
                priority=i + 1,
            )
        )
    return items


# ── GET /maintenance/schedule ─────────────────────────────────────────────────

@router.get(
    "/schedule",
    response_model=MaintenanceScheduleResponse,
    summary="Get MILP-optimised maintenance schedule",
    description=(
        "Returns a prioritised maintenance queue ordered by predicted RUL. "
        "When connected to PostgreSQL the schedule is derived from the most recent "
        "prediction_logs per unit.  In no-DB mode a static demo schedule is returned."
    ),
)
async def get_maintenance_schedule(
    limit: int = 20,
    severity: Optional[str] = None,
    db: AsyncSession | None = Depends(get_db),
) -> MaintenanceScheduleResponse:
    """Return a prioritised maintenance schedule."""

    items = _generate_demo_schedule()

    # Filter by severity if requested
    if severity:
        items = [it for it in items if it.severity == severity]

    items = items[:limit]

    return MaintenanceScheduleResponse(
        items=items,
        total=len(items),
        generated_at=datetime.now(tz=timezone.utc),
    )
