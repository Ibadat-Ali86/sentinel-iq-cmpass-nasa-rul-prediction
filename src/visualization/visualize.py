"""
SentinelIQ — Visualization Module
====================================

Generates and saves model performance figures to reports/figures/.

All functions:
- Save to disk at the given path (150 DPI PNG)
- Do NOT call plt.show() — headless-compatible for CI/CD
- Return the file path of the saved figure for chaining

Author: SentinelIQ Team
Version: 2.0
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

import matplotlib
matplotlib.use("Agg")  # Headless backend — no display required

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_FIGURES_DIR = Path("reports/figures")


def plot_rul_prediction(
    true_rul: np.ndarray,
    predicted_rul: np.ndarray,
    model_name: str = "TCN",
    save_path: Optional[Path] = None,
) -> Path:
    """
    Plot actual vs predicted RUL for the test set.

    Args:
        true_rul:      Ground truth RUL values (n_samples,).
        predicted_rul: Model predictions (n_samples,).
        model_name:    Label for the plot title.
        save_path:     Where to save PNG (default: reports/figures/rul_prediction.png).

    Returns:
        Path to the saved figure.
    """
    save_path = Path(save_path or _FIGURES_DIR / "rul_prediction_vs_actual.png")
    save_path.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(true_rul, label="True RUL", alpha=0.7, linewidth=1)
    ax.plot(predicted_rul, label=f"Predicted ({model_name})", alpha=0.7, linewidth=1)
    ax.set_xlabel("Engine Unit Index")
    ax.set_ylabel("RUL (cycles)")
    ax.set_title(f"RUL Prediction vs Actual — {model_name} on NASA C-MAPSS FD001")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close(fig)
    logger.info("RUL prediction plot saved → %s", save_path)
    return save_path


def plot_shap_summary(
    shap_values: np.ndarray,
    feature_names: List[str],
    save_path: Optional[Path] = None,
) -> Path:
    """
    Plot SHAP summary bar chart (mean absolute SHAP per feature).

    Args:
        shap_values:   SHAP values array of shape (n_samples, n_features).
        feature_names: List of feature names matching columns in shap_values.
        save_path:     Output path (default: reports/figures/shap_summary.png).

    Returns:
        Path to the saved figure.
    """
    save_path = Path(save_path or _FIGURES_DIR / "shap_summary.png")
    save_path.parent.mkdir(parents=True, exist_ok=True)

    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    order = np.argsort(mean_abs_shap)[::-1]

    fig, ax = plt.subplots(figsize=(8, max(4, len(feature_names) * 0.4)))
    ax.barh(
        [feature_names[i] for i in order[::-1]],
        mean_abs_shap[order[::-1]],
        color="#2563EB",
        alpha=0.85,
    )
    ax.set_xlabel("Mean |SHAP Value|")
    ax.set_title("SHAP Feature Importance — SentinelIQ TCN")
    ax.grid(True, axis="x", alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info("SHAP summary plot saved → %s", save_path)
    return save_path


def plot_sensor_heatmap(
    df: pd.DataFrame,
    feature_cols: List[str],
    unit_id: int = 1,
    save_path: Optional[Path] = None,
) -> Path:
    """
    Plot sensor correlation heatmap for a specific engine unit.

    Args:
        df:           Training DataFrame with sensor columns.
        feature_cols: Sensor columns to include in the heatmap.
        unit_id:      Engine unit to filter data for.
        save_path:    Output path (default: reports/figures/eda_sensor_correlation.png).

    Returns:
        Path to the saved figure.
    """
    save_path = Path(save_path or _FIGURES_DIR / "eda_sensor_correlation.png")
    save_path.parent.mkdir(parents=True, exist_ok=True)

    unit_df = df[df["unit_id"] == unit_id][feature_cols]
    corr = unit_df.corr()

    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(corr, cmap="coolwarm", vmin=-1, vmax=1)
    plt.colorbar(im, ax=ax)
    ax.set_xticks(range(len(feature_cols)))
    ax.set_yticks(range(len(feature_cols)))
    ax.set_xticklabels(feature_cols, rotation=45, ha="right", fontsize=8)
    ax.set_yticklabels(feature_cols, fontsize=8)
    ax.set_title(f"Sensor Correlation Heatmap — Engine Unit {unit_id}")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info("Sensor heatmap saved → %s", save_path)
    return save_path
