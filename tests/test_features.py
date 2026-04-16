"""Test suite for SentinelIQ — feature engineering pipeline."""
from __future__ import annotations

import pytest


def test_src_features_importable() -> None:
    """Ensure the features sub-package is importable without side effects."""
    try:
        from src.features import build_features  # noqa: F401
    except ImportError as exc:
        pytest.fail(f"src.features.build_features failed to import: {exc}")


def test_rolling_window_column_count() -> None:
    """Feature engineering must produce at least 15 derived columns from 21 sensors."""
    pytest.skip("Requires data/processed/ — run after make download-data")
