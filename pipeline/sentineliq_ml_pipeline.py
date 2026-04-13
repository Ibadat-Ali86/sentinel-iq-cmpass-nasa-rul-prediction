"""
SentinelIQ — Complete End-to-End ML Pipeline
=============================================

Orchestrates all pipeline phases using the modular src/ package:

  Phase 1:  Data loading & validation        (src.data_loader)
  Phase 2:  Exploratory Data Analysis        (inline)
  Phase 3:  Feature engineering              (src.features)
  Phase 4:  Data preprocessing               (src.features)
  Phase 5:  Dataset & DataLoader creation    (src.models)
  Phase 6:  LSTM model training              (src.trainer)
  Phase 7:  TCN model training               (src.trainer)
  Phase 8:  Multi-task TCN training          (src.trainer)
  Phase 9:  Model comparison & selection     (src.evaluator)
  Phase 10: Anomaly detector training        (src.anomaly)
  Phase 11: SHAP explainability              (src.explainer)
  Phase 12: Drift monitor initialisation     (src.drift)
  Phase 13: Maintenance schedule optimisation (src.scheduler)

HOW TO RUN:
  python pipeline/sentineliq_ml_pipeline.py

  Or with a specific dataset:
  SENTINELIQ_DATASET=FD002 python pipeline/sentineliq_ml_pipeline.py

Place NASA CMAPSS .txt files in data/raw/ before running.
Download from: https://www.kaggle.com/datasets/behrad3d/nasa-cmaps

Author: SentinelIQ Team
Version: 2.0
"""

import logging
import os
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader

warnings.filterwarnings("ignore")

# ─── Add project root to sys.path when run as script ─────────────────────────
_PROJECT_ROOT = Path(__file__).parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# ─── SentinelIQ modules ──────────────────────────────────────────────────────
from src.config import Config
from src.data_loader import CMAPSSLoader
from src.features import FeatureEngineer
from src.models import CMAPSSDataset, CMAPSSDataset_MultiTask
from src.trainer import ModelTrainer
from src.evaluator import ModelEvaluator
from src.anomaly import AnomalyDetector
from src.drift import DriftMonitor


# ─── Logging Setup ───────────────────────────────────────────────────────────

def setup_logging(config: Config) -> logging.Logger:
    """Configure file + console logging."""
    log_file = config.output_dir / f"pipeline_{time.strftime('%Y%m%d_%H%M%S')}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout),
        ],
    )
    logger = logging.getLogger("SentinelIQ")
    logger.info("=" * 80)
    logger.info("SentinelIQ v2.0 — ML Pipeline")
    logger.info("=" * 80)
    return logger


def set_seeds(seed: int) -> None:
    """Set all random seeds for reproducibility."""
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


# ─── Utility: Build DataLoaders ──────────────────────────────────────────────

def build_dataloaders(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_cols: list,
    config: Config,
    logger: logging.Logger,
):
    """
    Split training data into train/val (80/20 by unit) and build DataLoaders.

    Returns:
        (train_loader, val_loader, test_loader, input_dim)
    """
    units = train_df["unit_id"].unique()
    train_units = units[: int(0.8 * len(units))]
    val_units = units[int(0.8 * len(units)) :]

    train_sub = train_df[train_df["unit_id"].isin(train_units)]
    val_sub = train_df[train_df["unit_id"].isin(val_units)]

    train_ds = CMAPSSDataset(train_sub, feature_cols, config.sequence_length)
    val_ds = CMAPSSDataset(val_sub, feature_cols, config.sequence_length)
    test_ds = CMAPSSDataset(test_df, feature_cols, config.sequence_length)

    train_loader = DataLoader(train_ds, batch_size=config.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=config.batch_size, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=config.batch_size, num_workers=0)

    input_dim = len(feature_cols)
    logger.info(
        "DataLoaders — Train: %d | Val: %d | Test: %d sequences | input_dim=%d",
        len(train_ds), len(val_ds), len(test_ds), input_dim,
    )
    return train_loader, val_loader, test_loader, input_dim


# ─── Main Pipeline ───────────────────────────────────────────────────────────

def main():
    """
    Execute the complete SentinelIQ ML pipeline end-to-end.

    All phases are logged; execution time is tracked per phase.
    The best model (lowest RMSE) is saved as production_model.pth.
    """
    pipeline_start = time.time()

    # ── Config ────────────────────────────────────────────────────────────────
    config = Config()
    logger = setup_logging(config)
    set_seeds(config.random_seed)
    logger.info("Dataset: %s | Random seed: %d", config.dataset, config.random_seed)
    logger.info("Data directory: %s", config.data_dir.resolve())

    # ── Phase 1: Data Loading ─────────────────────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 1] Data Loading")
    loader = CMAPSSLoader(data_dir=config.data_dir)

    if config.dataset == "ALL":
        datasets = loader.load_all_datasets()
        if not datasets:
            raise RuntimeError(f"No datasets found in {config.data_dir}")
        train_df, test_df, rul_df = loader.combine_datasets(datasets)
    else:
        train_df, test_df, rul_df = loader.load_single_dataset(config.dataset)

    logger.info("Phase 1 done — %.2fs", time.time() - t0)

    # ── Phase 2: EDA (key stats only) ─────────────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 2] Exploratory Data Analysis")
    sensor_cols = [c for c in train_df.columns if c.startswith("sensor_")]
    logger.info("Training units: %d | Total cycles: %d", train_df["unit_id"].nunique(), len(train_df))
    logger.info(
        "Cycle range: [%d, %d] | Sensors: %d",
        train_df["cycle"].min(), train_df["cycle"].max(), len(sensor_cols),
    )
    variances = train_df[sensor_cols].var()
    constant = (variances < 1e-6).sum()
    logger.info("Low-variance sensors (to be dropped): %d", constant)
    logger.info("Phase 2 done — %.2fs", time.time() - t0)

    # ── Phase 3 + 4: Feature Engineering & Preprocessing ─────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 3-4] Feature Engineering & Preprocessing")
    engineer = FeatureEngineer(
        rul_cap=config.rul_cap,
        variance_threshold=config.variance_threshold,
        n_operating_clusters=config.n_operating_clusters,
        random_seed=config.random_seed,
    )
    train_df, test_df, feature_cols = engineer.process(train_df, test_df)
    logger.info("Phase 3-4 done — %.2fs | Features: %d", time.time() - t0, len(feature_cols))

    # ── Phase 5: Build DataLoaders ────────────────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 5] Building DataLoaders")
    train_loader, val_loader, test_loader, input_dim = build_dataloaders(
        train_df, test_df, feature_cols, config, logger
    )
    logger.info("Phase 5 done — %.2fs", time.time() - t0)

    # ── Phase 6: Train LSTM ───────────────────────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 6] Training LSTM Baseline")
    trainer = ModelTrainer(config)
    lstm_model = trainer.train_lstm(train_loader, val_loader, input_dim)
    logger.info("Phase 6 done — %.2fs", time.time() - t0)

    # ── Phase 7: Train TCN ────────────────────────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 7] Training TCN Model")
    tcn_model = trainer.train_tcn(train_loader, val_loader, input_dim)
    logger.info("Phase 7 done — %.2fs", time.time() - t0)

    # ── Phase 8: Multi-Task TCN (requires failure_mode labels) ───────────────
    # NOTE: MultiTask training is skipped here if 'failure_mode' column is absent.
    #       Run FailureModeLabeler first (see src/features.py) to generate labels.
    multitask_model = None
    if "failure_mode" in train_df.columns:
        t0 = time.time()
        logger.info("\n[PHASE 8] Training Multi-Task TCN")
        from src.models import CMAPSSDataset_MultiTask
        units = train_df["unit_id"].unique()
        train_units = units[: int(0.8 * len(units))]
        val_units = units[int(0.8 * len(units)):]
        mt_train_ds = CMAPSSDataset_MultiTask(
            train_df[train_df["unit_id"].isin(train_units)], feature_cols, config.sequence_length
        )
        mt_val_ds = CMAPSSDataset_MultiTask(
            train_df[train_df["unit_id"].isin(val_units)], feature_cols, config.sequence_length
        )
        mt_train_loader = DataLoader(mt_train_ds, batch_size=config.batch_size, shuffle=True)
        mt_val_loader = DataLoader(mt_val_ds, batch_size=config.batch_size)
        multitask_model = trainer.train_multitask(mt_train_loader, mt_val_loader, input_dim)
        logger.info("Phase 8 done — %.2fs", time.time() - t0)
    else:
        logger.info("\n[PHASE 8] Skipping Multi-Task TCN (no failure_mode labels in data).")

    # ── Phase 9: Model Comparison & Selection ────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 9] Model Evaluation & Comparison")
    evaluator = ModelEvaluator()
    true_rul = rul_df["RUL"].values

    all_results = {}
    all_results["LSTM"] = evaluator.evaluate(lstm_model, test_loader, true_rul, "LSTM")
    all_results["TCN"] = evaluator.evaluate(tcn_model, test_loader, true_rul, "TCN")

    best_name = evaluator.compare_models(all_results)
    best_model = lstm_model if best_name == "LSTM" else tcn_model

    import shutil, torch
    torch.save(best_model.state_dict(), config.production_model_path)
    logger.info("Best model: %s — saved to %s", best_name, config.production_model_path)
    logger.info("Phase 9 done — %.2fs", time.time() - t0)

    # ── Phase 10: Anomaly Detection ───────────────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 10] Training Anomaly Detector")
    anomaly_detector = AnomalyDetector(config)
    anomaly_detector.fit(train_df, feature_cols)
    anomaly_detector.save()

    test_features = test_df[feature_cols].values
    scores, labels = anomaly_detector.predict(test_features)
    n_critical = labels.count("critical")
    n_warning = labels.count("warning")
    logger.info(
        "Anomaly results — Critical: %d | Warning: %d | Normal: %d",
        n_critical, n_warning, len(labels) - n_critical - n_warning,
    )
    logger.info("Phase 10 done — %.2fs", time.time() - t0)

    # ── Phase 11: Drift Monitor Initialisation ────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 11] Initialising Drift Monitor")
    drift_monitor = DriftMonitor(reference_data=train_df, features=feature_cols)
    # Run a self-check against a small sample of test data
    drift_results = drift_monitor.check_drift(test_df.head(500))
    drift_report = drift_monitor.generate_drift_report(drift_results)
    logger.info("Phase 11 done — %.2fs", time.time() - t0)

    # ── Phase 12: Maintenance Scheduling Demo ────────────────────────────────
    t0 = time.time()
    logger.info("\n[PHASE 12] Maintenance Scheduling Demo")
    from src.scheduler import MaintenanceScheduler

    # Build a demo predictions DataFrame from test results
    demo_predictions = pd.DataFrame({
        "unit_id": [f"unit_{i+1}" for i in range(min(10, len(true_rul)))],
        "rul_estimate": true_rul[:10].astype(float),
        "failure_probability": np.clip(1.0 - true_rul[:10] / 125.0, 0.05, 0.95),
    })

    scheduler = MaintenanceScheduler(
        preventive_cost=5000.0,
        failure_cost=50000.0,
        max_concurrent_jobs=3,
    )
    schedule = scheduler.optimize_schedule(demo_predictions)
    report = scheduler.generate_report(schedule, demo_predictions)
    logger.info("Phase 12 done — %.2fs", time.time() - t0)

    # ── Summary ───────────────────────────────────────────────────────────────
    elapsed = time.time() - pipeline_start
    logger.info("\n" + "=" * 80)
    logger.info("PIPELINE COMPLETE — Total time: %.2fs (%.1f min)", elapsed, elapsed / 60)
    logger.info("Best model   : %s | RMSE: %.3f cycles", best_name, all_results[best_name]["RMSE"])
    logger.info("Model saved  : %s", config.production_model_path)
    logger.info("=" * 80)


if __name__ == "__main__":
    main()
