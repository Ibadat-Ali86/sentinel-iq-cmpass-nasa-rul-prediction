# Installation Guide

## System Requirements

| Requirement | Minimum         | Recommended      |
|-------------|-----------------|------------------|
| Python      | 3.10            | 3.11             |
| RAM         | 8 GB            | 16 GB+           |
| GPU         | None (CPU ok)   | CUDA 11.8+ / 12.x|
| Disk        | 5 GB            | 20 GB+ (with Docker volumes) |
| Docker      | 24.x (optional) | latest           |
| Node.js     | 20 (frontend dev only) | 22 LTS   |

---

## Installation Methods

### Method 1: Pip (Standard — Backend Only)

```bash
# 1. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\activate         # Windows

# 2. Install pinned dependencies
pip install -r requirements.txt

# 3. Install the package (editable mode — for development)
pip install -e ".[dev]"

# 4. Verify installation
python -c "from src.models.models import TCNModel; print('✅ src imports OK')"
python -c "from ml_server.main import app; print('✅ FastAPI app OK')"
```

### Method 2: Makefile (Recommended for development)

```bash
make install
```

This runs `pip install -r requirements.txt && pip install -e ".[dev]"` in one step.

### Method 3: Docker Compose (Full Stack — Production)

```bash
# Build and start all services (FastAPI + Next.js + PostgreSQL + NGINX)
make docker-up
# or: docker-compose up -d --build

# Confirm all containers are running
docker-compose ps

# View logs
make docker-logs
```

Services and ports:

| Service     | Port        | URL                         |
|-------------|-------------|-----------------------------|
| NGINX       | 80          | http://localhost             |
| Next.js     | 3000        | http://localhost:3000        |
| FastAPI     | 8000        | http://localhost:8000        |
| PostgreSQL  | 5432        | (internal only)              |

---

## Environment Variables

Copy the template and fill in your values:

```bash
cp .env.example .env
```

Essential variables (see `.env.example` for full list):

| Variable         | Description                   | Example                              |
|------------------|-------------------------------|--------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string  | `postgresql://user:pass@db:5432/sentinel` |
| `SECRET_KEY`     | FastAPI session signing key   | `your-32-char-random-secret`         |
| `MODEL_PATH`     | Path to trained checkpoint    | `models/tcn_best.pth`               |
| `ENVIRONMENT`    | Deployment environment        | `development` or `production`        |

---

## Running the ML Pipeline

```bash
# 1. Download the NASA C-MAPSS dataset
make download-data

# 2. Train the TCN model
make train

# 3. Evaluate and generate report figures
make evaluate

# 4. (Optional) Execute all notebooks
make notebooks
```

---

## Troubleshooting

**Issue:** `ModuleNotFoundError: No module named 'src'`

**Fix:** Install in editable mode from the project root:
```bash
pip install -e .
```

---

**Issue:** `FileNotFoundError: data/raw/train_FD001.txt`

**Fix:** Download the NASA C-MAPSS dataset first:
```bash
make download-data
# or see data/README.md for manual download instructions
```

---

**Issue:** `CUDA out of memory`

**Fix:** Reduce batch size in `configs/training_config.yaml`:
```yaml
training:
  batch_size: 32    # reduce from 64
```

---

**Issue:** `docker-compose up` fails with port conflict

**Fix:** Another service is using port 80, 3000, or 8000. Stop the conflicting service or change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8888:8000"    # map host 8888 → container 8000
```

---

**Issue:** Frontend shows blank page after `npm run dev`

**Fix:** Ensure the FastAPI server is running first:
```bash
make api   # terminal 1
cd frontend && npm run dev   # terminal 2
```

---

## Uninstalling

```bash
# Remove virtual environment
rm -rf .venv

# Stop and remove Docker containers + volumes
make docker-down
docker-compose down -v   # removes volumes (WARNING: deletes DB data)

# Clean compiled files
make clean
```
