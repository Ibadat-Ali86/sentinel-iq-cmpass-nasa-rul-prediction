"""
SentinelIQ src/data sub-package.

Provides data ingestion and preprocessing for NASA C-MAPSS turbofan data.
"""
from __future__ import annotations

# Re-export the public API surface of data_loader for backward compatibility.
# ml_server and notebooks importing from `src.data_loader` directly still work.
from src.data.data_loader import (  # noqa: F401
    CMAPSSDataLoader,
    load_raw_dataset,
)

__all__ = ["CMAPSSDataLoader", "load_raw_dataset"]
