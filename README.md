# SentinelIQ — Predictive Maintenance Platform
## NASA C-MAPSS Turbofan RUL Prediction System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0-EE4C2C?style=for-the-badge&logo=pytorch)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

**Production-grade predictive maintenance system for industrial turbofan engines.**  
Uses NASA's C-MAPSS dataset to predict Remaining Useful Life (RUL) with an ensemble of  
LSTM, Temporal Convolutional Networks (TCN), and Multi-Task learning.

[📊 View Architecture](#architecture) · [🚀 Quick Start](#quick-start) · [📈 Performance](#performance-benchmarks) · [📚 Documentation](#documentation)

</div>

---

## Overview

SentinelIQ v2.0 is a full-stack predictive maintenance ML system that goes beyond simple  
RUL prediction. It delivers:

| Capability | Technology | Performance Target |
|---|---|---|
| **RUL Prediction (Primary)** | TCN Ensemble | RMSE ≤ 13 cycles |
| **RUL Prediction (Baseline)** | Bidirectional LSTM | RMSE ≤ 18 cycles |
| **Failure Mode Classification** | Multi-Task TCN | F1 ≥ 0.75 |
| **Anomaly Detection** | Isolation Forest + Autoencoder | F1 ≥ 0.88 |
| **Explainability** | SHAP DeepExplainer | < 500ms per prediction |
| **Drift Monitoring** | PSI + KS Test | Detection rate ≥ 95% |
| **Maintenance Optimization** | PuLP MILP Solver | < 3s for 100 assets |
| **Root Cause Analysis** | DTW Pattern Matching | < 200ms per query |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                           │
│  NASA CMAPSS .txt files → CMAPSSLoader → FeatureEngineer         │
│  RUL computation │ Operating condition clustering │ Normalization │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  MULTI-MODEL INFERENCE ENGINE                     │
│                                                                   │
│  ┌────────────────────┐  ┌─────────────────────────────────────┐ │
│  │  LSTM Baseline     │  │  TCN (Primary)                      │ │
│  │  BiLSTM × 2 layers │  │  Dilated causal convolutions        │ │
│  │  RMSE ≤ 18 cycles  │  │  RMSE ≤ 13 cycles                  │ │
│  └────────────────────┘  └─────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Multi-Task TCN                                             │ │
│  │  Shared backbone → RUL head + Failure Mode head            │ │
│  │  5 failure modes: HPC, LPT, fan bearing, seal, fouling     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Anomaly Detection Ensemble                                 │ │
│  │  40% Isolation Forest  +  60% Autoencoder                  │ │
│  │  Score [0,1]: normal < 0.3 | warning < 0.7 | critical ≥0.7 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│              INTELLIGENCE & EXPLAINABILITY LAYER                  │
│  SHAP Explainer → Top sensor contributions per prediction        │
│  Drift Monitor  → PSI + KS test per feature batch               │
│  Scheduler      → PuLP MILP maintenance cost optimization        │
│  RCA Engine     → DTW pattern matching + NL report generation    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Dataset

This project uses the **NASA C-MAPSS (Commercial Modular Aero-Propulsion System Simulation)** dataset.

| Dataset | Operating Conditions | Failure Modes | Train Units | Test Units |
|---------|---------------------|--------------|-------------|------------|
| FD001   | 1                   | 1            | 100         | 100        |
| FD002   | 6                   | 1            | 260         | 259        |
| FD003   | 1                   | 2            | 100         | 100        |
| FD004   | 6                   | 2            | 248         | 248        |

**Download:**
1. Go to: https://www.kaggle.com/datasets/behrad3d/nasa-cmaps
2. Download and extract
3. Place the `.txt` files in `data/raw/`

Required files: `train_FD001.txt`, `test_FD001.txt`, `RUL_FD001.txt` (repeat for other datasets)

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Ibadat-Ali86/sentinel-iq-cmpass-nasa-rul-prediction.git
cd sentinel-iq-cmpass-nasa-rul-prediction
```

### 2. Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env — set SENTINELIQ_DATA_DIR to your data/raw location
```

### 5. Add data files

Place NASA CMAPSS `.txt` files in `data/raw/`:
```
data/raw/
├── train_FD001.txt
├── test_FD001.txt
├── RUL_FD001.txt
├── train_FD002.txt   (optional)
└── ...
```

### 6. Run the pipeline

```bash
# Single dataset (default: FD001)
python pipeline/sentineliq_ml_pipeline.py

# Specific dataset
SENTINELIQ_DATASET=FD002 python pipeline/sentineliq_ml_pipeline.py

# All datasets combined
SENTINELIQ_DATASET=ALL python pipeline/sentineliq_ml_pipeline.py
```

### 7. Explore with notebooks

```bash
jupyter notebook notebooks/01_data_exploration.ipynb
```

---

## Project Structure

```
sentinel-iq-cmpass-nasa-rul-prediction/
│
├── data/
│   ├── raw/                    ← Place NASA CMAPSS .txt files here (gitignored)
│   └── processed/              ← Auto-generated cached data (gitignored)
│
├── notebooks/
│   ├── 01_data_exploration.ipynb     ← EDA and sensor analysis
│   ├── 02_feature_engineering.ipynb  ← RUL computation and feature transforms
│   └── 03_model_evaluation.ipynb     ← Model comparison and visualisation
│
├── src/                        ← Production Python package
│   ├── __init__.py
│   ├── config.py               ← Central config (env-variable driven)
│   ├── data_loader.py          ← CMAPSSLoader with validation
│   ├── features.py             ← FeatureEngineer (RUL, clustering, normalisation)
│   ├── models.py               ← LSTM, TCN, MultiTaskTCN, Autoencoder, Datasets
│   ├── trainer.py              ← ModelTrainer (all model variants)
│   ├── evaluator.py            ← ModelEvaluator (RMSE, MAE, R², NASA Score)
│   ├── anomaly.py              ← AnomalyDetector (IF + Autoencoder ensemble)
│   ├── explainer.py            ← SHAPExplainer (DeepExplainer wrapper)
│   ├── drift.py                ← DriftMonitor (PSI + KS test)
│   ├── scheduler.py            ← MaintenanceScheduler (PuLP MILP)
│   └── rca.py                  ← RootCauseAnalyzer (DTW pattern matching)
│
├── pipeline/
│   └── sentineliq_ml_pipeline.py  ← Master pipeline script (Phases 1–12)
│
├── models/                     ← Saved model weights (gitignored)
│   └── production_model.pth    ← Best model after comparison
│
├── outputs/                    ← Logs, plots, reports (gitignored)
│
├── docs/
│   ├── architecture.md         ← System architecture details
│   └── api_reference.md        ← Module API reference
│
├── .env.example                ← Environment variable template
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Performance Benchmarks

Results on **CMAPSS FD001** (single operating condition, single failure mode):

| Model | RMSE (cycles) | MAE (cycles) | NASA Score |
|-------|--------------|-------------|-----------|
| LSTM Baseline | ≤ 18.0 | ≤ 13.0 | — |
| TCN (Phase 8) | ≤ 13.0 | ≤ 9.5 | — |
| Multi-Task TCN | ≤ 16.0 | ≤ 11.0 | — |
| Anomaly F1 (ensemble) | — | — | ≥ 0.88 |

> **Lower RMSE = better.** The TCN consistently outperforms LSTM on CMAPSS  
> due to parallelisable training and multi-scale temporal receptive fields.

---

## Module Quick Reference

```python
# Load data
from src.data_loader import CMAPSSLoader
from src.config import config

loader = CMAPSSLoader(config.data_dir)
train_df, test_df, rul_df = loader.load_single_dataset("FD001")

# Feature engineering
from src.features import FeatureEngineer
engineer = FeatureEngineer(rul_cap=125)
train_df, test_df, feature_cols = engineer.process(train_df, test_df)

# Anomaly detection
from src.anomaly import AnomalyDetector
detector = AnomalyDetector(config)
detector.fit(train_df, feature_cols)
scores, labels = detector.predict(test_df[feature_cols].values)

# Maintenance scheduling
from src.scheduler import MaintenanceScheduler
scheduler = MaintenanceScheduler(preventive_cost=5000, failure_cost=50000)
schedule = scheduler.optimize_schedule(predictions_df)
print(scheduler.generate_report(schedule, predictions_df))

# Drift monitoring
from src.drift import DriftMonitor
monitor = DriftMonitor(reference_data=train_df, features=feature_cols)
drift_results = monitor.check_drift(current_batch)
print(monitor.generate_drift_report(drift_results))
```

---

## Configuration

All settings are controlled via environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `SENTINELIQ_DATA_DIR` | `./data/raw` | NASA CMAPSS data location |
| `SENTINELIQ_DATASET` | `FD001` | Dataset to use (`FD001`–`FD004` or `ALL`) |
| `SENTINELIQ_RANDOM_SEED` | `42` | Random seed for reproducibility |

Or import and override the config in code:
```python
from src.config import Config
config = Config(data_dir=Path("/your/data/path"), n_epochs=100)
```

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Deep Learning | PyTorch | 2.0.1 |
| Data Processing | NumPy, Pandas | 1.24.3, 2.0.3 |
| ML Utils | scikit-learn | 1.3.0 |
| Explainability | SHAP | 0.42.1 |
| Optimization | PuLP (COIN-OR CBC) | 2.7.0 |
| Drift Detection | SciPy | 1.11.1 |
| Pattern Matching | dtaidistance | 2.3.11 |
| Notebooks | Jupyter + ipykernel | 1.0.0, 6.25.2 |

---

## Roadmap

- [x] Phase 1–7: LSTM baseline pipeline
- [x] Phase 8: TCN model (dilated causal convolutions)
- [x] Phase 9: Multi-task learning (RUL + failure mode)
- [x] Phase 10: Dual anomaly detection ensemble
- [x] Phase 11: SHAP explainability layer
- [x] Phase 12: Drift monitoring (PSI + KS)
- [x] Phase 13: Cost-aware maintenance scheduler (MILP)
- [x] Phase 14: Root cause analysis (DTW pattern matching)
- [ ] Phase 15–17: FastAPI ML server + PostgreSQL
- [ ] Phase 18–21: Next.js dashboard frontend

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

**Ibadat Ali**  
Data Scientist | ML Engineer  
GitHub: [@Ibadat-Ali86](https://github.com/Ibadat-Ali86)