"""
SentinelIQ — Feature Engineering Module
========================================

Handles RUL computation, capping, operating-condition clustering,
constant-sensor removal, and StandardScaler normalization.

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    End-to-end feature engineering pipeline for the C-MAPSS dataset.

    Steps (in order via `process()`):
    1. Compute RUL (max_cycle − current_cycle) for training data
    2. Cap RUL at `rul_cap` using piece-wise linear approach
    3. Cluster operating conditions via K-Means (handles multi-regime datasets)
    4. Remove constant / near-zero-variance sensors
    5. StandardScaler normalisation (fit on train, transform test)

    Attributes:
        scaler: Fitted StandardScaler (available after process() is called).
        feature_cols: List of sensor column names used as model input.
        op_kmeans: Fitted KMeans for operating-condition clusters (or None).
    """

    def __init__(
        self,
        rul_cap: int = 125,
        variance_threshold: float = 1e-6,
        n_operating_clusters: int = 6,
        random_seed: int = 42,
    ):
        self.rul_cap = rul_cap
        self.variance_threshold = variance_threshold
        self.n_operating_clusters = n_operating_clusters
        self.random_seed = random_seed

        # Fitted objects (populated during process())
        self.scaler: Optional[StandardScaler] = None
        self.feature_cols: Optional[List[str]] = None
        self.op_kmeans: Optional[KMeans] = None
        self._constant_sensors: List[str] = []

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def process(
        self,
        train_df: pd.DataFrame,
        test_df: pd.DataFrame,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, List[str]]:
        """
        Run the full feature engineering pipeline.

        Args:
            train_df: Raw training DataFrame (from CMAPSSLoader).
            test_df:  Raw test DataFrame.

        Returns:
            (train_df, test_df, feature_cols)
            - Both DataFrames have RUL, RUL_capped, op_cluster columns added.
            - Sensor columns are normalised (z-score).
            - feature_cols: final list of sensor names to use as model input.
        """
        logger.info("=" * 60)
        logger.info("Feature Engineering Pipeline — Starting")
        logger.info("=" * 60)

        train_df = self.compute_rul(train_df)
        train_df = self.cap_rul(train_df)
        train_df, test_df = self._cluster_operating_conditions(train_df, test_df)
        train_df, test_df = self.remove_constant_sensors(train_df, test_df)
        train_df, test_df = self.normalize(train_df, test_df)

        logger.info(
            "Feature Engineering — Done. %d sensor features selected.",
            len(self.feature_cols),
        )
        return train_df, test_df, self.feature_cols

    def compute_rul(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Compute Remaining Useful Life for training data.

        RUL = max_cycle_for_unit − current_cycle

        This is possible for training data because each engine runs to failure.
        Test data RUL must be predicted by the model.
        """
        df = df.copy()
        max_cycles = df.groupby("unit_id")["cycle"].transform("max")
        df["RUL"] = (max_cycles - df["cycle"]).astype("int32")
        logger.info("RUL computed — range: [%d, %d]", df["RUL"].min(), df["RUL"].max())
        return df

    def cap_rul(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply piece-wise linear RUL capping at `self.rul_cap` cycles.

        Rationale:
        - Early-lifecycle RUL values (e.g. 300 cycles) are all "healthy".
        - Treating RUL=300 differently from RUL=200 misleads the model.
        - Capping creates a flat "healthy" plateau, then linear degradation.

        Reference: Heimes (2008) — standard approach in CMAPSS literature.
        """
        df = df.copy()
        df["RUL_capped"] = df["RUL"].clip(upper=self.rul_cap).astype("int32")
        n_affected = (df["RUL"] != df["RUL_capped"]).sum()
        logger.info(
            "RUL capped at %d — %d rows affected (%.1f%%)",
            self.rul_cap,
            n_affected,
            100 * n_affected / len(df),
        )
        return df

    def remove_constant_sensors(
        self, train_df: pd.DataFrame, test_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Drop sensor columns whose variance in the training set is below
        `self.variance_threshold`.

        CMAPSS FD001 constants: sensor_1, sensor_5, sensor_10, sensor_16,
        sensor_18, sensor_19 — all near zero variance.
        """
        sensor_cols = [c for c in train_df.columns if c.startswith("sensor_")]
        self._constant_sensors = [
            c for c in sensor_cols if train_df[c].var() < self.variance_threshold
        ]

        if self._constant_sensors:
            logger.info(
                "Dropping %d constant sensors: %s",
                len(self._constant_sensors),
                self._constant_sensors,
            )
            train_df = train_df.drop(columns=self._constant_sensors)
            test_df = test_df.drop(columns=self._constant_sensors)

        return train_df, test_df

    def normalize(
        self, train_df: pd.DataFrame, test_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Z-score normalise sensor features.

        - Scaler is fitted on training data ONLY (no data leakage).
        - Operating condition columns (op_setting_*) and identifiers
          (unit_id, cycle, RUL, RUL_capped, dataset_id, op_cluster) are excluded.
        """
        exclude = {
            "unit_id", "cycle", "RUL", "RUL_capped",
            "dataset_id", "op_cluster",
            "op_setting_1", "op_setting_2", "op_setting_3",
        }
        self.feature_cols = [c for c in train_df.columns if c not in exclude]

        logger.info("Normalising %d sensor features ...", len(self.feature_cols))
        self.scaler = StandardScaler()
        train_df = train_df.copy()
        test_df = test_df.copy()
        train_df[self.feature_cols] = self.scaler.fit_transform(train_df[self.feature_cols])
        test_df[self.feature_cols] = self.scaler.transform(test_df[self.feature_cols])

        logger.info(
            "Normalisation complete — Mean: %.4f | Std: %.4f",
            train_df[self.feature_cols].mean().mean(),
            train_df[self.feature_cols].std().mean(),
        )
        return train_df, test_df

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _cluster_operating_conditions(
        self, train_df: pd.DataFrame, test_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Cluster [op_setting_1, op_setting_2, op_setting_3] via K-Means.

        Rationale:
        - FD002/FD004 have 6 distinct operating regimes (altitude + throttle combos).
        - Same raw sensor value means different things in different regimes.
        - Assigning cluster membership lets the model condition on regime.
        - FD001/FD003 have a single regime → all assigned cluster 0, no K-Means run.

        Fitting is done on training data; test data uses `predict()` (no leakage).
        """
        op_cols = ["op_setting_1", "op_setting_2", "op_setting_3"]

        # Check if operating conditions have meaningful variance
        if train_df[op_cols].std().sum() < 1e-3:
            logger.info("Single operating condition detected — skipping clustering.")
            train_df = train_df.copy()
            test_df = test_df.copy()
            train_df["op_cluster"] = 0
            test_df["op_cluster"] = 0
            return train_df, test_df

        logger.info(
            "Clustering operating conditions into %d regimes ...",
            self.n_operating_clusters,
        )
        self.op_kmeans = KMeans(
            n_clusters=self.n_operating_clusters,
            random_state=self.random_seed,
            n_init=10,
        )
        train_df = train_df.copy()
        test_df = test_df.copy()
        train_df["op_cluster"] = self.op_kmeans.fit_predict(train_df[op_cols])
        test_df["op_cluster"] = self.op_kmeans.predict(test_df[op_cols])

        dist = train_df["op_cluster"].value_counts().sort_index().to_dict()
        logger.info("Cluster distribution: %s", dist)
        return train_df, test_df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s — %(message)s")
    print("FeatureEngineer module ready. Import via: from src.features import FeatureEngineer")
