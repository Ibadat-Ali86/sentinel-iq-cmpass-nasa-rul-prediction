"""Test suite for SentinelIQ — data loading and schema validation."""
from __future__ import annotations

import pytest


def test_data_directory_exists() -> None:
    """Verify data/raw and data/processed directories exist."""
    from pathlib import Path

    assert Path("data/raw").exists(), "data/raw/ directory missing"
    assert Path("data/processed").exists(), "data/processed/ directory missing"
    assert Path("data/external").exists(), "data/external/ directory missing"


def test_gitkeep_placeholders_present() -> None:
    """Guard against accidentally wiping placeholder files before data is present."""
    from pathlib import Path

    assert Path("data/raw/.gitkeep").exists(), "data/raw/.gitkeep removed"
    assert Path("data/processed/.gitkeep").exists(), "data/processed/.gitkeep removed"
    assert Path("models/.gitkeep").exists(), "models/.gitkeep removed"
