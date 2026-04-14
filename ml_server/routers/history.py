"""
SentinelIQ — Prediction History Router
========================================

Endpoints:
  GET /history/{unit_id}  — Last N prediction_logs rows for a unit

Phase 20.  Returns real DB rows when DATABASE_URL is set or synthetic
degradation-curve data in no-DB mode.

Author: SentinelIQ Team
Version: 2.0
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ml_server.db import get_db, crud

router = APIRouter(prefix="/history", tags=["Prediction History"])
logger = logging.getLogger(__name__)


# ── Response schemas ───────────────────────────────────────────────────────────

class PredictionHistoryPoint(BaseModel):
    predicted_rul: float
    severity: str
    model_used: str
    inference_time_ms: float
    recorded_at: datetime


class PredictionHistoryResponse(BaseModel):
    unit_id: int
    points: list[PredictionHistoryPoint]
    count: int


# ── Synthetic history (no-DB fallback) ────────────────────────────────────────

_BASE_RUL = {1: 8.4, 2: 22.7, 3: 67.2, 4: 41.9, 5: 5.1, 6: 28.3}


def _generate_synthetic_history(unit_id: int, n: int) -> list[PredictionHistoryPoint]:
    base = _BASE_RUL.get(unit_id, 40.0)
    now = datetime.now(tz=timezone.utc)
    points = []
    for i in range(n, 0, -1):
        rul = max(0.0, base + i * 0.5 + random.uniform(-1.0, 1.0))
        if rul < 10:
            sev = "critical"
        elif rul < 30:
            sev = "warning"
        else:
            sev = "normal"
        points.append(
            PredictionHistoryPoint(
                predicted_rul=round(rul, 2),
                severity=sev,
                model_used="TCN",
                inference_time_ms=round(random.uniform(10.0, 16.0), 2),
                recorded_at=now - timedelta(minutes=i * 5),
            )
        )
    return points


# ── GET /history/{unit_id} ────────────────────────────────────────────────────

@router.get(
    "/{unit_id}",
    response_model=PredictionHistoryResponse,
    summary="Get RUL prediction history for an engine unit",
    description=(
        "Returns the last `limit` RUL predictions for the given unit. "
        "Queries PostgreSQL `prediction_logs` when DATABASE_URL is configured; "
        "otherwise returns synthetic time-series data for demo purposes."
    ),
)
async def get_unit_history(
    unit_id: int,
    limit: int = Query(default=30, ge=1, le=200, description="Max points to return"),
    db: AsyncSession | None = Depends(get_db),
) -> PredictionHistoryResponse:
    """Return last N prediction logs for a single engine unit."""

    # Try live DB first
    if db is not None:
        try:
            rows = await crud.get_recent_predictions(db, unit_id=unit_id, limit=limit)
            if rows:
                points = [
                    PredictionHistoryPoint(
                        predicted_rul=row.predicted_rul,
                        severity=row.severity,
                        model_used=row.model_used,
                        inference_time_ms=row.inference_time_ms,
                        recorded_at=row.created_at,
                    )
                    for row in rows
                ]
                return PredictionHistoryResponse(
                    unit_id=unit_id, points=points, count=len(points)
                )
        except Exception as exc:
            logger.warning("DB history query failed, using synthetic: %s", exc)

    # Fallback
    points = _generate_synthetic_history(unit_id, limit)
    return PredictionHistoryResponse(unit_id=unit_id, points=points, count=len(points))
