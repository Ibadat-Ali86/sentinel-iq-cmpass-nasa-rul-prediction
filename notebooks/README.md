# Notebooks

Run these notebooks **in order** from top to bottom. Each notebook saves its output artifacts (processed data, figures) that the next notebook depends on.

> **Prerequisite:** Complete the [Installation Guide](../INSTALLATION.md) and populate `data/raw/` before running any notebook. See [data/README.md](../data/README.md) for download instructions.

---

## Execution Order

| # | Notebook | Purpose | Input | Output |
|---|----------|---------|-------|--------|
| 01 | [`01_data_exploration.ipynb`](01_data_exploration.ipynb) | EDA — distribution analysis, sensor correlation heatmaps, RUL distribution, missing value audit | `data/raw/train_FD001.txt` | `reports/figures/eda_*.png` |
| 02 | [`02_feature_engineering.ipynb`](02_feature_engineering.ipynb) | Rolling statistics, sensor selection, RUL label generation, normalization | `data/raw/` | `data/processed/fd001_train_features.parquet` |
| 03 | [`03_model_evaluation.ipynb`](03_model_evaluation.ipynb) | TCN ensemble inference, RMSE/MAE benchmarking, SHAP DeepExplainer plots | `data/processed/`, `models/` | `reports/figures/roc_*.png`, `reports/figures/shap_*.png` |

---

## Running All Notebooks Non-Interactively

```bash
pip install nbconvert
jupyter nbconvert --to notebook --execute notebooks/01_data_exploration.ipynb
jupyter nbconvert --to notebook --execute notebooks/02_feature_engineering.ipynb
jupyter nbconvert --to notebook --execute notebooks/03_model_evaluation.ipynb
```

Or via Makefile:

```bash
make notebooks
```

---

## Notes

- Always **Kernel → Restart & Run All** before committing to ensure reproducibility
- Notebook outputs (cell outputs, embedded images) are NOT committed — use `nbstripout` pre-commit hook
- All heavy computations should use the `configs/training_config.yaml` parameters, not hardcoded values
