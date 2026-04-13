"""
SentinelIQ — RUL Prediction Router
=====================================

Endpoints:
  POST /predict/rul    — Single-unit RUL prediction
  POST /predict/batch  — Multi-unit batch RUL prediction

Author: SentinelIQ Team
Version: 2.0
"""

from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, HTTPException, Request, status

from ml_server.schemas.requests import BatchRULRequest, RULPredictionRequest
from ml_server.schemas.responses import BatchRULResponse, RULPredictionResponse

router = APIRouter(prefix="/predict", tags=["RUL Prediction"])


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


@router.post(
    "/rul",
    response_model=RULPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict RUL for a single engine unit",
    description=(
        "Accepts a sliding-window sequence of sensor observations and returns "
        "the predicted Remaining Useful Life (RUL) in operational cycles, "
        "along with a severity label and inference latency. "
        "The sequence length should match `sequence_length` from GET /status (default: 30)."
    ),
)
async def predict_rul(
    payload: RULPredictionRequest,
    request: Request,
) -> RULPredictionResponse:
    """Single-unit RUL prediction endpoint."""
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

    return RULPredictionResponse(
        unit_id=payload.unit_id,
        predicted_rul=round(rul, 2),
        confidence_interval=None,  # Extended in Phase 16 with MC Dropout
        severity=severity,
        model_used="TCN",
        inference_time_ms=round(inference_ms, 2),
        timestamp=datetime.now(tz=timezone.utc),
    )


@router.post(
    "/batch",
    response_model=BatchRULResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch RUL prediction for multiple engine units",
    description=(
        "Accepts up to 100 engine units in a single request and returns "
        "per-unit RUL predictions. "
        "Unit IDs must be unique within a single batch request."
    ),
)
async def predict_batch(
    payload: BatchRULRequest,
    request: Request,
) -> BatchRULResponse:
    """Multi-unit batch RUL prediction endpoint."""
    svc = request.app.state.inference_service
    feature_cols = svc.feature_cols

    import time
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
    responses = [
        RULPredictionResponse(
            unit_id=uid,
            predicted_rul=round(rul, 2),
            confidence_interval=None,
            severity=sev,
            model_used="TCN",
            inference_time_ms=round(ms, 2),
            timestamp=now,
        )
        for uid, (rul, sev, ms) in zip(unit_ids, batch_results)
    ]

    total_ms = (time.perf_counter() - t_wall) * 1000

    return BatchRULResponse(
        results=responses,
        total_units=len(responses),
        total_inference_time_ms=round(total_ms, 2),
    )
