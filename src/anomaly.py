"""
SentinelIQ — Anomaly Detection Module
======================================

Dual-model anomaly detection ensemble:
  1. Isolation Forest — fast, global outlier detection
  2. Autoencoder     — deep reconstruction-based anomaly scoring

Ensemble: 0.4 × IF_score + 0.6 × AE_score → [0, 1] combined score

Thresholds (configurable via Config):
  score < 0.3  → NORMAL
  score 0.3–0.7 → WARNING
  score > 0.7  → CRITICAL

Author: SentinelIQ Team
Version: 2.0
"""

import logging
import pickle
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from .models import Autoencoder

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Ensemble anomaly detector: Isolation Forest + Autoencoder.

    Train ONLY on healthy data (high RUL cycles) so the detector learns
    what normal looks like and flags deviation from that baseline.

    Usage:
        detector = AnomalyDetector(config)
        detector.fit(train_df, feature_cols)
        scores, labels = detector.predict(test_features)
    """

    def __init__(self, config):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.scaler = StandardScaler()
        self.iso_forest: Optional[IsolationForest] = None
        self.autoencoder: Optional[Autoencoder] = None
        self._fitted = False

    # ──────────────────────────────────────────────────────────────────────────
    # Public: Fit
    # ──────────────────────────────────────────────────────────────────────────

    def fit(self, train_df, feature_cols: List[str]) -> "AnomalyDetector":
        """
        Fit both models on healthy training data (RUL_capped > threshold).

        Args:
            train_df:     Full training DataFrame with RUL_capped column.
            feature_cols: Sensor columns to use.
        """
        healthy = train_df[train_df["RUL_capped"] > self.config.anomaly_healthy_rul_threshold]
        logger.info(
            "AnomalyDetector — fitting on %d healthy samples (%.1f%% of training data)",
            len(healthy), 100 * len(healthy) / len(train_df),
        )

        X_healthy = healthy[feature_cols].values
        X_scaled = self.scaler.fit_transform(X_healthy)

        self._fit_isolation_forest(X_scaled)
        self._fit_autoencoder(X_healthy, len(feature_cols))

        self._fitted = True
        logger.info("AnomalyDetector — fitting complete ✓")
        return self

    def predict(
        self, X: np.ndarray
    ) -> Tuple[np.ndarray, List[str]]:
        """
        Compute ensemble anomaly scores and severity labels.

        Args:
            X: Raw (unnormalised) feature array, shape (n_samples, n_features).

        Returns:
            (scores, labels)
            - scores: float array in [0, 1]
            - labels: list of "normal" | "warning" | "critical"
        """
        if not self._fitted:
            raise RuntimeError("AnomalyDetector must be fitted before calling predict().")

        combined = self._combined_score(X)
        labels = [self._severity(s) for s in combined]
        return combined, labels

    # ──────────────────────────────────────────────────────────────────────────
    # Persistence
    # ──────────────────────────────────────────────────────────────────────────

    def save(self, path: Optional[Path] = None) -> None:
        """Serialise both models + scaler to a pickle file."""
        path = path or self.config.anomaly_model_path
        payload = {
            "scaler": self.scaler,
            "iso_forest": self.iso_forest,
            "ae_state_dict": self.autoencoder.state_dict() if self.autoencoder else None,
            "input_dim": self.autoencoder.encoder[0].in_features if self.autoencoder else None,
        }
        with open(path, "wb") as f:
            pickle.dump(payload, f)
        logger.info("AnomalyDetector saved to %s", path)

    def load(self, path: Optional[Path] = None) -> "AnomalyDetector":
        """Load models from a previously saved pickle file."""
        path = path or self.config.anomaly_model_path
        with open(path, "rb") as f:
            payload = pickle.load(f)
        self.scaler = payload["scaler"]
        self.iso_forest = payload["iso_forest"]
        if payload["ae_state_dict"] is not None:
            self.autoencoder = Autoencoder(input_dim=payload["input_dim"]).to(self.device)
            self.autoencoder.load_state_dict(payload["ae_state_dict"])
            self.autoencoder.eval()
        self._fitted = True
        logger.info("AnomalyDetector loaded from %s", path)
        return self

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _fit_isolation_forest(self, X_scaled: np.ndarray) -> None:
        self.iso_forest = IsolationForest(
            contamination=self.config.anomaly_contamination,
            n_estimators=100,
            random_state=self.config.random_seed,
        )
        self.iso_forest.fit(X_scaled)
        logger.info("Isolation Forest fitted.")

    def _fit_autoencoder(self, X_healthy: np.ndarray, input_dim: int) -> None:
        from .trainer import ModelTrainer  # Local import avoids circular dependency
        trainer = ModelTrainer(self.config)
        healthy_tensor = torch.FloatTensor(X_healthy)
        self.autoencoder = trainer.train_autoencoder(healthy_tensor, input_dim=input_dim)
        self.autoencoder.eval()

    def _if_score(self, X: np.ndarray) -> np.ndarray:
        """Isolation Forest score, normalised to [0, 1]. Higher = more anomalous."""
        X_scaled = self.scaler.transform(X)
        raw = -self.iso_forest.decision_function(X_scaled)
        span = raw.max() - raw.min() + 1e-8
        return (raw - raw.min()) / span

    def _ae_score(self, X: np.ndarray) -> np.ndarray:
        """Autoencoder reconstruction error, normalised to [0, 1]."""
        x_tensor = torch.FloatTensor(X).to(self.device)
        errors = self.autoencoder.reconstruction_error(x_tensor)
        span = errors.max() - errors.min() + 1e-8
        return (errors - errors.min()) / span

    def _combined_score(self, X: np.ndarray) -> np.ndarray:
        """Weighted ensemble: 40% IF + 60% AE."""
        return 0.4 * self._if_score(X) + 0.6 * self._ae_score(X)

    def _severity(self, score: float) -> str:
        if score >= self.config.anomaly_critical_threshold:
            return "critical"
        if score >= self.config.anomaly_warning_threshold:
            return "warning"
        return "normal"
