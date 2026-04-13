"""
SentinelIQ — Async CRUD Operations
=====================================

Async helper functions for reading/writing to the three core tables.
All functions accept `AsyncSession | None` — if None (no-DB mode) they
return None immediately, allowing callers to remain DB-agnostic.

Functions:
  upsert_unit_metadata()  — ensure engine unit exists in registry
  log_prediction()        — insert row into prediction_logs
  log_anomaly_event()     — insert row into anomaly_events
  get_recent_predictions()— query last N predictions for a unit

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ml_server.db.models import AnomalyEvent, PredictionLog, UnitMetadata

logger = logging.getLogger(__name__)


# ── Unit Metadata ─────────────────────────────────────────────────────────────

async def upsert_unit_metadata(
    db: Optional[AsyncSession],
    *,
    unit_id: int,
    dataset: str = "FD001",
    description: Optional[str] = None,
) -> Optional[UnitMetadata]:
    """
    Ensure a unit exists in unit_metadata.

    Uses INSERT … ON CONFLICT (unit_id) DO NOTHING so repeated calls
    are idempotent and never raise duplicate-key errors.

    Returns:
        The UnitMetadata row, or None in no-DB mode.
    """
    if db is None:
        return None

    stmt = (
        pg_insert(UnitMetadata)
        .values(
            unit_id=unit_id,
            dataset=dataset,
            description=description,
        )
        .on_conflict_do_nothing(index_elements=["unit_id"])
        .returning(UnitMetadata)
    )

    try:
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row is None:
            # Row already existed — fetch it
            result2 = await db.execute(
                select(UnitMetadata).where(UnitMetadata.unit_id == unit_id)
            )
            row = result2.scalars().first()
        logger.debug("upsert_unit_metadata: unit_id=%d ok", unit_id)
        return row
    except Exception as exc:
        logger.error("upsert_unit_metadata failed: %s", exc)
        raise


# ── Prediction Log ────────────────────────────────────────────────────────────

async def log_prediction(
    db: Optional[AsyncSession],
    *,
    unit_id: int,
    dataset: str = "FD001",
    predicted_rul: float,
    severity: str,
    model_used: str = "TCN",
    inference_time_ms: Optional[float] = None,
    sequence_length: Optional[int] = None,
) -> Optional[PredictionLog]:
    """
    Insert a row into prediction_logs.

    Auto-upserts unit_metadata first so the FK constraint is satisfied.

    Returns:
        The new PredictionLog row, or None in no-DB mode / on error.
    """
    if db is None:
        return None

    try:
        # Ensure unit exists (FK)
        await upsert_unit_metadata(db, unit_id=unit_id, dataset=dataset)

        log = PredictionLog(
            unit_id=unit_id,
            dataset=dataset,
            predicted_rul=predicted_rul,
            severity=severity,
            model_used=model_used,
            inference_time_ms=inference_time_ms,
            sequence_length=sequence_length,
            created_at=datetime.now(tz=timezone.utc),
        )
        db.add(log)
        # Flush so the PK is populated (caller may use log.id)
        await db.flush()
        logger.debug(
            "log_prediction: unit=%d rul=%.2f [%s] id=%s",
            unit_id, predicted_rul, severity, log.id,
        )
        return log
    except Exception as exc:
        logger.error("log_prediction failed: %s", exc)
        raise


# ── Anomaly Event ─────────────────────────────────────────────────────────────

async def log_anomaly_event(
    db: Optional[AsyncSession],
    *,
    unit_id: Optional[int] = None,
    anomaly_score: float,
    isolation_forest_score: Optional[float] = None,
    reconstruction_error: Optional[float] = None,
    severity: str,
    recommendation: Optional[str] = None,
) -> Optional[AnomalyEvent]:
    """
    Insert a row into anomaly_events.

    unit_id is optional — anomaly calls don't always know the engine ID.

    Returns:
        The new AnomalyEvent row, or None in no-DB mode / on error.
    """
    if db is None:
        return None

    try:
        event = AnomalyEvent(
            unit_id=unit_id,
            anomaly_score=anomaly_score,
            isolation_forest_score=isolation_forest_score,
            reconstruction_error=reconstruction_error,
            severity=severity,
            recommendation=recommendation,
            created_at=datetime.now(tz=timezone.utc),
        )
        db.add(event)
        await db.flush()
        logger.debug(
            "log_anomaly_event: unit=%s score=%.3f [%s] id=%s",
            unit_id, anomaly_score, severity, event.id,
        )
        return event
    except Exception as exc:
        logger.error("log_anomaly_event failed: %s", exc)
        raise


# ── Query helpers ─────────────────────────────────────────────────────────────

async def get_recent_predictions(
    db: Optional[AsyncSession],
    unit_id: int,
    limit: int = 20,
) -> list[PredictionLog]:
    """
    Return the last `limit` prediction logs for a given unit, newest first.

    Returns an empty list in no-DB mode.
    """
    if db is None:
        return []

    result = await db.execute(
        select(PredictionLog)
        .where(PredictionLog.unit_id == unit_id)
        .order_by(PredictionLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
