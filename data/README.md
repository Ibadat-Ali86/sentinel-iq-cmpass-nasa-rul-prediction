# Data Directory

> ⚠️ **Raw data files are NOT included in this repository** — they are excluded via `.gitignore` to comply with NASA's data repository terms and to keep the repo lightweight.

---

## Dataset: NASA C-MAPSS (Commercial Modular Aero-Propulsion System Simulation)

| Attribute       | Details                                                          |
|-----------------|------------------------------------------------------------------|
| **Source**      | [NASA Ames Prognostics Data Repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/) |
| **Dataset**     | C-MAPSS (Turbofan Engine Degradation Simulation)                 |
| **Subsets**     | FD001, FD002, FD003, FD004                                       |
| **Format**      | Space-delimited `.txt` files (no header row)                     |
| **Rows**        | ~20,631 training cycles across 100 engines (FD001)               |
| **Features**    | 26 columns: unit ID, cycle, 3 operational settings, 21 sensors   |
| **Target**      | Remaining Useful Life (RUL) — continuous, in engine cycles       |
| **License**     | Publicly available for research use — see NASA PCOE terms        |

---

## Directory Layout

```
data/
├── raw/            ← Original .txt files from NASA (never modified)
│   ├── train_FD001.txt
│   ├── test_FD001.txt
│   └── RUL_FD001.txt
├── processed/      ← Cleaned, normalized, feature-engineered Parquet/CSV
│   └── fd001_train_features.parquet
└── external/       ← Third-party derived data (e.g., reference RUL curves)
```

---

## How to Obtain the Data

### Option A: Manual Download (Recommended)

1. Visit the [NASA PCOE Data Repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/)
2. Search for **"CMAPSS Jet Engine Simulated Data"**
3. Download and extract `CMAPSSData.zip`
4. Place `.txt` files into `data/raw/`:

```bash
unzip CMAPSSData.zip -d data/raw/
```

### Option B: Via Makefile

```bash
make download-data
```

> This runs `src/data/data_loader.py` which fetches from a cached mirror. See `Makefile` for details.

---

## Column Schema (All Subsets)

| Column Index | Name              | Type        | Description                          |
|-------------|-------------------|-------------|--------------------------------------|
| 0            | unit_id           | Integer     | Engine unit number                   |
| 1            | time_in_cycles    | Integer     | Operational cycle count              |
| 2            | op_setting_1      | Float       | Operational setting 1                |
| 3            | op_setting_2      | Float       | Operational setting 2                |
| 4            | op_setting_3      | Float       | Operational setting 3                |
| 5–25         | sensor_1–sensor_21| Float       | 21 sensor measurements               |

---

## Preprocessing Steps

Performed by `src/data/data_loader.py` and `src/features/build_features.py`:

1. Assign column names (raw files have no header)
2. Drop zero-variance sensors (sensor_1, sensor_5, sensor_10, sensor_16, sensor_18, sensor_19)
3. Compute RUL label: `max_cycle - current_cycle` per engine unit
4. Cap RUL at 125 cycles (piecewise linear health index)
5. Normalize features using `MinMaxScaler` fitted on training split only
6. Generate rolling statistics (window = 30 cycles): mean, std per sensor
7. Output saved as `.parquet` in `data/processed/`
