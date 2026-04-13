"""
SentinelIQ — Pydantic Request Schemas
======================================

Defines all incoming request body models for the FastAPI ML server.

Author: SentinelIQ Team
Version: 2.0
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class SensorObservation(BaseModel):
    """
    A single timestep of sensor readings.

    Corresponds to one row of the C-MAPSS dataset (excluding unit_id, cycle).
    """
    op_setting_1: float = Field(..., description="Operational setting 1 (altitude equivalent)")
    op_setting_2: float = Field(..., description="Operational setting 2 (throttle resolver angle)")
    op_setting_3: float = Field(..., description="Operational setting 3 (total pressure ratio)")
    sensor_values: List[float] = Field(
        ...,
        description="List of sensor readings. Must contain exactly the number of active sensors "
                    "returned by the /status endpoint (typically 14–15 after constant removal).",
        min_length=1,
        max_length=21,
    )


class RULPredictionRequest(BaseModel):
    """
    Request body for POST /predict/rul

    Supplies a sliding window (sequence) of sensor observations for a single engine unit.
    The sequence length should match the model's `sequence_length` (default: 30 cycles).
    """
    unit_id: int = Field(..., ge=1, description="Engine unit identifier", example=42)
    sequence: List[SensorObservation] = Field(
        ...,
        description="Ordered list of sensor observations (time-ordered, oldest first). "
                    "Length should equal model sequence_length (default 30).",
        min_length=1,
        max_length=200,
    )
    dataset_id: Optional[str] = Field(
        default="FD001",
        description="Source dataset (FD001–FD004). Affects normalisation parameters.",
        pattern=r"^FD00[1-4]$",
    )

    model_config = {"json_schema_extra": {
        "example": {
            "unit_id": 42,
            "dataset_id": "FD001",
            "sequence": [
                {
                    "op_setting_1": 0.0,
                    "op_setting_2": 0.0002,
                    "op_setting_3": 100.0,
                    "sensor_values": [518.67, 641.82, 1589.7, 1400.6, 14.62,
                                      21.61, 554.36, 2388.1, 9046.19, 1.3,
                                      47.47, 521.66, 2388.02, 8138.62]
                }
            ]
        }
    }}


class AnomalyDetectionRequest(BaseModel):
    """
    Request body for POST /predict/anomaly

    Supplies a flat vector of current sensor readings (single timestep, not a sequence)
    for anomaly scoring using the Isolation Forest + Autoencoder ensemble.
    """
    unit_id: int = Field(..., ge=1, description="Engine unit identifier")
    sensor_values: List[float] = Field(
        ...,
        description="Normalised sensor readings for the current timestep. "
                    "Length must match active feature count from /status.",
        min_length=1,
        max_length=21,
    )
    current_cycle: Optional[int] = Field(
        default=None, ge=1,
        description="Current operational cycle number (used for context in response).",
    )

    model_config = {"json_schema_extra": {
        "example": {
            "unit_id": 42,
            "current_cycle": 150,
            "sensor_values": [518.67, 641.82, 1589.7, 1400.6, 14.62,
                              21.61, 554.36, 2388.1, 9046.19, 1.3,
                              47.47, 521.66, 2388.02, 8138.62]
        }
    }}


class BatchRULRequest(BaseModel):
    """
    Request body for POST /predict/batch

    Supplies prediction requests for multiple engine units in a single call.
    """
    predictions: List[RULPredictionRequest] = Field(
        ...,
        description="List of per-unit RUL prediction requests.",
        min_length=1,
        max_length=100,
    )

    @field_validator("predictions")
    @classmethod
    def validate_unique_units(cls, v: List[RULPredictionRequest]) -> List[RULPredictionRequest]:
        unit_ids = [req.unit_id for req in v]
        if len(unit_ids) != len(set(unit_ids)):
            raise ValueError("Duplicate unit_id values in batch request.")
        return v
