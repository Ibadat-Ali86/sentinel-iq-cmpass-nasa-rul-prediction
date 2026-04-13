"""
SentinelIQ — RUL Prediction Router
=====================================

Endpoints:
  POST /predict/rul    — Single-unit RUL prediction + DB persistence
  POST /predict/batch  — Multi-unit batch RUL prediction

Author: SentinelIQ Team
Version: 2.0
"""

import asyncio
import logging
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ml_server.db import get_db
from ml_server.db import crud
from ml_server.schemas.requests import BatchRULRequest, RULPredictionRequest
from ml_server.schemas.responses import BatchRULResponse, RULPredictionResponse

router = APIRouter(prefix="/predict", tags=["RUL Prediction"])
logger = logging.getLogger(__name__)


def _build_sequence_array(req: RULPredictionRequest, feature_cols: list) -> np.ndarray:
    """
    Extract sensor values from the request sequence into a numpy array.

    Each SensorObservation.sensor_values must have len == len(feature_cols).
    """
    raw = [obs.sensor_values for obs in req.sequence]
    try:
        arr = np.array(raw, dtype=np.float32)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Sequence data shape error: {exc}",
        )

    if arr.shape[1] != len(feature_cols):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Sensor value dimension mismatch. "
                f"Expected {len(feature_cols)} features, got {arr.shape[1]}. "
                f"Check GET /status for the active feature list."
            ),
        )
    return arr


# ── Helper: fire-and-forget DB persistence ────────────────────────────────────

async def _persist_prediction(
    db: AsyncSession | None,
    *,
    unit_id: int,
    predicted_rul: float,
    severity: str,
    model_used: str,
    inference_time_ms: float,
    sequence_length: int,
) -> None:
    """
    Persist a RUL prediction to the database.

    Called via asyncio.create_task() so it never adds latency to the
    HTTP response.  Errors are logged but not re-raised.
    """
    try:
        await crud.log_prediction(
            db,
            unit_id=unit_id,
            predicted_rul=predicted_rul,
            severity=severity,
            model_used=model_used,
            inference_time_ms=inference_time_ms,
            sequence_length=sequence_length,
        )
    except Exception as exc:
        logger.warning("DB persistence failed (non-fatal): %s", exc)


# ── /predict/rul ──────────────────────────────────────────────────────────────

@router.post(
    "/rul",
    response_model=RULPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict RUL for a single engine unit",
    description=(
        "Accepts a sliding-window sequence of sensor observations and returns "
        "the predicted Remaining Useful Life (RUL) in operational cycles, "
        "along with a severity label and inference latency. "
        "The sequence length should match `sequence_length` from GET /status (default: 30). "
        "**Result is automatically persisted to PostgreSQL** when DATABASE_URL is configured."
    ),
)
async def predict_rul(
    payload: RULPredictionRequest,
    request: Request,
    db: AsyncSession | None = Depends(get_db),
) -> RULPredictionResponse:
    """Single-unit RUL prediction endpoint — with async DB persistence."""
    svc = request.app.state.inference_service
    feature_cols = svc.feature_cols

    sequence_arr = _build_sequence_array(payload, feature_cols)

    try:
        rul, severity, inference_ms = svc.predict_rul(sequence_arr, model_name="tcn")
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    # ── Fire-and-forget DB write (does not block the response) ──────────────
    asyncio.create_task(
        _persist_prediction(
            db,
            unit_id=payload.unit_id,
            predicted_rul=rul,
            severity=severity,
            model_used="TCN",
            inference_time_ms=inference_ms,
            sequence_length=len(payload.sequence),
        )
    )

    return RULPredictionResponse(
        unit_id=payload.unit_id,
        predicted_rul=round(rul, 2),
        confidence_interval=None,  # Extended with MC Dropout in future phase
        severity=severity,
        model_used="TCN",
        inference_time_ms=round(inference_ms, 2),
        timestamp=datetime.now(tz=timezone.utc),
    )


# ── /predict/batch ────────────────────────────────────────────────────────────

@router.post(
    "/batch",
    response_model=BatchRULResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch RUL prediction for multiple engine units",
    description=(
        "Accepts up to 100 engine units in a single request and returns "
        "per-unit RUL predictions. "
        "Unit IDs must be unique within a single batch request. "
        "**Each result is persisted to PostgreSQL** when DATABASE_URL is configured."
    ),
)
async def predict_batch(
    payload: BatchRULRequest,
    request: Request,
    db: AsyncSession | None = Depends(get_db),
) -> BatchRULResponse:
    """Multi-unit batch RUL prediction endpoint — with async DB persistence."""
    import time

    svc = request.app.state.inference_service
    feature_cols = svc.feature_cols

    t_wall = time.perf_counter()

    sequences = []
    unit_ids = []
    for req in payload.predictions:
        sequences.append(_build_sequence_array(req, feature_cols))
        unit_ids.append(req.unit_id)

    try:
        batch_results = svc.predict_rul_batch(sequences, model_name="tcn")
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    now = datetime.now(tz=timezone.utc)
    responses = []
    persist_tasks = []

    for uid, req, (rul, sev, ms) in zip(unit_ids, payload.predictions, batch_results):
        responses.append(
            RULPredictionResponse(
                unit_id=uid,
                predicted_rul=round(rul, 2),
                confidence_interval=None,
                severity=sev,
                model_used="TCN",
                inference_time_ms=round(ms, 2),
                timestamp=now,
            )
        )
        persist_tasks.append(
            asyncio.create_task(
                _persist_prediction(
                    db,
                    unit_id=uid,
                    predicted_rul=rul,
                    severity=sev,
                    model_used="TCN",
                    inference_time_ms=ms,
                    sequence_length=len(req.sequence),
                )
            )
        )

    total_ms = (time.perf_counter() - t_wall) * 1000

    return BatchRULResponse(
        results=responses,
        total_units=len(responses),
        total_inference_time_ms=round(total_ms, 2),
    )
