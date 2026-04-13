"""
SentinelIQ — Health Router
============================

Endpoints:
  GET /health  — Liveness probe (service health + device info)
  GET /status  — Model load status + feature config

Author: SentinelIQ Team
Version: 2.0
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Request

from ml_server.schemas.responses import HealthResponse, ModelStatusResponse

router = APIRouter(prefix="", tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service liveness probe",
    description=(
        "Returns the current health status of the SentinelIQ ML server, "
        "the inference device (CPU/GPU), and the API version. "
        "Use this as a Kubernetes liveness probe or Docker HEALTHCHECK."
    ),
)
async def health(request: Request) -> HealthResponse:
    """Liveness probe — always returns 200 if the server is running."""
    svc = request.app.state.inference_service
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        device=svc.device_str,
        timestamp=datetime.now(tz=timezone.utc),
    )


@router.get(
    "/status",
    response_model=ModelStatusResponse,
    summary="Model load status",
    description=(
        "Returns which ML models are currently loaded in memory, "
        "the active feature set, and model configuration parameters. "
        "Use this to verify that checkpoints were loaded before sending predictions."
    ),
)
async def status(request: Request) -> ModelStatusResponse:
    """Model load status endpoint."""
    svc = request.app.state.inference_service
    from src.config import config
    return ModelStatusResponse(
        models_loaded=svc.models_loaded,
        feature_count=len(svc.feature_cols),
        feature_cols=svc.feature_cols,
        sequence_length=config.sequence_length,
        rul_cap=config.rul_cap,
    )
