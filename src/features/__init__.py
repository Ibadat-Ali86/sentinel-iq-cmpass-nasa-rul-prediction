"""
SentinelIQ src/features sub-package.

Provides rolling-window feature engineering for sensor telemetry sequences.
"""
from __future__ import annotations

from src.features.build_features import (  # noqa: F401
    FeatureEngineer,
    build_sequence_features,
    select_informative_sensors,
)

__all__ = ["FeatureEngineer", "build_sequence_features", "select_informative_sensors"]
