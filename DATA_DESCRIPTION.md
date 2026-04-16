# Data Description

> ⚠️ **Raw data files are NOT included in this repository** — excluded via `.gitignore`. See the [Download Instructions](#how-to-obtain-the-data) section below.

---

## Dataset Overview

| Attribute       | Value                                                   |
|-----------------|---------------------------------------------------------|
| **Source**      | NASA Ames Prognostics Center of Excellence (PCOE)       |
| **Dataset**     | C-MAPSS (Commercial Modular Aero-Propulsion System Simulation) |
| **Subsets**     | FD001, FD002, FD003, FD004                              |
| **Train rows**  | 20,631 cycles / 100 engines (FD001)                     |
| **Test rows**   | 13,096 cycles / 100 engines (FD001)                     |
| **Features**    | 26 columns: unit ID, cycle, 3 op settings, 21 sensors   |
| **Target**      | Remaining Useful Life (RUL) — integer, in engine cycles  |
| **Format**      | Space-delimited `.txt`, no header row                   |
| **Date**        | Published 2008 — standard RUL prediction benchmark      |

---

## Subset Summary

| Subset | Training Engines | Op. Conditions | Fault Modes |
|--------|:---------------:|:--------------:|:-----------:|
| FD001  | 100             | 1              | 1 (HPC)     |
| FD002  | 260             | 6              | 1 (HPC)     |
| FD003  | 100             | 1              | 2 (HPC+fan) |
| FD004  | 248             | 6              | 2 (HPC+fan) |

**SentinelIQ is trained and evaluated on FD001 by default.** Use `configs/model_config.yaml` to switch subsets.

---

## Column Schema

| Column Index | Name             | Type    | Description                          |
|:------------:|------------------|---------|--------------------------------------|
| 0            | unit_id          | int32   | Engine unit number (1–100 in FD001)  |
| 1            | time_in_cycles   | int32   | Operational cycle count              |
| 2            | op_setting_1     | float32 | Flight altitude proxy                |
| 3            | op_setting_2     | float32 | Throttle resolver angle              |
| 4            | op_setting_3     | float32 | Mach number (constant in FD001)      |
| 5            | sensor_1         | float32 | Fan inlet temperature (°R) — **zero variance FD001** |
| 6            | sensor_2         | float32 | LPC outlet temperature (°R)          |
| 7            | sensor_3         | float32 | HPC outlet temperature (°R)          |
| 8            | sensor_4         | float32 | LPT outlet temperature (°R)          |
| 9            | sensor_5         | float32 | Fan inlet pressure (psia) — **zero variance FD001** |
| 10           | sensor_6         | float32 | Bypass-duct pressure (psia)          |
| 11           | sensor_7         | float32 | Total pressure at HPC exit (psia)    |
| 12           | sensor_8         | float32 | Physical fan speed (rpm)             |
| 13           | sensor_9         | float32 | Physical core speed (rpm)            |
| 14           | sensor_10        | float32 | Engine pressure ratio — **zero variance FD001** |
| 15           | sensor_11        | float32 | HPC outlet static pressure (psia)    |
| 16           | sensor_12        | float32 | Fuel flow ratio (pps/psia)           |
| 17           | sensor_13        | float32 | Corrected fan speed (rpm)            |
| 18           | sensor_14        | float32 | Corrected core speed (rpm)           |
| 19           | sensor_15        | float32 | Bypass ratio                         |
| 20           | sensor_16        | float32 | Burner fuel-air ratio — **zero variance FD001** |
| 21           | sensor_17        | float32 | Bleed enthalpy                       |
| 22           | sensor_18        | float32 | Required fan speed — **zero variance FD001** |
| 23           | sensor_19        | float32 | Required fan conversion speed — **zero variance FD001** |
| 24           | sensor_20        | float32 | HP turbine coolant bleed (lbm/s)     |
| 25           | sensor_21        | float32 | LPT coolant bleed (lbm/s)            |

> Sensors marked **zero variance FD001** are dropped during preprocessing — they carry no information for single-regime data.

---

## How to Obtain the Data

### Option A: Kaggle (Fastest)

```bash
# Install Kaggle CLI
pip install kaggle

# Download (requires ~/.kaggle/kaggle.json credentials)
kaggle datasets download -d behrad3d/nasa-cmaps -p data/raw/ --unzip
```

### Option B: NASA Direct

1. Visit the [NASA PCOE Data Repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/)
2. Search for **"CMAPSS Jet Engine Simulated Data"**
3. Download `CMAPSSData.zip` → extract to `data/raw/`

### Option C: Makefile

```bash
make download-data
```

Expected files after download:

```
data/raw/
├── train_FD001.txt
├── test_FD001.txt
├── RUL_FD001.txt
├── train_FD002.txt  ← (optional)
├── ...
```

---

## Preprocessing Steps

Implemented in `src/data/data_loader.py` and `src/features/build_features.py`:

| Step | Implementation | Details |
|------|---------------|---------|
| 1. Assign column names | `CMAPSSLoader._load()` | 26 columns per the schema above |
| 2. Downcast dtypes | `_optimize_dtypes()` | float64→float32, saves ~50% memory |
| 3. Validate integrity | `_validate_data()` | Null check, sensor count, RUL alignment |
| 4. Compute RUL | `FeatureEngineer.compute_rul()` | max_cycle_per_unit − current_cycle |
| 5. Cap RUL at 125 | `cap_rul()` | Piecewise linear — Heimes (2008) |
| 6. Operating clusters | `_cluster_operating_conditions()` | K-Means (k=6) for FD002/FD004; skip for FD001 |
| 7. Drop zero-variance | `remove_constant_sensors()` | 6 sensors removed for FD001 |
| 8. StandardScaler | `normalize()` | Fit on train only (no data leakage) |

Output saved to `data/processed/fd001_train_features.parquet`.
