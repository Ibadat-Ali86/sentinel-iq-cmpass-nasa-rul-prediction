"""Test suite for SentinelIQ — model loading and inference contract."""
from __future__ import annotations

import pytest


def test_src_models_importable() -> None:
    """Ensure the models sub-package is importable without side effects."""
    try:
        from src.models import models  # noqa: F401
    except ImportError as exc:
        pytest.fail(f"src.models.models failed to import: {exc}")


def test_ml_server_app_importable() -> None:
    """Ensure FastAPI app instantiates without errors (smoke test)."""
    try:
        from ml_server.main import app  # noqa: F401
    except ImportError as exc:
        pytest.fail(f"ml_server.main.app failed to import: {exc}")


def test_rul_output_shape() -> None:
    """Model predict() must return a scalar RUL per engine unit."""
    pytest.skip("Requires a trained model artifact in models/ — run after make train")
