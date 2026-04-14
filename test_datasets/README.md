# SentinelIQ — Synthetic Test Datasets

> ⚙️ Generated for **SentinelIQ RUL prediction system** — NASA C-MAPSS format compatibility testing.

## Quick Start

Run the generator script to create the CSV files:

```bash
cd /path/to/sentinel-iq-cmpass-nasa-rul-prediction
python3 generate_test_datasets.py
```

---

## Files

| File | Style | Units | Description |
|------|-------|-------|-------------|
| `sentineliq_test_FD001_style.csv` | FD001 (single fault mode) | 20 | Sea-level, single HPC degradation path |
| `sentineliq_test_FD003_style.csv` | FD003 (two fault modes)   | 20 | Sea-level, HPC + Fan fault modes alternating |

---

## Column Schema (26 columns total)

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | `unit` | int | Engine unit ID (1-indexed) |
| 2 | `cycle` | int | Operational cycle number (starts at 1, ends at failure) |
| 3 | `op_setting_1` | float | Altitude proxy (near-zero for sea-level) |
| 4 | `op_setting_2` | float | Mach number proxy |
| 5 | `op_setting_3` | float | Throttle resolver angle (~100) |
| 6 | `s1` | float | Total temperature at fan inlet (°R) |
| 7 | `s2` | float | Total temperature at LPC outlet (°R) |
| 8 | `s3` | float | Total temperature at HPC outlet (°R) |
| 9 | `s4` | float | Total temperature at LPT outlet (°R) |
| 10 | `s5` | float | Pressure at fan inlet (psia) |
| 11 | `s6` | float | Total pressure in bypass-duct (psia) |
| 12 | `s7` | float | Total pressure at HPC outlet (psia) |
| 13 | `s8` | float | Physical fan speed (rpm) |
| 14 | `s9` | float | Physical core speed (rpm) |
| 15 | `s10` | float | Engine pressure ratio |
| 16 | `s11` | float | Static pressure at HPC outlet (psia) |
| 17 | `s12` | float | Ratio of fuel flow to Ps30 (pps/psia) |
| 18 | `s13` | float | Corrected fan speed (rpm) |
| 19 | `s14` | float | Corrected core speed (rpm) |
| 20 | `s15` | float | Bypass ratio |
| 21 | `s16` | float | Burner fuel-air ratio |
| 22 | `s17` | float | Bleed enthalpy |
| 23 | `s18` | float | Required fan speed |
| 24 | `s19` | float | Required fan conversion speed |
| 25 | `s20` | float | HP turbines cool air flow |
| 26 | `s21` | float | LP turbines cool air flow |

---

## Ground Truth RUL

```
RUL(unit, cycle) = max_cycle_for_unit - cycle
```

The RUL is **not stored** in the file (as in the original NASA C-MAPSS format). It is derived from the maximum cycle count per unit.

---

## Fault Modes

| Dataset | Fault | Primary Sensors |
|---------|-------|-----------------|
| FD001-style | High-Pressure Compressor (HPC) | s3, s4, s7, s11, s12 |
| FD003-style (odd units) | High-Pressure Compressor (HPC) | s3, s4, s7, s11, s12 |
| FD003-style (even units) | Fan / LPC | s2, s8, s9, s13, s14 |

---

## Example Row

```
unit,cycle,op_setting_1,op_setting_2,op_setting_3,s1,s2,...,s21
1,1,0.0003,-0.0001,100.02,518.72,641.95,1589.83,...,23.44
1,2,0.0001,0.0000,99.98,518.69,641.91,1589.87,...,23.45
...
1,189,0.0002,-0.0002,100.01,519.14,649.32,1607.30,...,24.88
2,1,...
```

---

## Notes

- Sensors use approximate NASA C-MAPSS baselines with realistic Gaussian noise.  
- Degradation is modeled as a slightly nonlinear function of lifecycle fraction.  
- These are **synthetic datasets** intended for UI/model evaluation. For training, use real NASA C-MAPSS data from [Prognostics Center of Excellence](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/).
