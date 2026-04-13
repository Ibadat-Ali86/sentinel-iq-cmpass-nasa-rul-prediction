# SentinelIQ — System Architecture

## Overview

SentinelIQ v2.0 is a production-grade ML system with three layers:

| Layer | Components | Technology |
|-------|-----------|-----------|
| **ML Inference** | LSTM, TCN, MultiTask TCN, Anomaly Ensemble | PyTorch 2.0 |
| **Intelligence** | SHAP, Drift Monitor, RCA, Scheduler | SHAP, SciPy, PuLP, dtaidistance |
| **Data Pipeline** | CMAPSSLoader, FeatureEngineer | Pandas, scikit-learn |

---

## Component Descriptions

### `src/config.py` — Central Configuration
- Singleton `Config` dataclass driven by environment variables
- Covers data paths, model hyperparameters, anomaly thresholds
- All paths are relative by default (.env override supported)

### `src/data_loader.py` — CMAPSSLoader
- Reads NASA CMAPSS `.txt` files (space-delimited)
- Validates: missing values, column counts, monotonic cycles, RUL alignment
- Memory optimization: int32/float32 dtype casting (~50% reduction)
- Supports single dataset (`FD001`) or all four + combination

### `src/features.py` — FeatureEngineer
- `compute_rul()`: RUL = max_cycle − current_cycle
- `cap_rul()`: Piece-wise linear capping at 125 cycles (eliminates early-lifecycle noise)
- `_cluster_operating_conditions()`: K-Means on op_settings (for FD002/FD004)
- `remove_constant_sensors()`: Drops zero-variance sensors (FD001: 6 dropped)
- `normalize()`: StandardScaler fit on train, transform on test (no leakage)

### `src/models.py` — PyTorch Architectures

| Class | Input | Output | Purpose |
|-------|-------|--------|---------|
| `CMAPSSDataset` | DataFrame | (seq, rul) tensors | Sliding window dataset |
| `CMAPSSDataset_MultiTask` | DataFrame + failure_mode | (seq, rul, mode) | Multi-task dataset |
| `LSTMModel` | (batch, seq_len, n_feat) | (batch,) | Bidirectional LSTM baseline |
| `TemporalBlock` | (batch, feat, seq_len) | same | Single TCN residual block |
| `TCNModel` | (batch, seq_len, n_feat) | (batch,) | Full TCN stack |
| `MultiTaskTCN` | (batch, seq_len, n_feat) | (rul, logits) | Shared backbone, 2 heads |
| `Autoencoder` | (batch, n_feat) | (batch, n_feat) | Reconstruction for anomaly |

### `src/trainer.py` — ModelTrainer
- `train_lstm()`, `train_tcn()`: Single-output regression with early stopping
- `train_multitask()`: Combined MSE + CrossEntropy loss (λ=0.5)
- `train_autoencoder()`: Trains on healthy data only
- Gradient clipping (max_norm=1.0), per-5-epoch logging, best-checkpoint save

### `src/evaluator.py` — ModelEvaluator
- Metrics: RMSE, MAE, R², NASA asymmetric score
- NASA Score: Early predictions penalised less than late ones
- `compare_models()`: Tabular comparison, returns best model name

### `src/anomaly.py` — AnomalyDetector
- Isolation Forest (sklearn) + Autoencoder ensemble
- Trained ONLY on healthy cycles (RUL > 100)
- Combined score: `0.4 × IF_score + 0.6 × AE_score`
- Severity: normal < 0.3 | warning 0.3–0.7 | critical ≥ 0.7
- `.save()` / `.load()` via pickle

### `src/drift.py` — DriftMonitor
- PSI (Population Stability Index): Quantile-binned frequency comparison
- KS Test (scipy.stats.ks_2samp): Non-parametric distribution test
- Per-feature severity: STABLE / MODERATE / SEVERE
- Auto-retraining trigger logic at PSI ≥ 0.25

### `src/scheduler.py` — MaintenanceScheduler
- MILP via PuLP (COIN-OR CBC solver)
- Decision variable: x[i] ∈ {0,1} per unit
- Constraints: capacity (max concurrent jobs) + forced maintenance (RUL ≤ 10)
- Greedy fallback when MILP is infeasible
- Cost comparison report vs naive reactive strategy

### `src/rca.py` — RootCauseAnalyzer
- Ranks sensors by absolute SHAP value
- DTW distance matching against failure pattern library
- `dtaidistance` library with pure-Python fallback
- Natural language report generation

### `src/explainer.py` — SHAPExplainer
- `shap.DeepExplainer` wrapper for PyTorch models
- 100-sample background for speed (< 500ms per prediction)
- Graceful fallback if SHAP not installed
- Waterfall plot export to `outputs/`

---

## Data Flow

```
NASA .txt files
      │
      ▼
CMAPSSLoader.load_single_dataset()
      │  train_df, test_df, rul_df
      ▼
FeatureEngineer.process()
      │  + RUL, RUL_capped, op_cluster columns
      │  - constant sensors removed
      │  normalised features
      ▼
CMAPSSDataset (sliding windows)
      │  (batch, 30, n_features) sequences
      ▼
ModelTrainer → LSTM / TCN / MultiTaskTCN
      │  best checkpoint saved
      ▼
ModelEvaluator → RMSE / MAE / R² / NASA Score
      │
      ├─→ AnomalyDetector → scores + labels
      ├─→ DriftMonitor → PSI + KS per feature
      ├─→ MaintenanceScheduler → MILP optimal schedule
      └─→ RootCauseAnalyzer → DTW + NL report
```

---

## Performance Targets

| Component | Metric | Target |
|-----------|--------|--------|
| TCN RUL | RMSE (cycles) | ≤ 13 |
| LSTM RUL | RMSE (cycles) | ≤ 18 |
| MultiTask RUL | RMSE | ≤ 16 |
| MultiTask Failure Mode | F1 | ≥ 0.75 |
| Anomaly Ensemble | F1 | ≥ 0.88 |
| SHAP Explainer | Latency | < 500ms |
| Drift Detection | Detection Rate | ≥ 95% |
| Maintenance Optimizer | Solve Time | < 3s for 100 assets |
| RCA Engine | DTW Match | < 200ms |
