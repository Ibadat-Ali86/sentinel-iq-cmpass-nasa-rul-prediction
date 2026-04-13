"""
SentinelIQ — Drift Monitoring Module
======================================

Detects when production data deviates from the training distribution,
signalling that the model may be going stale.

Two statistical tests per feature:
  1. PSI  (Population Stability Index) — industry-standard drift measure
  2. KS   (Kolmogorov-Smirnov test)   — non-parametric distribution test

Severity classification:
  PSI < 0.1             → STABLE
  0.1 ≤ PSI < 0.25      → MODERATE drift
  PSI ≥ 0.25            → SEVERE drift (flag for retraining)

Auto-retraining trigger: 2+ features with PSI > 0.25 OR p_value < 0.05.

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)

# PSI severity thresholds (industry standard)
_PSI_STABLE = 0.1
_PSI_ALERT = 0.25


class DriftMonitor:
    """
    Feature-level drift detector using PSI and the KS test.

    Usage:
        monitor = DriftMonitor(reference_data=train_df[feature_cols], features=feature_cols)
        drift_results = monitor.check_drift(current_batch_df[feature_cols])
        report = monitor.generate_drift_report(drift_results)
    """

    def __init__(self, reference_data: pd.DataFrame, features: List[str]):
        self.features = features
        self._ref_data = reference_data[features].values
        logger.info(
            "DriftMonitor initialised — %d features | %d reference samples",
            len(features), len(self._ref_data),
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def check_drift(self, current_data: pd.DataFrame) -> Dict[str, dict]:
        """
        Compute PSI and KS statistic for every feature against the reference.

        Args:
            current_data: DataFrame with the same feature columns as reference.

        Returns:
            Dict keyed by feature name, each value is:
            {
                "psi": float,
                "ks_stat": float,
                "ks_pvalue": float,
                "drift_detected": bool,
                "severity": "STABLE" | "MODERATE" | "SEVERE",
            }
        """
        results: Dict[str, dict] = {}
        X_current = current_data[self.features].values

        for i, feature in enumerate(self.features):
            ref_col = self._ref_data[:, i]
            cur_col = X_current[:, i]

            psi = self.calculate_psi(ref_col, cur_col)
            ks_stat, ks_pvalue = self.calculate_ks_statistic(ref_col, cur_col)

            drift_detected = psi >= _PSI_ALERT or ks_pvalue < 0.05
            severity = (
                "SEVERE" if psi >= _PSI_ALERT
                else "MODERATE" if psi >= _PSI_STABLE
                else "STABLE"
            )

            results[feature] = {
                "psi": round(psi, 4),
                "ks_stat": round(ks_stat, 4),
                "ks_pvalue": round(ks_pvalue, 6),
                "drift_detected": drift_detected,
                "severity": severity,
            }

        n_drifted = sum(1 for v in results.values() if v["drift_detected"])
        logger.info(
            "Drift check complete — %d / %d features drifted",
            n_drifted, len(self.features),
        )
        return results

    def calculate_psi(self, reference: np.ndarray, current: np.ndarray, bins: int = 10) -> float:
        """
        Population Stability Index (PSI).

        PSI = Σ (actual_% - expected_%) × ln(actual_% / expected_%)

        Interprets how much the distribution of `current` has shifted
        relative to `reference`. Uses quantile-based binning to handle
        non-uniform distributions.
        """
        # Bin edges from reference distribution
        breakpoints = np.nanpercentile(reference, np.linspace(0, 100, bins + 1))
        breakpoints = np.unique(breakpoints)

        def _bin_counts(data: np.ndarray) -> np.ndarray:
            counts = np.histogram(data, bins=breakpoints)[0]
            freqs = counts / (len(data) + 1e-10)
            return np.clip(freqs, 1e-6, None)  # Avoid log(0)

        ref_freq = _bin_counts(reference)
        cur_freq = _bin_counts(current)

        # Normalise both to sum to 1
        ref_freq /= ref_freq.sum()
        cur_freq /= cur_freq.sum()

        psi = float(np.sum((cur_freq - ref_freq) * np.log(cur_freq / ref_freq)))
        return abs(psi)

    def calculate_ks_statistic(
        self, reference: np.ndarray, current: np.ndarray
    ) -> Tuple[float, float]:
        """
        Two-sample Kolmogorov-Smirnov test.

        Returns (statistic, p_value).
        Low p_value (< 0.05) → distributions are significantly different.
        """
        stat, pvalue = stats.ks_2samp(reference, current)
        return float(stat), float(pvalue)

    def generate_drift_report(self, drift_results: Dict[str, dict]) -> str:
        """
        Generate a human-readable drift monitoring report.

        Returns:
            Formatted string report with severity classification.
        """
        n_total = len(drift_results)
        n_severe = sum(1 for v in drift_results.values() if v["severity"] == "SEVERE")
        n_moderate = sum(1 for v in drift_results.values() if v["severity"] == "MODERATE")
        n_drifted = n_severe + n_moderate

        pct_drifted = 100 * n_drifted / n_total
        if n_severe > 0 or pct_drifted > 30:
            overall = "CRITICAL"
        elif pct_drifted > 10:
            overall = "WARNING"
        else:
            overall = "NORMAL"

        lines = [
            "=" * 60,
            "DRIFT MONITORING REPORT",
            "=" * 60,
            f"Overall Status : {overall}",
            f"Features Checked: {n_total}",
            f"Drifted (SEVERE): {n_severe}",
            f"Drifted (MODERATE): {n_moderate}",
            "-" * 60,
            f"{'Feature':<20} {'PSI':>8} {'KS stat':>10} {'Status':>10}",
            "-" * 60,
        ]

        for feat, vals in drift_results.items():
            lines.append(
                f"{feat:<20} {vals['psi']:>8.4f} {vals['ks_stat']:>10.4f} {vals['severity']:>10}"
            )

        if overall in ("CRITICAL", "WARNING"):
            lines += [
                "=" * 60,
                "⚠  ACTION REQUIRED: Consider model retraining.",
                "=" * 60,
            ]

        report = "\n".join(lines)
        logger.info("%s", report)
        return report
