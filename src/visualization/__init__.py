"""
SentinelIQ src/visualization sub-package.

Generates and saves model performance figures to reports/figures/.
All functions save to disk; they do NOT call plt.show() to remain
headless-compatible (no display required in CI/CD).
"""
from __future__ import annotations

from src.visualization.visualize import (  # noqa: F401
    plot_rul_prediction,
    plot_shap_summary,
    plot_sensor_heatmap,
)

__all__ = ["plot_rul_prediction", "plot_shap_summary", "plot_sensor_heatmap"]
