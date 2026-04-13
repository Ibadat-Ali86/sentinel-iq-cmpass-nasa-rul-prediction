"""
SentinelIQ — Pydantic Response Schemas
========================================

Defines all outgoing response models for the FastAPI ML server.

Author: SentinelIQ Team
Version: 2.0
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# Health / Status Responses
# ──────────────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Response for GET /health"""
    status: str = Field(..., description="'healthy' | 'degraded' | 'unavailable'")
    version: str = Field(..., description="API version string")
    device: str = Field(..., description="Inference device: 'cpu' | 'cuda'")
    timestamp: datetime = Field(..., description="Server UTC timestamp")

    model_config = {"json_schema_extra": {
        "example": {
            "status": "healthy",
            "version": "2.0.0",
            "device": "cpu",
            "timestamp": "2026-04-13T18:00:00Z"
        }
    }}


class ModelStatusResponse(BaseModel):
    """Response for GET /status"""
    models_loaded: Dict[str, bool] = Field(
        ...,
        description="Map of model name to load status.",
        example={"tcn": True, "lstm": False, "anomaly_detector": True}
    )
    feature_count: int = Field(..., description="Number of active sensor features after preprocessing")
    feature_cols: List[str] = Field(..., description="Active feature column names")
    sequence_length: int = Field(..., description="Expected sequence length per request")
    rul_cap: int = Field(..., description="RUL capping value used during training")


# ──────────────────────────────────────────────────────────────────────────────
# RUL Prediction Responses
# ──────────────────────────────────────────────────────────────────────────────

class RULPredictionResponse(BaseModel):
    """Response for POST /predict/rul"""
    unit_id: int = Field(..., description="Engine unit identifier")
    predicted_rul: float = Field(..., ge=0.0, description="Predicted Remaining Useful Life (cycles)")
    confidence_interval: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional 90% prediction interval: {'lower': float, 'upper': float}",
    )
    severity: str = Field(
        ...,
        description="Operational severity based on predicted RUL: "
                    "'critical' (≤10) | 'warning' (≤30) | 'normal' (>30)"
    )
    model_used: str = Field(..., description="Name of the model that produced this prediction")
    inference_time_ms: float = Field(..., description="Server-side inference latency in milliseconds")
    timestamp: datetime = Field(..., description="Prediction UTC timestamp")

    model_config = {"json_schema_extra": {
        "example": {
            "unit_id": 42,
            "predicted_rul": 47.3,
            "confidence_interval": {"lower": 38.1, "upper": 56.5},
            "severity": "normal",
            "model_used": "TCN",
            "inference_time_ms": 12.4,
            "timestamp": "2026-04-13T18:00:00Z"
        }
    }}


class BatchRULResponse(BaseModel):
    """Response for POST /predict/batch"""
    results: List[RULPredictionResponse] = Field(
        ..., description="Per-unit RUL predictions (same order as request)"
    )
    total_units: int = Field(..., description="Number of units processed")
    total_inference_time_ms: float = Field(..., description="Wall-clock batch inference time")


# ──────────────────────────────────────────────────────────────────────────────
# Anomaly Detection Responses
# ──────────────────────────────────────────────────────────────────────────────

class AnomalyResponse(BaseModel):
    """Response for POST /predict/anomaly"""
    unit_id: int = Field(..., description="Engine unit identifier")
    current_cycle: Optional[int] = Field(default=None, description="Operational cycle (if provided)")
    anomaly_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Combined anomaly score [0, 1]. Higher = more anomalous."
    )
    isolation_forest_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Isolation Forest component score (weight: 0.4)"
    )
    reconstruction_error: float = Field(
        ..., ge=0.0,
        description="Autoencoder reconstruction MSE (weight: 0.6 after normalisation)"
    )
    severity: str = Field(
        ...,
        description="Severity label: 'normal' (<0.3) | 'warning' (0.3–0.7) | 'critical' (≥0.7)"
    )
    recommendation: str = Field(
        ...,
        description="Human-readable action recommendation based on severity"
    )
    inference_time_ms: float = Field(..., description="Server-side inference latency")
    timestamp: datetime = Field(..., description="Detection UTC timestamp")

    model_config = {"json_schema_extra": {
        "example": {
            "unit_id": 42,
            "current_cycle": 150,
            "anomaly_score": 0.62,
            "isolation_forest_score": 0.55,
            "reconstruction_error": 0.0038,
            "severity": "warning",
            "recommendation": "Schedule inspection within next 72 hours. Monitor sensor_4 and sensor_7.",
            "inference_time_ms": 8.2,
            "timestamp": "2026-04-13T18:00:00Z"
        }
    }}


# ──────────────────────────────────────────────────────────────────────────────
# Error Response
# ──────────────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standard error envelope returned on 4xx/5xx responses"""
    error: str = Field(..., description="Error type identifier")
    detail: str = Field(..., description="Human-readable error description")
    timestamp: datetime = Field(..., description="Error UTC timestamp")

    model_config = {"json_schema_extra": {
        "example": {
            "error": "MODEL_NOT_LOADED",
            "detail": "TCN model checkpoint not found at models/tcn_best.pth",
            "timestamp": "2026-04-13T18:00:00Z"
        }
    }}
