"""
SentinelIQ — SHAP Explainability Module
=========================================

Wraps SHAP's DeepExplainer to provide per-prediction feature importances
for TCN and LSTM models.

Outputs:
  - SHAP values per sensor per prediction
  - Top-N contributing sensors (by absolute value)
  - Waterfall plot export (saved to outputs/)

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """
    SHAP DeepExplainer wrapper for PyTorch sequence models.

    Args:
        model:           Trained PyTorch model (LSTM or TCN).
        background_data: Tensor of background samples (100 random training sequences).
        feature_names:   List of sensor names (for labels in plots).
        output_dir:      Directory to save waterfall plot images.

    Performance target: < 500ms per prediction.
    """

    def __init__(
        self,
        model: nn.Module,
        background_data: torch.Tensor,
        feature_names: Optional[List[str]] = None,
        output_dir: Optional[Path] = None,
    ):
        self.model = model
        self.model.eval()
        self.feature_names = feature_names or [f"sensor_{i}" for i in range(background_data.shape[-1])]
        self.output_dir = output_dir or Path("./outputs")
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Limit background to 100 samples for speed
        if len(background_data) > 100:
            idx = np.random.choice(len(background_data), 100, replace=False)
            background_data = background_data[idx]

        try:
            import shap
            self._explainer = shap.DeepExplainer(model, background_data)
            self._shap_available = True
            logger.info("SHAPExplainer — DeepExplainer initialised with %d background samples.", len(background_data))
        except ImportError:
            logger.warning("SHAP not installed — explainer will return zero values. Install: pip install shap==0.42.1")
            self._shap_available = False
            self._explainer = None

    def explain_prediction(
        self, input_sequence: torch.Tensor
    ) -> Tuple[np.ndarray, List[Tuple[str, float]]]:
        """
        Compute SHAP values for a single input sequence.

        Args:
            input_sequence: Tensor of shape (1, seq_len, n_features).

        Returns:
            (shap_values, top_sensors)
            - shap_values: np.ndarray of shape (seq_len, n_features)
            - top_sensors: list of (sensor_name, mean_abs_shap) sorted descending, top 5
        """
        if not self._shap_available:
            n = len(self.feature_names)
            shap_vals = np.zeros((input_sequence.shape[1], n))
            return shap_vals, [(self.feature_names[i], 0.0) for i in range(min(5, n))]

        import shap  # noqa: F401
        shap_values = self._explainer.shap_values(input_sequence)

        # For regression: shap_values is a list of length 1
        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        # shap_values shape: (1, seq_len, n_features) → squeeze batch dim
        sv = np.squeeze(shap_values, axis=0)  # (seq_len, n_features)

        # Aggregate over time dimension
        mean_abs = np.mean(np.abs(sv), axis=0)  # (n_features,)
        top_indices = np.argsort(mean_abs)[::-1][:5]
        top_sensors = [(self.feature_names[i], float(mean_abs[i])) for i in top_indices]

        return sv, top_sensors

    def explain_batch(
        self, input_sequences: torch.Tensor
    ) -> Tuple[np.ndarray, List[Tuple[str, float]]]:
        """
        Compute and average SHAP values over a batch of sequences.

        Args:
            input_sequences: Tensor of shape (batch, seq_len, n_features).

        Returns:
            (mean_shap_values, top_sensors) averaged across the batch.
        """
        if not self._shap_available:
            n = len(self.feature_names)
            return np.zeros(n), [(self.feature_names[i], 0.0) for i in range(min(5, n))]

        import shap  # noqa: F401
        shap_values = self._explainer.shap_values(input_sequences)
        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        # Average absolute SHAP over batch and time: → (n_features,)
        mean_abs = np.mean(np.abs(shap_values), axis=(0, 1))

        top_indices = np.argsort(mean_abs)[::-1][:5]
        top_sensors = [(self.feature_names[i], float(mean_abs[i])) for i in top_indices]

        return mean_abs, top_sensors

    def plot_waterfall(
        self,
        shap_values: np.ndarray,
        filename: str = "shap_waterfall.png",
    ) -> Optional[Path]:
        """
        Save a SHAP waterfall plot to the outputs directory.

        Args:
            shap_values: 1D numpy array of length n_features.
            filename:    Output filename.

        Returns:
            Path to saved image, or None if SHAP unavailable.
        """
        if not self._shap_available:
            logger.warning("SHAP not available — skipping waterfall plot.")
            return None

        try:
            import shap
            import matplotlib.pyplot as plt

            explanation = shap.Explanation(
                values=shap_values,
                feature_names=self.feature_names,
            )
            shap.plots.waterfall(explanation, show=False)
            save_path = self.output_dir / filename
            plt.savefig(save_path, dpi=150, bbox_inches="tight")
            plt.close()
            logger.info("Waterfall plot saved to %s", save_path)
            return save_path
        except Exception as exc:
            logger.warning("Waterfall plot failed: %s", exc)
            return None

    def feature_importance_dict(self, shap_values: np.ndarray) -> Dict[str, float]:
        """Return {sensor_name: mean_abs_shap} for all features."""
        if shap_values.ndim > 1:
            agg = np.mean(np.abs(shap_values), axis=0)
        else:
            agg = np.abs(shap_values)
        return {name: float(val) for name, val in zip(self.feature_names, agg)}
