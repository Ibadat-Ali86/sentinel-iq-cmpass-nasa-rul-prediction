# Model Details

## Model Architecture

> **Type:** Temporal Convolutional Network (TCN) Ensemble + Isolation Forest Anomaly Layer
> **Framework:** PyTorch 2.2 + scikit-learn 1.4
> **Input:** 14 sensor features (after dropping 6 zero-variance sensors from FD001)
> **Output:** Scalar RUL prediction in engine cycles (regression)

### TCN Architecture (5-Point Framework)

**What:**
A stack of 4 `TemporalBlock` modules, each implementing dilated causal convolutions with a residual skip connection. Dilation doubles per block (1, 2, 4, 8), giving the network a receptive field of 17+ timesteps. A final linear head maps the last timestep's features to a scalar RUL output.

```
Input (batch, 30, 14)
  → TemporalBlock [dilation=1, ch=64]
  → TemporalBlock [dilation=2, ch=128]
  → TemporalBlock [dilation=4, ch=128]
  → TemporalBlock [dilation=8, ch=64]
  → fc(64 → 1)
→ RUL prediction (batch,)
```

**Why:**
TCN was selected over LSTM/GRU because:
1. Parallelizable training (no sequential hidden state dependency) → 50% faster than bidirectional LSTM
2. Flexible receptive field via dilation — captures both short-range and long-range degradation patterns
3. Causal constraint is exact and explicit (no leakage through future timesteps)
4. Performance: 12.8 RMSE vs 17.2 for LSTM on FD001 test set

**How:**
- Trained with Adam (lr=0.001, betas=(0.9, 0.999)), weight decay 1e-4
- MSE loss on RUL_capped target (cap=125 cycles)
- Stratified 80/20 train/val split per engine unit
- Early stopping (patience=15 epochs, monitored on val MSE)
- Gradient clipping (max_norm=1.0) to prevent exploding gradients
- Hardware: any CPU; GPU (CUDA) supported via `device=auto`

**Result:**
| Metric     | Value    |
|------------|----------|
| RMSE       | 12.8 cycles |
| MAE        | 9.7 cycles |
| R²         | 0.91 |
| NASA Score | 284 |

**Limit:**
- Calibrated on FD001 (single operating condition). Performance on FD002/FD004 (6 operating conditions) is lower without re-training on those subsets.
- Not suitable for real-time inference with hard < 50ms latency requirements (measured ~140ms on CPU).
- RUL cap of 125 cycles means the model does not distinguish between engines at cycle 200 and cycle 400 — early-lifecycle precision is intentionally sacrificed.

---

## Hyperparameters

```yaml
# configs/model_config.yaml
tcn:
  input_channels: 14
  num_channels: [64, 128, 128, 64]
  kernel_size: 3
  dropout: 0.2
  sequence_length: 30

rul:
  cap: 125
  dataset: FD001
```

---

## Isolation Forest (Anomaly Detection)

| Parameter       | Value  | Rationale                                     |
|-----------------|--------|-----------------------------------------------|
| n_estimators    | 200    | Sufficient tree count for stable anomaly scores|
| contamination   | 0.05   | ~5% anomaly rate expected in degraded engines  |
| max_samples     | auto   | Defaults to min(256, n_samples)               |
| random_state    | 42     | Reproducibility                               |

---

## SHAP Explainability

- **Explainer:** `shap.DeepExplainer` for PyTorch TCN
- **Background samples:** 100 randomly selected training sequences
- **Output:** Per-sensor SHAP values for each test engine unit
- **Visualization:** Waterfall charts (per-engine) and summary bar (fleet-wide)

---

## Training Details

| Setting          | Value           |
|------------------|-----------------|
| Optimizer        | Adam            |
| Learning rate    | 0.001           |
| Weight decay     | 1e-4            |
| Epochs (max)     | 100             |
| Early stopping   | patience=15     |
| Batch size       | 64              |
| Validation split | 20% of engines  |
| Gradient clip    | max_norm=1.0    |
| Training time    | ~4 min (CPU)    |

---

## Limitations & Known Issues

1. **Domain shift:** Performance degrades on engines from operating regimes not represented in training data (FD002/FD004 require separate fine-tuning).
2. **Sensor coverage:** 6 zero-variance sensors (sensor_1, 5, 10, 16, 18, 19) are dropped — models trained on data where these sensors have variance are incompatible with this checkpoint.
3. **RUL floor:** Model will predict negative RUL for engines well past failure horizon — add a `max(0, pred)` clip in production.
4. **SHAP latency:** DeepExplainer runs synchronously — expect +200–400ms per inference request. Batch offline if throughput > 10 req/s.
