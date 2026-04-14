#!/usr/bin/env python3
"""
SentinelIQ — Synthetic Test Dataset Generator
Generates 2 NASA C-MAPSS-compatible datasets for model evaluation.

Dataset 1: FD001-style  - Single fault mode, sea-level operating condition, 20 engine units
Dataset 2: FD003-style  - Two fault modes, sea-level operating condition, 20 engine units (higher variability)

Column format (space-separated CSV):
  unit | cycle | op_setting_1 | op_setting_2 | op_setting_3 | s1 .. s21

RUL (Remaining Useful Life) is determined as: max_cycle - current_cycle
"""

import csv
import math
import random
import os

random.seed(42)

OUTPUT_DIR = "test_datasets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── NASA C-MAPSS approximate sensor baselines (FD001 sea-level conditions) ─────
BASELINES = {
    "s1":  518.67,   # Total temperature at fan inlet (°R)
    "s2":  641.82,   # Total temperature at LPC outlet (°R)
    "s3":  1589.70,  # Total temperature at HPC outlet (°R)
    "s4":  1400.60,  # Total temperature at LPT outlet (°R)
    "s5":  14.62,    # Pressure at fan inlet (psia)
    "s6":  21.61,    # Total pressure in bypass-duct (psia)
    "s7":  554.36,   # Total pressure at HPC outlet (psia)
    "s8":  2388.06,  # Physical fan speed (rpm)
    "s9":  9046.19,  # Physical core speed (rpm)
    "s10": 1.30,     # Engine pressure ratio
    "s11": 47.47,    # Static pressure at HPC outlet (psia)
    "s12": 521.66,   # Ratio of fuel flow to Ps30 (pps/psia)
    "s13": 2388.02,  # Corrected fan speed (rpm)
    "s14": 8138.62,  # Corrected core speed (rpm)
    "s15": 8.4195,   # Bypass ratio
    "s16": 0.03,     # Burner fuel-air ratio
    "s17": 392.0,    # Bleed enthalpy
    "s18": 2388.0,   # Required fan speed
    "s19": 100.0,    # Required fan conversion speed
    "s20": 39.06,    # HP turbines cool air flow
    "s21": 23.4190,  # LP turbines cool air flow
}

# Sensors that show measurable degradation trend
DEGRADING_SENSORS = ["s2", "s3", "s4", "s7", "s11", "s12", "s14", "s15", "s17", "s20", "s21"]
# Sensors that are near-constant (operational settings measured)
CONSTANT_SENSORS  = ["s1", "s5", "s6", "s10", "s16", "s18", "s19"]

HEADER = (
    ["unit", "cycle", "op_setting_1", "op_setting_2", "op_setting_3"]
    + [f"s{i}" for i in range(1, 22)]
)

# ── Helper ─────────────────────────────────────────────────────────────────
def sensor_value(sensor: str, baseline: float, deg_pct: float, noise_scale: float = 1.0) -> float:
    noise = random.gauss(0, baseline * 0.004 * noise_scale)
    if sensor in DEGRADING_SENSORS:
        trend = baseline * 0.09 * (deg_pct ** 1.2)   # slightly nonlinear
    elif sensor in CONSTANT_SENSORS:
        trend = baseline * 0.001 * deg_pct            # very mild
    else:
        trend = 0.0
    return round(baseline + trend + noise, 4)


def build_row(unit: int, cycle: int, max_cycle: int, noise_scale: float = 1.0) -> dict:
    deg_pct = cycle / max_cycle   # 0 → 1
    row = {
        "unit":         unit,
        "cycle":        cycle,
        "op_setting_1": round(random.uniform(-0.0009,  0.0009), 4),
        "op_setting_2": round(random.uniform(-0.0002,  0.0002), 4),
        "op_setting_3": round(random.uniform(99.92,   100.08), 2),
    }
    for s, baseline in BASELINES.items():
        row[s] = sensor_value(s, baseline, deg_pct, noise_scale)
    return row


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DATASET 1 — FD001-style  (single fault mode, low condition variability)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("Generating Dataset 1 — FD001-style (single fault mode, sea-level)…")
rows1 = []
for unit in range(1, 21):      # 20 engine units
    max_cycle = random.randint(130, 320)
    for cycle in range(1, max_cycle + 1):
        rows1.append(build_row(unit, cycle, max_cycle, noise_scale=1.0))

path1 = os.path.join(OUTPUT_DIR, "sentineliq_test_FD001_style.csv")
with open(path1, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=HEADER)
    writer.writeheader()
    writer.writerows(rows1)

total_rows1 = len(rows1)
units1      = len({r["unit"] for r in rows1})
avg_life1   = total_rows1 / units1
print(f"  ✓ {path1}")
print(f"    Rows: {total_rows1:,}  |  Units: {units1}  |  Avg life: {avg_life1:.0f} cycles")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DATASET 2 — FD003-style  (two fault modes, higher noise, more variability)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print("\nGenerating Dataset 2 — FD003-style (two fault modes, higher variability)…")

# FD003 has TWO fault modes → some engines degrade primarily via HPC fault,
# others via Fan fault. We encode this by scaling specific sensor groups.
HPC_FAULT_SENSORS = ["s3", "s4", "s7", "s11", "s12"]   # high-pressure compressor
FAN_FAULT_SENSORS = ["s2", "s8", "s9", "s13", "s14"]    # fan / LPC

random.seed(73)
rows2 = []
for unit in range(1, 21):
    max_cycle   = random.randint(100, 380)
    fault_mode  = "HPC" if unit % 2 == 1 else "FAN"   # alternating fault modes
    noise_scale = random.uniform(1.1, 1.5)             # more condition variability

    for cycle in range(1, max_cycle + 1):
        deg_pct = cycle / max_cycle
        row = {
            "unit":         unit,
            "cycle":        cycle,
            "op_setting_1": round(random.uniform(-0.0009, 0.0009), 4),
            "op_setting_2": round(random.uniform(-0.0002, 0.0002), 4),
            "op_setting_3": round(random.uniform(99.92, 100.08), 2),
        }
        for s, baseline in BASELINES.items():
            noise = random.gauss(0, baseline * 0.005 * noise_scale)
            # Amplify degradation for the primary fault mode sensors
            if fault_mode == "HPC" and s in HPC_FAULT_SENSORS:
                trend = baseline * 0.12 * (deg_pct ** 1.1)
            elif fault_mode == "FAN" and s in FAN_FAULT_SENSORS:
                trend = baseline * 0.11 * (deg_pct ** 1.15)
            elif s in DEGRADING_SENSORS:
                trend = baseline * 0.06 * (deg_pct ** 1.2)
            else:
                trend = baseline * 0.001 * deg_pct
            row[s] = round(baseline + trend + noise, 4)
        rows2.append(row)

path2 = os.path.join(OUTPUT_DIR, "sentineliq_test_FD003_style.csv")
with open(path2, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=HEADER)
    writer.writeheader()
    writer.writerows(rows2)

total_rows2 = len(rows2)
units2      = len({r["unit"] for r in rows2})
avg_life2   = total_rows2 / units2
print(f"  ✓ {path2}")
print(f"    Rows: {total_rows2:,}  |  Units: {units2}  |  Avg life: {avg_life2:.0f} cycles")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# README
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
readme = f"""# SentinelIQ — Synthetic Test Datasets

Generated by `generate_test_datasets.py` for model evaluation and UI testing.

## Files

| File | Style | Units | Rows | Avg Life |
|------|-------|-------|------|----------|
| sentineliq_test_FD001_style.csv | FD001 (single fault mode) | {units1} | {total_rows1:,} | {avg_life1:.0f} cycles |
| sentineliq_test_FD003_style.csv | FD003 (two fault modes)   | {units2} | {total_rows2:,} | {avg_life2:.0f} cycles |

## Column Schema

| Column | Description |
|--------|-------------|
| `unit` | Engine unit ID (integer, 1-indexed) |
| `cycle` | Operational cycle number (starts at 1) |
| `op_setting_1` | Operational setting 1 (altitude proxy) |
| `op_setting_2` | Operational setting 2 (Mach number proxy) |
| `op_setting_3` | Operational setting 3 (throttle resolver angle) |
| `s1` | Total temperature at fan inlet (°R) |
| `s2` | Total temperature at LPC outlet (°R) |
| `s3` | Total temperature at HPC outlet (°R) |
| `s4` | Total temperature at LPT outlet (°R) |
| `s5` | Pressure at fan inlet (psia) |
| `s6` | Total pressure in bypass-duct (psia) |
| `s7` | Total pressure at HPC outlet (psia) |
| `s8` | Physical fan speed (rpm) |
| `s9` | Physical core speed (rpm) |
| `s10` | Engine pressure ratio |
| `s11` | Static pressure at HPC outlet (psia) |
| `s12` | Ratio of fuel flow to Ps30 (pps/psia) |
| `s13` | Corrected fan speed (rpm) |
| `s14` | Corrected core speed (rpm) |
| `s15` | Bypass ratio |
| `s16` | Burner fuel-air ratio |
| `s17` | Bleed enthalpy |
| `s18` | Required fan speed |
| `s19` | Required fan conversion speed |
| `s20` | HP turbines cool air flow |
| `s21` | LP turbines cool air flow |

## Ground Truth RUL Formula

```
RUL(unit, cycle) = max_cycle_for_unit - cycle
```

## Fault Modes

- **FD001-style**: Single fault mode (HPC degradation). Low operating condition variability.
- **FD003-style**: Two fault modes (HPC + Fan). Alternating between units. Higher noise.

## Notes

- Sensors follow approximate NASA C-MAPSS baselines with realistic Gaussian noise.
- Degradation is modeled as a slightly nonlinear function of remaining life fraction.
- These are synthetic datasets for UI testing. For model training, use real NASA C-MAPSS data.
"""

with open(os.path.join(OUTPUT_DIR, "README.md"), "w") as f:
    f.write(readme)

print(f"\n✓ README written to {OUTPUT_DIR}/README.md")
print("\n✅ All test datasets generated successfully!")
