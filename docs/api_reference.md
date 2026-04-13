# SentinelIQ v2.0 — API Reference

> **Module path:** All public classes live under the `src/` package.
> Import pattern: `from src.<module> import <Class>`

---

## Table of Contents

1. [CMAPSSLoader](#1-cmapssloader)
2. [FeatureEngineer](#2-featureengineer)
3. [Model Architectures](#3-model-architectures)
   - [CMAPSSDataset](#cmapssdataset)
   - [CMAPSSDataset_MultiTask](#cmapssdataset_multitask)
   - [LSTMModel](#lstmmodel)
   - [TCNModel](#tcnmodel)
   - [MultiTaskTCN](#multitasktcn)
   - [Autoencoder](#autoencoder)
4. [ModelTrainer](#4-modeltrainer)
5. [ModelEvaluator](#5-modelevaluator)
6. [AnomalyDetector](#6-anomalydetector)
7. [DriftMonitor](#7-driftmonitor)
8. [MaintenanceScheduler](#8-maintenancescheduler)
9. [RootCauseAnalyzer](#9-rootcauseanalyzer)
10. [SHAPExplainer](#10-shapexplainer)

---

## 1. CMAPSSLoader

```python
from src.data_loader import CMAPSSLoader
```

Handles loading and validation of the NASA C-MAPSS turbofan dataset files.

### Constructor

```python
CMAPSSLoader(data_dir: Path)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `data_dir` | `Path` | Directory containing `train_FD00X.txt`, `test_FD00X.txt`, `RUL_FD00X.txt` |

### Methods

#### `load_single_dataset`

```python
load_single_dataset(name: str) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]
```

Load one CMAPSS dataset from disk.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `str` | Dataset identifier: `"FD001"`, `"FD002"`, `"FD003"`, or `"FD004"` |

**Returns:** `(train_df, test_df, rul_df)` — DataFrames with standard column schema.

**Raises:**
- `FileNotFoundError` — if any `.txt` file is missing from `data_dir`
- `ValueError` — if data integrity checks fail (missing values, wrong sensor count, RUL mismatch)

**Column schema:** `unit_id, cycle, op_setting_1/2/3, sensor_1 … sensor_21`
**dtype optimisation:** `unit_id`/`cycle` → `int32`; all float columns → `float32` (~50% memory reduction)

---

#### `load_all_datasets`

```python
load_all_datasets() -> Dict[str, dict]
```

Attempt to load all four CMAPSS datasets. Skips missing files (does not raise).

**Returns:** `Dict[name, {"train": df, "test": df, "rul": df}]`

---

#### `combine_datasets`

```python
combine_datasets(datasets: Dict[str, dict]) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]
```

Concatenate multiple CMAPSS datasets. Adds a `dataset_id` column (e.g. `"FD001"`) to each row.

| Parameter | Type | Description |
|-----------|------|-------------|
| `datasets` | `Dict` | Output of `load_all_datasets()` |

**Returns:** `(combined_train, combined_test, combined_rul)`

---

## 2. FeatureEngineer

```python
from src.features import FeatureEngineer
```

End-to-end feature engineering pipeline: RUL computation → capping → clustering → constant removal → normalisation.

### Constructor

```python
FeatureEngineer(
    rul_cap: int = 125,
    variance_threshold: float = 1e-6,
    n_operating_clusters: int = 6,
    random_seed: int = 42,
)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rul_cap` | `int` | `125` | Piece-wise linear RUL ceiling (Heimes 2008) |
| `variance_threshold` | `float` | `1e-6` | Sensors below this variance are dropped |
| `n_operating_clusters` | `int` | `6` | K-Means clusters for operating conditions (FD002/FD004) |
| `random_seed` | `int` | `42` | Reproducibility seed for K-Means |

**Fitted attributes (available after `process()`):**
- `scaler` — `StandardScaler` fitted on training data
- `feature_cols` — `List[str]` of final sensor column names
- `op_kmeans` — `KMeans` model (or `None` for single-regime datasets)
- `_constant_sensors` — `List[str]` of dropped sensor names

### Methods

#### `process`

```python
process(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, List[str]]
```

Run the complete 5-step pipeline. **Must be called before using any fitted attributes.**

**Returns:** `(train_df, test_df, feature_cols)` — both DataFrames transformed, `feature_cols` for model input.

---

#### `compute_rul`

```python
compute_rul(df: pd.DataFrame) -> pd.DataFrame
```

Adds `RUL` column: `RUL = max_cycle_for_unit − cycle`. Only meaningful for training data (runs to failure).

---

#### `cap_rul`

```python
cap_rul(df: pd.DataFrame) -> pd.DataFrame
```

Adds `RUL_capped` = `min(RUL, rul_cap)`. Creates a flat healthy plateau + linear degradation shape.

---

#### `remove_constant_sensors`

```python
remove_constant_sensors(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame]
```

Drops sensors whose variance in `train_df` < `variance_threshold`. FD001 constants: `sensor_1, 5, 10, 16, 18, 19`.

---

#### `normalize`

```python
normalize(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame]
```

Z-score normalisation. Scaler fitted on `train_df` only — applied to `test_df` via `.transform()` (no data leakage).

---

## 3. Model Architectures

```python
from src.models import CMAPSSDataset, CMAPSSDataset_MultiTask
from src.models import LSTMModel, TCNModel, MultiTaskTCN, Autoencoder
```

---

### CMAPSSDataset

```python
CMAPSSDataset(
    df: pd.DataFrame,
    feature_cols: List[str],
    sequence_length: int,
    target_col: str = "RUL_capped",
)
```

PyTorch `Dataset` implementing a sliding-window approach. For each engine unit, generates overlapping windows of shape `(sequence_length, n_features)` paired with the RUL at the window's final timestep.

`__getitem__` returns `(sequence: FloatTensor, rul: FloatTensor)`.

---

### CMAPSSDataset_MultiTask

```python
CMAPSSDataset_MultiTask(
    df: pd.DataFrame,          # must contain 'failure_mode' column
    feature_cols: List[str],
    sequence_length: int,
    target_col: str = "RUL_capped",
)
```

Extended dataset for multi-task learning. `__getitem__` returns `(sequence, rul, failure_mode_label)`.

---

### LSTMModel

```python
LSTMModel(
    input_dim: int,
    hidden_dim: int = 128,
    dropout: float = 0.2,
)
```

Bidirectional 2-layer LSTM for RUL regression.

| IO | Shape | Description |
|----|-------|-------------|
| Input | `(batch, seq_len, input_dim)` | Sensor sequences |
| Output | `(batch,)` | Scalar RUL per sample |

**Architecture:** `LSTM(2-layer, bidirectional) → Dropout → Linear(hidden×2, 1)`
**Target:** RMSE ≤ 18 cycles on FD001 test set.

---

### TCNModel

```python
TCNModel(
    input_dim: int,
    num_channels: Optional[List[int]] = None,   # default: [64, 128, 128, 64]
    kernel_size: int = 3,
    dropout: float = 0.2,
)
```

Temporal Convolutional Network using dilated causal convolutions.

| IO | Shape | Description |
|----|-------|-------------|
| Input | `(batch, seq_len, input_dim)` | Note: internally transposed for Conv1d |
| Output | `(batch,)` | Scalar RUL per sample |

**Architecture:** Stack of `TemporalBlock` with exponentially increasing dilation (1, 2, 4, 8) → `Linear(channels[-1], 1)`
**Target:** RMSE ≤ 13 cycles on FD001 test set.

---

### TemporalBlock

```python
TemporalBlock(
    n_inputs: int,
    n_outputs: int,
    kernel_size: int,
    stride: int,
    dilation: int,
    dropout: float = 0.2,
)
```

Single TCN residual block. Uses causal padding to prevent future information leakage. Residual (skip) connection handles `n_inputs ≠ n_outputs`.

---

### MultiTaskTCN

```python
MultiTaskTCN(
    input_dim: int,
    num_channels: Optional[List[int]] = None,   # default: [64, 128, 128, 64]
    n_failure_modes: int = 5,
    kernel_size: int = 3,
    dropout: float = 0.2,
)
```

Shared TCN backbone with two task heads.

| IO | Shape | Description |
|----|-------|-------------|
| Input | `(batch, seq_len, input_dim)` | |
| Output | `((batch,), (batch, n_failure_modes))` | `(rul_pred, failure_mode_logits)` |

**Loss:** `L = MSE(rul) + λ × CrossEntropy(failure_mode)` — λ from `config.lambda_classification`
**Targets:** RUL RMSE ≤ 16 cycles | Failure mode F1 ≥ 0.75

---

### Autoencoder

```python
Autoencoder(
    input_dim: int,
    latent_dim: int = 16,
)
```

Encoder-decoder for reconstruction-based anomaly detection. Trained on healthy sensor patterns only.

| Method | Signature | Description |
|--------|-----------|-------------|
| `forward` | `(x: Tensor) → Tensor` | Encode then decode input |
| `reconstruction_error` | `(x: Tensor) → np.ndarray` | Per-sample MSE error (anomaly score) |

**Architecture:** `Linear(→64→32→latent_dim) | Linear(→32→64→input_dim)`

---

## 4. ModelTrainer

```python
from src.trainer import ModelTrainer
trainer = ModelTrainer(config)
```

Unified training loop for all model variants with early stopping and checkpointing.

### Constructor

```python
ModelTrainer(config: Config)
```

Reads all hyperparameters from `Config`. Device auto-selected (CUDA if available).

### Methods

#### `train_lstm`

```python
train_lstm(
    train_loader: DataLoader,
    val_loader: DataLoader,
    input_dim: int,
    save_path: Optional[Path] = None,
) -> nn.Module
```

Train bidirectional LSTM. Returns best checkpoint (loaded in-memory).

---

#### `train_tcn`

```python
train_tcn(
    train_loader: DataLoader,
    val_loader: DataLoader,
    input_dim: int,
    save_path: Optional[Path] = None,
) -> nn.Module
```

Train TCN. Returns best checkpoint.

---

#### `train_multitask`

```python
train_multitask(
    train_loader: DataLoader,    # yields (sequences, rul_targets, failure_modes)
    val_loader: DataLoader,
    input_dim: int,
    save_path: Optional[Path] = None,
) -> nn.Module
```

Train MultiTaskTCN with combined MSE + CrossEntropy loss.

---

#### `train_autoencoder`

```python
train_autoencoder(
    healthy_data: torch.Tensor,   # (n_samples, n_features) — RUL > threshold
    input_dim: int,
    epochs: int = 50,
    save_path: Optional[Path] = None,
) -> Autoencoder
```

Train Autoencoder on healthy sensor data only.

**Common training config (from `Config`):**
- `lr = 0.001` (Adam)
- `patience = 10` (early stopping on val loss)
- `max_norm = 1.0` (gradient clipping)
- Per-5-epoch logging

---

## 5. ModelEvaluator

```python
from src.evaluator import ModelEvaluator
evaluator = ModelEvaluator()
```

Computes regression metrics and NASA asymmetric scoring function.

### Methods

#### `evaluate`

```python
evaluate(
    model: nn.Module,
    test_loader: DataLoader,
    true_rul: np.ndarray,
    model_name: str = "Model",
) -> Dict[str, float]
```

**Returns:** `{"RMSE": float, "MAE": float, "R2": float, "NASA_Score": float}`

**NASA Score formula:**
```
d = pred − true
s_i = exp(-d/13) − 1   if d < 0  (early — penalised lightly)
s_i = exp(d/10)  − 1   if d ≥ 0  (late  — penalised heavily)
Score = Σ s_i           (lower is better)
```

---

#### `compare_models`

```python
compare_models(results: Dict[str, Dict[str, float]]) -> str
```

Logs a formatted comparison table and returns the best model name (lowest RMSE).

---

## 6. AnomalyDetector

```python
from src.anomaly import AnomalyDetector
detector = AnomalyDetector(
    contamination=0.05,
    healthy_rul_threshold=100,
    critical_threshold=0.7,
    warning_threshold=0.3,
)
```

Ensemble anomaly detection: Isolation Forest + Autoencoder reconstruction error.

**Combined score:** `0.4 × IF_score + 0.6 × AE_score`

**Severity mapping:**

| Score | Label |
|-------|-------|
| < 0.3 | `normal` |
| 0.3 – 0.7 | `warning` |
| ≥ 0.7 | `critical` |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `fit` | `(train_df, feature_cols)` | Train IF + AE on healthy rows (RUL > threshold) |
| `predict` | `(df, feature_cols) → df` | Add `anomaly_score`, `severity` columns |
| `save` | `(path: Path)` | Pickle the fitted detector |
| `load` | `(path: Path) → AnomalyDetector` | Load from pickle |

---

## 7. DriftMonitor

```python
from src.drift import DriftMonitor
monitor = DriftMonitor(n_bins=10, psi_threshold=0.25)
```

Detects feature distribution drift between reference and current data.

### Methods

#### `compute_psi`

```python
compute_psi(
    reference: pd.Series,
    current: pd.Series,
) -> float
```

Population Stability Index. Quantile-binned frequency comparison.

| PSI | Severity |
|-----|----------|
| < 0.1 | `STABLE` |
| 0.1 – 0.25 | `MODERATE` |
| > 0.25 | `SEVERE` — triggers retraining |

---

#### `run_ks_test`

```python
run_ks_test(
    reference: pd.Series,
    current: pd.Series,
) -> Tuple[float, float]
```

Returns `(statistic, p_value)` from `scipy.stats.ks_2samp`.

---

#### `generate_report`

```python
generate_report(
    reference_df: pd.DataFrame,
    current_df: pd.DataFrame,
    feature_cols: List[str],
) -> pd.DataFrame
```

Per-feature PSI + KS test results with severity labels. Returns a summary DataFrame.

---

## 8. MaintenanceScheduler

```python
from src.scheduler import MaintenanceScheduler
scheduler = MaintenanceScheduler(
    capacity=10,
    cost_per_maintenance=5000,
    cost_per_failure=50000,
)
```

MILP-based maintenance optimiser (PuLP + COIN-OR CBC solver). Greedy fallback when MILP is infeasible.

### Method

#### `schedule`

```python
schedule(
    rul_predictions: Dict[int, float],    # {unit_id: predicted_RUL}
    planning_horizon: int = 30,
) -> pd.DataFrame
```

**Returns:** DataFrame with columns `unit_id, rul, priority, schedule_day, action`.

**Constraints:**
- Maximum `capacity` units scheduled concurrently
- Units with RUL ≤ 10 cycles forced into maintenance (safety override)

---

## 9. RootCauseAnalyzer

```python
from src.rca import RootCauseAnalyzer
rca = RootCauseAnalyzer()
```

Ranks degradation root causes using SHAP values and DTW pattern matching.

### Methods

#### `analyze`

```python
analyze(
    unit_id: int,
    unit_df: pd.DataFrame,
    feature_cols: List[str],
    shap_values: Optional[np.ndarray] = None,
) -> Dict
```

**Returns:** Dict with `ranked_sensors`, `dtw_matches`, `natural_language_report`.

**Process:**
1. Rank sensors by mean absolute SHAP importance
2. DTW-match degradation trajectories against failure pattern library
3. Compose human-readable NL report

---

## 10. SHAPExplainer

```python
from src.explainer import SHAPExplainer
explainer = SHAPExplainer(model, background_data, feature_cols)
```

SHAP `DeepExplainer` wrapper for PyTorch models. Graceful fallback if `shap` not installed.

### Constructor

```python
SHAPExplainer(
    model: nn.Module,
    background_data: torch.Tensor,    # 100 samples recommended for speed
    feature_cols: List[str],
)
```

### Methods

#### `explain`

```python
explain(
    sequences: torch.Tensor,
) -> np.ndarray
```

Returns SHAP values of shape `(n_samples, seq_len, n_features)`. Mean over time dimension for feature importance.

---

#### `plot_waterfall`

```python
plot_waterfall(
    shap_values: np.ndarray,
    sample_idx: int = 0,
    save_path: Optional[Path] = None,
)
```

Saves SHAP waterfall plot to `outputs/` (PNG, 300 DPI).

---

## Configuration Reference

All parameters are accessible via the singleton `config` object:

```python
from src.config import config
```

| Parameter | Default | Env Var | Description |
|-----------|---------|---------|-------------|
| `data_dir` | `./data/raw` | `SENTINELIQ_DATA_DIR` | Raw dataset path |
| `processed_dir` | `./data/processed` | `SENTINELIQ_PROCESSED_DIR` | Processed output |
| `model_dir` | `./models` | `SENTINELIQ_MODEL_DIR` | Model checkpoints |
| `output_dir` | `./outputs` | `SENTINELIQ_OUTPUT_DIR` | Plots + reports |
| `random_seed` | `42` | `SENTINELIQ_RANDOM_SEED` | Global RNG seed |
| `dataset` | `"FD001"` | `SENTINELIQ_DATASET` | Active dataset |
| `rul_cap` | `125` | — | RUL piece-wise cap |
| `sequence_length` | `30` | — | Sliding window size |
| `n_operating_clusters` | `6` | — | K-Means clusters |
| `batch_size` | `64` | — | Training batch size |
| `learning_rate` | `0.001` | — | Adam LR |
| `n_epochs` | `50` | — | Max training epochs |
| `hidden_dim` | `128` | — | LSTM hidden units |
| `dropout_rate` | `0.2` | — | Dropout probability |
| `patience` | `10` | — | Early stopping patience |
| `tcn_channels` | `[64,128,128,64]` | — | TCN channel stack |
| `tcn_kernel_size` | `3` | — | TCN kernel width |
| `n_failure_modes` | `5` | — | MultiTask classes |
| `lambda_classification` | `0.5` | — | MultiTask loss weight |
| `anomaly_contamination` | `0.05` | — | Isolation Forest rate |
| `anomaly_healthy_rul_threshold` | `100` | — | Min RUL → healthy |
| `anomaly_critical_threshold` | `0.7` | — | Critical severity |
| `anomaly_warning_threshold` | `0.3` | — | Warning severity |

---

*Generated for SentinelIQ v2.0 — See `docs/architecture.md` for system design.*
