"""
SentinelIQ — Anomaly Detection Router
=======================================

Endpoint:
  POST /predict/anomaly  — Anomaly score + severity for a single sensor observation

Author: SentinelIQ Team
Version: 2.0
"""

from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, HTTPException, Request, status

from ml_server.schemas.requests import AnomalyDetectionRequest
from ml_server.schemas.responses import AnomalyResponse

router = APIRouter(prefix="/predict", tags=["Anomaly Detection"])


@router.post(
    "/anomaly",
    response_model=AnomalyResponse,
    status_code=status.HTTP_200_OK,
    summary="Anomaly score for a single sensor observation",
    description=(
        "Accepts a flat vector of normalised sensor readings for one timestep "
        "and returns the combined Isolation Forest + Autoencoder anomaly score, "
        "severity label (normal / warning / critical), and a maintenance recommendation. "
        "\n\n"
        "The anomaly score is a weighted combination:  "
        "`0.4 × IF_score + 0.6 × AE_score` (both normalised to [0, 1])."
    ),
)
async def predict_anomaly(
    payload: AnomalyDetectionRequest,
    request: Request,
) -> AnomalyResponse:
    """Anomaly detection endpoint."""
    svc = request.app.state.inference_service
    feature_cols = svc.feature_cols

    # Validate sensor vector length
    if len(payload.sensor_values) != len(feature_cols):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"sensor_values length mismatch. "
                f"Expected {len(feature_cols)} features (see GET /status), "
                f"got {len(payload.sensor_values)}."
            ),
        )

    sensor_arr = np.array(payload.sensor_values, dtype=np.float32)

    try:
        anomaly_score, if_score, ae_error, severity, recommendation = (
            svc.predict_anomaly(sensor_arr)
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    return AnomalyResponse(
        unit_id=payload.unit_id,
        current_cycle=payload.current_cycle,
        anomaly_score=round(anomaly_score, 4),
        isolation_forest_score=round(if_score, 4),
        reconstruction_error=round(ae_error, 6),
        severity=severity,
        recommendation=recommendation,
        inference_time_ms=0.0,  # filled by service (anomaly returns pre-computed)
        timestamp=datetime.now(tz=timezone.utc),
    )
