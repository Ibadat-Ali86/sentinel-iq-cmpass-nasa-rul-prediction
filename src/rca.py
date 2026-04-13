"""
SentinelIQ — Root Cause Analysis Engine
=========================================

When a failure is predicted, this module:
  1. Ranks the top contributing sensors via SHAP values
  2. Extracts the degradation signature (last 50 cycles)
  3. Matches against a historical failure pattern library via DTW distance
  4. Generates a natural-language RCA report

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# Component descriptions for natural-language generation
_COMPONENT_DESCRIPTIONS: Dict[str, str] = {
    "HPC_degradation":    "High Pressure Compressor degradation",
    "LPT_erosion":        "Low Pressure Turbine erosion",
    "fan_bearing_wear":   "Fan bearing wear",
    "seal_leakage":       "Seal leakage (combustor or turbine)",
    "compressor_fouling": "Compressor blade fouling",
    "unknown":            "Unknown failure mode",
}

_RECOMMENDED_ACTIONS: Dict[str, str] = {
    "HPC_degradation":    "Borescope inspection of HPC stages. Check for erosion, deposits, or damage.",
    "LPT_erosion":        "Inspect LPT blades for erosion. Plan blade replacement.",
    "fan_bearing_wear":   "Vibration analysis and oil debris monitoring. Schedule bearing replacement.",
    "seal_leakage":       "Leak detection test on combustor and turbine seals. Prepare seal kit.",
    "compressor_fouling": "Engine wash. Inspect IGV and compressor stages for deposits.",
    "unknown":            "Escalate to engineering team for manual inspection.",
}


@dataclass
class PatternMatch:
    """A single match from the failure pattern library."""
    pattern_id: str
    failure_mode: str
    similarity_score: float  # 0–1, higher is more similar (1 - normalized DTW)
    description: str


@dataclass
class RCAResult:
    """Full output of a root cause analysis run."""
    top_sensors: List[Tuple[str, float]]  # [(sensor_name, shap_value), ...]
    similar_patterns: List[PatternMatch]
    predicted_failure_mode: str
    recommended_action: str
    report: str


class RootCauseAnalyzer:
    """
    Root Cause Analyzer using SHAP values + DTW pattern matching.

    Args:
        failure_library: List of dicts, each with keys:
            - pattern_id:   str
            - failure_mode: str (one of the 5 C-MAPSS modes)
            - signature:    np.ndarray of shape (window_size, n_sensors)
            - description:  str
    """

    def __init__(
        self,
        failure_library: List[Dict[str, Any]],
        dtw_threshold: float = 0.3,
        top_n_sensors: int = 3,
        top_n_matches: int = 3,
    ):
        self.failure_library = failure_library
        self.dtw_threshold = dtw_threshold
        self.top_n_sensors = top_n_sensors
        self.top_n_matches = top_n_matches

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def analyze(
        self,
        sensor_signature: np.ndarray,       # shape (window_size, n_sensors)
        shap_values: np.ndarray,            # shape (n_sensors,) or (window_size, n_sensors)
        feature_names: List[str],
        failure_mode_prediction: str = "unknown",
        unit_id: Optional[str] = None,
        rul: Optional[float] = None,
    ) -> RCAResult:
        """
        Run full root cause analysis.

        Args:
            sensor_signature:       Last window_size cycles of sensor data.
            shap_values:            SHAP feature importance values.
            feature_names:          Names corresponding to SHAP values.
            failure_mode_prediction: Predicted failure mode (from MultiTaskTCN).
            unit_id:                Asset identifier (for report header).
            rul:                    Predicted RUL (cycles).

        Returns:
            RCAResult with sensors, pattern matches, action, and formatted report.
        """
        # 1. Rank sensors by absolute SHAP
        if shap_values.ndim > 1:
            shap_values = np.mean(np.abs(shap_values), axis=0)
        top_sensors = self._rank_sensors(shap_values, feature_names)

        # 2. DTW-based pattern matching
        similar_patterns = self._match_patterns(sensor_signature)

        # 3. Recommended action
        action = _RECOMMENDED_ACTIONS.get(
            failure_mode_prediction, _RECOMMENDED_ACTIONS["unknown"]
        )

        # 4. Generate report
        report = self.generate_report(
            top_sensors=top_sensors,
            similar_patterns=similar_patterns,
            failure_mode=failure_mode_prediction,
            recommended_action=action,
            unit_id=unit_id,
            rul=rul,
        )

        return RCAResult(
            top_sensors=top_sensors,
            similar_patterns=similar_patterns,
            predicted_failure_mode=failure_mode_prediction,
            recommended_action=action,
            report=report,
        )

    def generate_report(
        self,
        top_sensors: List[Tuple[str, float]],
        similar_patterns: List[PatternMatch],
        failure_mode: str,
        recommended_action: str,
        unit_id: Optional[str] = None,
        rul: Optional[float] = None,
    ) -> str:
        """Format a human-readable root cause analysis report."""
        header = f"Unit {unit_id}" if unit_id else "Asset"
        rul_str = f"{rul:.0f} cycles" if rul is not None else "unknown"
        mode_desc = _COMPONENT_DESCRIPTIONS.get(failure_mode, failure_mode)

        lines = [
            "=" * 65,
            f"ROOT CAUSE ANALYSIS — {header}",
            "=" * 65,
            f"Predicted RUL : {rul_str}",
            f"Failure Mode  : {mode_desc}",
            "",
            "Contributing Sensors (SHAP Analysis):",
            "-" * 40,
        ]
        for rank, (sensor, value) in enumerate(top_sensors, 1):
            direction = "↑ elevated" if value > 0 else "↓ reduced"
            lines.append(f"  {rank}. {sensor:<20} SHAP={value:+.4f}  ({direction})")

        lines += ["", "Similar Historical Failures (DTW Matching):", "-" * 40]
        if similar_patterns:
            for p in similar_patterns:
                lines.append(
                    f"  • {p.pattern_id}: {p.description}  "
                    f"(similarity={p.similarity_score:.2f})"
                )
        else:
            lines.append("  No close historical matches found.")

        lines += [
            "",
            "Recommended Action:",
            "-" * 40,
            f"  {recommended_action}",
            "=" * 65,
        ]

        report = "\n".join(lines)
        logger.info("RCA Report generated for %s", unit_id or "asset")
        return report

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _rank_sensors(
        self, shap_values: np.ndarray, feature_names: List[str]
    ) -> List[Tuple[str, float]]:
        """Return top_n sensors sorted by absolute SHAP value (descending)."""
        pairs = sorted(
            zip(feature_names, shap_values),
            key=lambda kv: abs(kv[1]),
            reverse=True,
        )
        return pairs[: self.top_n_sensors]

    def _dtw_distance(self, seq_a: np.ndarray, seq_b: np.ndarray) -> float:
        """
        Fast DTW using dtaidistance if available, else simple Euclidean fallback.

        Flattens multi-variate sequences to 1D before comparison.
        """
        a = seq_a.flatten().astype(np.float64)
        b = seq_b.flatten().astype(np.float64)

        try:
            from dtaidistance import dtw as dtw_lib
            return float(dtw_lib.distance_fast(a, b))
        except ImportError:
            # Euclidean fallback (less accurate but functional)
            min_len = min(len(a), len(b))
            return float(np.sqrt(np.sum((a[:min_len] - b[:min_len]) ** 2)))

    def _match_patterns(
        self, sensor_signature: np.ndarray
    ) -> List[PatternMatch]:
        """Match sensor_signature against the failure library via DTW."""
        if not self.failure_library:
            return []

        distances = []
        for entry in self.failure_library:
            dist = self._dtw_distance(sensor_signature, np.array(entry["signature"]))
            distances.append((entry, dist))

        distances.sort(key=lambda x: x[1])

        # Normalise distances to similarity scores [0, 1]
        max_dist = max(d for _, d in distances) + 1e-8
        matches = []
        for entry, dist in distances[: self.top_n_matches]:
            similarity = 1.0 - (dist / max_dist)
            if dist <= self.dtw_threshold or len(matches) == 0:  # Always include best
                matches.append(
                    PatternMatch(
                        pattern_id=entry.get("pattern_id", "?"),
                        failure_mode=entry.get("failure_mode", "unknown"),
                        similarity_score=round(similarity, 3),
                        description=entry.get("description", ""),
                    )
                )

        return matches
