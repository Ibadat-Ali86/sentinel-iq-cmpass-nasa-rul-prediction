"""
SentinelIQ — Model Evaluator
=============================

Computes regression metrics, NASA scoring function, and model comparison
summaries for RUL prediction models.

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from typing import Dict, List

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

logger = logging.getLogger(__name__)


class ModelEvaluator:
    """
    Evaluates trained RUL prediction models on the test set.

    Metrics computed:
    - RMSE  — Root Mean Squared Error (primary metric in literature)
    - MAE   — Mean Absolute Error
    - R²    — Coefficient of determination
    - Score — NASA asymmetric scoring function (penalises late predictions more)

    NASA Score Formula:
        s_i = exp(-d/13) - 1  if d < 0  (early prediction)
        s_i = exp(d/10)  - 1  if d >= 0 (late prediction — penalised harder)
        Score = Σ s_i

    Usage:
        evaluator = ModelEvaluator()
        metrics = evaluator.evaluate(model, test_loader, true_rul)
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def evaluate(
        self,
        model: nn.Module,
        test_loader: DataLoader,
        true_rul: np.ndarray,
        model_name: str = "Model",
    ) -> Dict[str, float]:
        """
        Run full evaluation on a test DataLoader.

        Args:
            model:      Trained PyTorch model (single output).
            test_loader: DataLoader yielding (sequences, targets) pairs.
            true_rul:    Ground truth RUL values (numpy array).
            model_name:  Name for logging.

        Returns:
            Dict with keys: RMSE, MAE, R2, NASA_Score.
        """
        predictions = self._predict(model, test_loader)

        rmse = float(np.sqrt(np.mean((predictions - true_rul) ** 2)))
        mae = float(np.mean(np.abs(predictions - true_rul)))
        r2 = float(1 - np.sum((true_rul - predictions) ** 2) / np.sum((true_rul - np.mean(true_rul)) ** 2))
        score = float(self._nasa_score(predictions, true_rul))

        metrics = {"RMSE": rmse, "MAE": mae, "R2": r2, "NASA_Score": score}

        logger.info("─" * 50)
        logger.info("%-20s Results", model_name)
        logger.info("─" * 50)
        logger.info("  RMSE:       %.4f cycles", rmse)
        logger.info("  MAE:        %.4f cycles", mae)
        logger.info("  R²:         %.4f", r2)
        logger.info("  NASA Score: %.2f", score)
        logger.info("─" * 50)

        return metrics

    def compare_models(self, results: Dict[str, Dict[str, float]]) -> str:
        """
        Log a comparison table for multiple models.

        Args:
            results: Dict of {model_name: metrics_dict}.

        Returns:
            Name of the best model (lowest RMSE).
        """
        logger.info("=" * 60)
        logger.info("MODEL COMPARISON")
        logger.info("=" * 60)
        logger.info("%-20s %8s %8s %8s %12s", "Model", "RMSE", "MAE", "R²", "NASA_Score")
        logger.info("-" * 60)

        best_name = min(results, key=lambda k: results[k]["RMSE"])
        for name, m in results.items():
            marker = " ← BEST" if name == best_name else ""
            logger.info(
                "%-20s %8.3f %8.3f %8.4f %12.1f%s",
                name, m["RMSE"], m["MAE"], m["R2"], m["NASA_Score"], marker,
            )

        logger.info("=" * 60)
        return best_name

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _predict(self, model: nn.Module, loader: DataLoader) -> np.ndarray:
        """Run inference and collect predictions as a numpy array."""
        model.eval()
        all_preds: List[np.ndarray] = []
        with torch.no_grad():
            for sequences, _ in loader:
                preds = model(sequences.to(self.device))
                all_preds.append(preds.cpu().numpy())
        return np.concatenate(all_preds)

    @staticmethod
    def _nasa_score(predictions: np.ndarray, targets: np.ndarray) -> float:
        """
        Compute NASA's asymmetric scoring function.

        Penalises late predictions (positive error) more heavily than
        early predictions (negative error) — reflecting that predicting
        failure too late is more dangerous than predicting it too early.
        """
        d = predictions - targets
        scores = np.where(d < 0, np.exp(-d / 13) - 1, np.exp(d / 10) - 1)
        return float(np.sum(scores))


# Alias for __init__.py re-export
Evaluator = ModelEvaluator
