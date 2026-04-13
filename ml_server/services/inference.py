"""
SentinelIQ — ML Inference Service
====================================

Handles model loading, preprocessing, and inference for all prediction
endpoints. Designed as a singleton loaded at FastAPI startup.

Author: SentinelIQ Team
Version: 2.0
"""

import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch

logger = logging.getLogger(__name__)


class InferenceService:
    """
    Central inference service — loaded once at application startup.

    Responsibilities:
    - Load trained model checkpoints from disk
    - Hold the fitted FeatureEngineer scaler (for normalisation)
    - Run inference for RUL prediction and anomaly detection
    - Report model load status for /status endpoint

    Usage (in FastAPI lifespan):
        service = InferenceService(config)
        service.load_models()
    """

    def __init__(self, config):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Model registry
        self._models: Dict[str, Optional[torch.nn.Module]] = {
            "tcn": None,
            "lstm": None,
        }
        self._anomaly_detector = None
        self._feature_engineer = None
        self._feature_cols: List[str] = []

        logger.info("InferenceService initialised | device=%s", self.device)

    # ──────────────────────────────────────────────────────────────────────────
    # Startup
    # ──────────────────────────────────────────────────────────────────────────

    def load_models(self) -> None:
        """
        Load all model checkpoints from disk.

        Called during FastAPI lifespan startup. Missing checkpoints are
        logged as warnings — the server still starts (graceful degradation).
        """
        self._load_rul_model("tcn", self.config.model_dir / "tcn_best.pth")
        self._load_rul_model("lstm", self.config.model_dir / "lstm_best.pth")
        self._load_anomaly_detector()
        self._load_feature_engineer()

        loaded = [k for k, v in self._models.items() if v is not None]
        logger.info("Models loaded: %s", loaded)

    def _load_rul_model(self, name: str, path: Path) -> None:
        """Load a TCN or LSTM checkpoint if the file exists."""
        if not path.exists():
            logger.warning("Checkpoint not found: %s (run training pipeline first)", path)
            return

        try:
            from src.models import TCNModel, LSTMModel
            input_dim = len(self._feature_cols) if self._feature_cols else 14  # fallback

            if name == "tcn":
                model = TCNModel(
                    input_dim=input_dim,
                    num_channels=self.config.tcn_channels,
                    kernel_size=self.config.tcn_kernel_size,
                    dropout=self.config.dropout_rate,
                )
            else:
                model = LSTMModel(
                    input_dim=input_dim,
                    hidden_dim=self.config.hidden_dim,
                    dropout=self.config.dropout_rate,
                )

            state = torch.load(path, map_location=self.device)
            model.load_state_dict(state)
            model.eval()
            model.to(self.device)
            self._models[name] = model
            logger.info("Loaded %s from %s", name.upper(), path)

        except Exception as exc:
            logger.error("Failed to load %s: %s", name, exc)

    def _load_anomaly_detector(self) -> None:
        """Load the pickled AnomalyDetector if it exists."""
        path = self.config.anomaly_model_path
        if not path.exists():
            logger.warning("Anomaly detector not found: %s", path)
            return
        try:
            from src.anomaly import AnomalyDetector
            self._anomaly_detector = AnomalyDetector.load(path)
            logger.info("AnomalyDetector loaded from %s", path)
        except Exception as exc:
            logger.error("Failed to load AnomalyDetector: %s", exc)

    def _load_feature_engineer(self) -> None:
        """
        Initialise a FeatureEngineer to hold normalisation info.

        In production, a pre-fitted scaler should be loaded from disk.
        For now, initialise with config defaults.
        """
        try:
            from src.features import FeatureEngineer
            self._feature_engineer = FeatureEngineer(
                rul_cap=self.config.rul_cap,
                variance_threshold=self.config.variance_threshold,
                n_operating_clusters=self.config.n_operating_clusters,
                random_seed=self.config.random_seed,
            )
            # Feature cols default (FD001 after constant removal)
            # Overridden when real data is processed
            self._feature_cols = [f"sensor_{i}" for i in range(2, 22)
                                   if i not in (1, 5, 10, 16, 18, 19)]
            logger.info("FeatureEngineer ready | %d features", len(self._feature_cols))
        except Exception as exc:
            logger.error("FeatureEngineer init failed: %s", exc)

    # ──────────────────────────────────────────────────────────────────────────
    # Status
    # ──────────────────────────────────────────────────────────────────────────

    @property
    def models_loaded(self) -> Dict[str, bool]:
        status = {k: v is not None for k, v in self._models.items()}
        status["anomaly_detector"] = self._anomaly_detector is not None
        return status

    @property
    def feature_cols(self) -> List[str]:
        return self._feature_cols

    @property
    def device_str(self) -> str:
        return str(self.device)

    # ──────────────────────────────────────────────────────────────────────────
    # Inference — RUL
    # ──────────────────────────────────────────────────────────────────────────

    def predict_rul(
        self,
        sequence: np.ndarray,
        model_name: str = "tcn",
    ) -> Tuple[float, str, float]:
        """
        Predict RUL for a single sequence.

        Args:
            sequence:   numpy array of shape (seq_len, n_features).
            model_name: 'tcn' or 'lstm'.

        Returns:
            (predicted_rul, severity, inference_time_ms)

        Raises:
            RuntimeError: If the requested model is not loaded.
        """
        model = self._models.get(model_name)
        if model is None:
            raise RuntimeError(
                f"Model '{model_name}' is not loaded. "
                f"Run the training pipeline first: python pipeline/sentineliq_ml_pipeline.py"
            )

        t0 = time.perf_counter()

        tensor = torch.FloatTensor(sequence).unsqueeze(0).to(self.device)  # (1, seq_len, feat)
        with torch.no_grad():
            raw_pred = model(tensor).item()

        rul = max(0.0, float(raw_pred))  # Clip negative predictions
        elapsed_ms = (time.perf_counter() - t0) * 1000

        severity = self._rul_to_severity(rul)
        logger.debug("RUL prediction: %.2f cycles [%s] | %.1f ms", rul, severity, elapsed_ms)
        return rul, severity, elapsed_ms

    def predict_rul_batch(
        self,
        sequences: List[np.ndarray],
        model_name: str = "tcn",
    ) -> List[Tuple[float, str, float]]:
        """
        Batch RUL prediction.

        Args:
            sequences:  List of (seq_len, n_features) numpy arrays.
            model_name: 'tcn' or 'lstm'.

        Returns:
            List of (predicted_rul, severity, inference_time_ms) per sequence.
        """
        model = self._models.get(model_name)
        if model is None:
            raise RuntimeError(f"Model '{model_name}' is not loaded.")

        t0 = time.perf_counter()
        batch = torch.FloatTensor(np.array(sequences)).to(self.device)  # (B, seq_len, feat)
        with torch.no_grad():
            raw_preds = model(batch).cpu().numpy()

        elapsed_ms = (time.perf_counter() - t0) * 1000
        per_unit_ms = elapsed_ms / len(sequences)

        results = []
        for pred in raw_preds:
            rul = max(0.0, float(pred))
            severity = self._rul_to_severity(rul)
            results.append((rul, severity, per_unit_ms))

        logger.info("Batch RUL: %d units | %.1f ms total", len(sequences), elapsed_ms)
        return results

    # ──────────────────────────────────────────────────────────────────────────
    # Inference — Anomaly
    # ──────────────────────────────────────────────────────────────────────────

    def predict_anomaly(
        self,
        sensor_vector: np.ndarray,
    ) -> Tuple[float, float, float, str, str]:
        """
        Compute anomaly score for a single sensor observation.

        Args:
            sensor_vector: 1-D numpy array of shape (n_features,).

        Returns:
            (anomaly_score, if_score, reconstruction_error, severity, recommendation)

        Raises:
            RuntimeError: If anomaly detector is not loaded.
        """
        if self._anomaly_detector is None:
            raise RuntimeError(
                "AnomalyDetector is not loaded. "
                "Run: python pipeline/sentineliq_ml_pipeline.py"
            )

        t0 = time.perf_counter()

        # The detector expects a DataFrame — wrap single observation
        import pandas as pd
        df = pd.DataFrame([sensor_vector], columns=self._feature_cols)
        result_df = self._anomaly_detector.predict(df, self._feature_cols)

        anomaly_score = float(result_df["anomaly_score"].iloc[0])
        severity = str(result_df["severity"].iloc[0])

        # Extract component scores if available
        if_score = float(result_df.get("if_score", pd.Series([anomaly_score])).iloc[0])
        ae_error  = float(result_df.get("ae_reconstruction_error", pd.Series([0.0])).iloc[0])

        elapsed_ms = (time.perf_counter() - t0) * 1000

        recommendation = self._severity_to_recommendation(severity)
        logger.debug("Anomaly score: %.3f [%s] | %.1f ms", anomaly_score, severity, elapsed_ms)
        return anomaly_score, if_score, ae_error, severity, recommendation

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _rul_to_severity(rul: float) -> str:
        if rul <= 10:
            return "critical"
        if rul <= 30:
            return "warning"
        return "normal"

    @staticmethod
    def _severity_to_recommendation(severity: str) -> str:
        return {
            "critical": (
                "IMMEDIATE ACTION REQUIRED: Schedule maintenance within 24 hours. "
                "Engine is at high risk of failure."
            ),
            "warning": (
                "Schedule inspection within 72 hours. "
                "Monitor degradation sensors closely."
            ),
            "normal": (
                "Engine operating within normal parameters. "
                "Continue scheduled monitoring intervals."
            ),
        }.get(severity, "Consult maintenance team.")

    @staticmethod
    def preprocess_sequence(
        raw_sequence: List[List[float]],
        feature_cols: List[str],
    ) -> np.ndarray:
        """
        Convert a raw list of sensor observation lists into a numpy array.

        Args:
            raw_sequence: List of sensor value lists — each inner list has len(feature_cols) values.
            feature_cols: Feature column names (for shape validation).

        Returns:
            numpy array of shape (seq_len, n_features)
        """
        arr = np.array(raw_sequence, dtype=np.float32)
        if arr.ndim != 2 or arr.shape[1] != len(feature_cols):
            raise ValueError(
                f"Expected sequence shape (*, {len(feature_cols)}), got {arr.shape}"
            )
        return arr
