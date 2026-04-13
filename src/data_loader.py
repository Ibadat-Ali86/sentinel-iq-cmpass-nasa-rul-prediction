"""
SentinelIQ — NASA C-MAPSS Data Loader
======================================

Handles loading, validation, and memory optimization for the
NASA C-MAPSS turbofan engine degradation dataset (FD001–FD004).

Dataset source: https://www.kaggle.com/datasets/behrad3d/nasa-cmaps
Place raw .txt files in: data/raw/

Author: SentinelIQ Team
Version: 2.0
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Standard column schema for all CMAPSS files
_COLUMN_NAMES: List[str] = (
    ["unit_id", "cycle", "op_setting_1", "op_setting_2", "op_setting_3"]
    + [f"sensor_{i}" for i in range(1, 22)]
)


class CMAPSSLoader:
    """
    Handles loading and initial validation of the NASA C-MAPSS dataset.

    Responsibilities:
    - Read space-delimited .txt files into DataFrames
    - Assign proper column names
    - Optimize memory via dtype casting (50% reduction)
    - Validate data integrity (missing values, sensor count, RUL alignment)
    - Support loading single datasets (FD001–FD004) or all four at once

    Usage:
        loader = CMAPSSLoader(data_dir=Path("./data/raw"))
        train_df, test_df, rul_df = loader.load_single_dataset("FD001")
    """

    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.column_names = _COLUMN_NAMES

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    def load_single_dataset(
        self, name: str
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Load one CMAPSS dataset (e.g. "FD001") from disk.

        Args:
            name: Dataset identifier — "FD001", "FD002", "FD003", or "FD004".

        Returns:
            Tuple of (train_df, test_df, rul_df).

        Raises:
            FileNotFoundError: If any of the three required .txt files are missing.
            ValueError: If data validation checks fail.
        """
        logger.info("Loading %s ...", name)

        train_path = self.data_dir / f"train_{name}.txt"
        test_path = self.data_dir / f"test_{name}.txt"
        rul_path = self.data_dir / f"RUL_{name}.txt"

        for path in (train_path, test_path, rul_path):
            if not path.exists():
                raise FileNotFoundError(
                    f"Missing required file: {path}\n"
                    f"Download the dataset from Kaggle and place files in {self.data_dir}"
                )

        train_df = pd.read_csv(train_path, sep=r"\s+", header=None, names=self.column_names)
        test_df = pd.read_csv(test_path, sep=r"\s+", header=None, names=self.column_names)
        rul_df = pd.read_csv(rul_path, sep=r"\s+", header=None, names=["RUL"])

        train_df = self._optimize_dtypes(train_df)
        test_df = self._optimize_dtypes(test_df)

        self._validate_data(train_df, test_df, rul_df, name)

        logger.info(
            "%s loaded — Train: %s | Test: %s | Memory: %.1f MB",
            name,
            train_df.shape,
            test_df.shape,
            train_df.memory_usage(deep=True).sum() / 1e6,
        )
        return train_df, test_df, rul_df

    def load_all_datasets(self) -> Dict[str, dict]:
        """
        Attempt to load all four CMAPSS datasets (FD001–FD004).

        Skips datasets whose files are not present rather than raising an error.

        Returns:
            Dict keyed by dataset name, each value is {"train", "test", "rul"}.
        """
        datasets: Dict[str, dict] = {}
        for name in ["FD001", "FD002", "FD003", "FD004"]:
            try:
                train, test, rul = self.load_single_dataset(name)
                datasets[name] = {"train": train, "test": test, "rul": rul}
            except FileNotFoundError as exc:
                logger.warning("Skipping %s — %s", name, exc)

        logger.info("Loaded %d / 4 datasets", len(datasets))
        return datasets

    def combine_datasets(
        self, datasets: Dict[str, dict]
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Concatenate multiple CMAPSS datasets, tagging each row with a
        'dataset_id' column (e.g. "FD001") so they remain distinguishable.

        Args:
            datasets: Output of load_all_datasets().

        Returns:
            Tuple of (combined_train, combined_test, combined_rul).
        """
        train_list, test_list, rul_list = [], [], []

        for name, data in datasets.items():
            train_copy = data["train"].copy()
            test_copy = data["test"].copy()
            train_copy["dataset_id"] = name
            test_copy["dataset_id"] = name

            train_list.append(train_copy)
            test_list.append(test_copy)
            rul_list.append(data["rul"])

        combined_train = pd.concat(train_list, ignore_index=True)
        combined_test = pd.concat(test_list, ignore_index=True)
        combined_rul = pd.concat(rul_list, ignore_index=True)

        mem_mb = combined_train.memory_usage(deep=True).sum() / 1e6
        logger.info(
            "Combined — %d rows, %d features, %.1f MB",
            len(combined_train),
            combined_train.shape[1],
            mem_mb,
        )
        return combined_train, combined_test, combined_rul

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _optimize_dtypes(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Downcast numeric dtypes to reduce memory footprint by ~50%.

        Strategy:
        - unit_id, cycle → int32  (range 0-65535 is sufficient)
        - All float64 columns → float32  (sensor precision doesn't need 64-bit)
        """
        df = df.copy()
        df["unit_id"] = df["unit_id"].astype("int32")
        df["cycle"] = df["cycle"].astype("int32")
        for col in df.columns:
            if col not in ("unit_id", "cycle") and df[col].dtype == "float64":
                df[col] = df[col].astype("float32")
        return df

    def _validate_data(
        self,
        train_df: pd.DataFrame,
        test_df: pd.DataFrame,
        rul_df: pd.DataFrame,
        name: str,
    ) -> None:
        """
        Run integrity checks on the loaded dataset.

        Checks:
        1. No missing values in train or test
        2. All 21 sensor columns present
        3. Monotonic cycle progression per unit (warns, does not raise)
        4. RUL row count matches number of test units
        """
        if train_df.isnull().any().any():
            raise ValueError(f"{name}: Training data contains missing values.")
        if test_df.isnull().any().any():
            raise ValueError(f"{name}: Test data contains missing values.")

        expected = {f"sensor_{i}" for i in range(1, 22)}
        missing = expected - set(train_df.columns)
        if missing:
            raise ValueError(f"{name}: Missing sensor columns: {missing}")

        for uid in train_df["unit_id"].unique():
            cycles = train_df[train_df["unit_id"] == uid]["cycle"].values
            if not np.all(np.diff(cycles) == 1):
                logger.warning("%s unit %d has non-monotonic cycles.", name, uid)

        n_test_units = test_df["unit_id"].nunique()
        if len(rul_df) != n_test_units:
            raise ValueError(
                f"{name}: RUL rows ({len(rul_df)}) != test units ({n_test_units})"
            )

        logger.info("%s — validation passed ✓", name)


if __name__ == "__main__":
    # Quick smoke test for standalone execution
    logging.basicConfig(level=logging.INFO, format="%(levelname)s — %(message)s")
    from config import config  # noqa: E402 (relative import OK here)

    loader = CMAPSSLoader(data_dir=config.data_dir)
    datasets = loader.load_all_datasets()
    if datasets:
        first = next(iter(datasets))
        train, test, rul = datasets[first]["train"], datasets[first]["test"], datasets[first]["rul"]
        print(f"\n{first} train head:\n{train.head(2)}")
