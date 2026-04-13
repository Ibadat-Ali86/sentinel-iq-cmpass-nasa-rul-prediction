"""
SentinelIQ — Central Configuration Module
==========================================

Single source of truth for all hyperparameters, paths, and settings.
Uses environment variables (via .env) with sensible defaults.

Author: SentinelIQ Team
Version: 2.0
"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional

# Load .env file if present (no error if missing)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv optional — falls back to os.environ


def _env_path(key: str, default: str) -> Path:
    """Read a filesystem path from env, fallback to default."""
    return Path(os.getenv(key, default))


@dataclass
class Config:
    """
    Central configuration dataclass for the entire SentinelIQ pipeline.

    All values can be overridden via environment variables (see .env.example).
    Paths are relative by default — works both locally and on Kaggle/Colab.
    """

    # ─── Paths ────────────────────────────────────────────────────────────────
    data_dir: Path = field(
        default_factory=lambda: _env_path("SENTINELIQ_DATA_DIR", "./data/raw")
    )
    processed_dir: Path = field(
        default_factory=lambda: _env_path("SENTINELIQ_PROCESSED_DIR", "./data/processed")
    )
    model_dir: Path = field(
        default_factory=lambda: _env_path("SENTINELIQ_MODEL_DIR", "./models")
    )
    output_dir: Path = field(
        default_factory=lambda: _env_path("SENTINELIQ_OUTPUT_DIR", "./outputs")
    )

    # ─── Reproducibility ──────────────────────────────────────────────────────
    random_seed: int = int(os.getenv("SENTINELIQ_RANDOM_SEED", "42"))

    # ─── Dataset ──────────────────────────────────────────────────────────────
    dataset: str = os.getenv("SENTINELIQ_DATASET", "FD001")
    # Supported: "FD001" | "FD002" | "FD003" | "FD004" | "ALL"

    # ─── Data Processing ──────────────────────────────────────────────────────
    rul_cap: int = 125              # Piece-wise linear RUL ceiling (cycles)
    sequence_length: int = 30       # Sliding window length for temporal models
    n_operating_clusters: int = 6   # K-Means clusters for operating conditions
    variance_threshold: float = 1e-6  # Sensors below this variance are dropped

    # ─── Model Hyperparameters ────────────────────────────────────────────────
    batch_size: int = 64
    learning_rate: float = 0.001
    n_epochs: int = 50
    hidden_dim: int = 128           # LSTM hidden units
    dropout_rate: float = 0.2
    patience: int = 10              # Early stopping patience (epochs)

    # TCN-specific
    tcn_channels: List[int] = field(default_factory=lambda: [64, 128, 128, 64])
    tcn_kernel_size: int = 3

    # Multi-task learning
    n_failure_modes: int = 5
    lambda_classification: float = 0.5  # Weight for failure mode loss

    # Anomaly detection
    anomaly_contamination: float = 0.05   # Isolation Forest contamination ratio
    anomaly_healthy_rul_threshold: int = 100  # Min RUL to be "healthy" for training
    anomaly_critical_threshold: float = 0.7
    anomaly_warning_threshold: float = 0.3

    # ─── Feature Selection ────────────────────────────────────────────────────
    sensors_to_use: Optional[List[str]] = None  # None = auto-select via variance

    # ─── Failure Mode Labels (for MultiTask model) ────────────────────────────
    failure_mode_names: List[str] = field(default_factory=lambda: [
        "HPC_degradation",
        "LPT_erosion",
        "fan_bearing_wear",
        "seal_leakage",
        "compressor_fouling",
    ])

    def __post_init__(self):
        """Create all output directories on initialization."""
        for directory in [self.processed_dir, self.model_dir, self.output_dir, self.data_dir]:
            directory.mkdir(parents=True, exist_ok=True)

    @property
    def production_model_path(self) -> Path:
        """Path to the best production model checkpoint."""
        return self.model_dir / "production_model.pth"

    @property
    def anomaly_model_path(self) -> Path:
        """Path to the saved anomaly detector."""
        return self.model_dir / "anomaly_detector.pkl"


# ─── Singleton Instance ───────────────────────────────────────────────────────
# Import this throughout the project: `from src.config import config`
config = Config()
