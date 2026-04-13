"""
SentinelIQ — FastAPI Application Entry Point
==============================================

Starts the SentinelIQ ML inference server.

Usage:
    # Development (auto-reload)
    uvicorn ml_server.main:app --reload --host 0.0.0.0 --port 8000

    # Production
    uvicorn ml_server.main:app --host 0.0.0.0 --port 8000 --workers 2

    # Docker (see Dockerfile)
    docker run -p 8000:8000 sentineliq-server

API Documentation:
    http://localhost:8000/docs      — Swagger UI
    http://localhost:8000/redoc     — ReDoc

Author: SentinelIQ Team
Version: 2.0
"""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure the repo root (parent of ml_server/) is on sys.path so `src` is importable
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import config
from ml_server.db import init_db
from ml_server.routers import health, predict, anomaly
from ml_server.services.inference import InferenceService
from ml_server.schemas.responses import ErrorResponse

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("sentineliq.server")


# ── Lifespan: startup + shutdown ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.

    ON STARTUP:
      - Initialise InferenceService
      - Load model checkpoints from disk
      - Attach service to app.state for router access

    ON SHUTDOWN:
      - Log graceful shutdown message
    """
    logger.info("=" * 60)
    logger.info("SentinelIQ ML Server — Starting up")
    logger.info("=" * 60)

    # ── Database ──────────────────────────────────────────────────────────
    try:
        await init_db()
        logger.info("Database        : ready")
    except Exception as exc:
        logger.warning("Database init failed (server still starts): %s", exc)

    # ── ML Models ─────────────────────────────────────────────────────────
    svc = InferenceService(config=config)
    svc.load_models()
    app.state.inference_service = svc

    loaded = [k for k, v in svc.models_loaded.items() if v]
    missing = [k for k, v in svc.models_loaded.items() if not v]
    logger.info("Models loaded   : %s", loaded or "none")
    if missing:
        logger.warning("Models missing  : %s (run training pipeline)", missing)

    logger.info("Device          : %s", svc.device_str)
    logger.info("Active features : %d", len(svc.feature_cols))
    logger.info("Docs available  : http://localhost:8000/docs")
    logger.info("=" * 60)

    yield  # Server is running

    logger.info("SentinelIQ ML Server — Shutting down gracefully")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="SentinelIQ ML Server",
    description=(
        "## SentinelIQ v2.0 — Predictive Maintenance ML API\n\n"
        "Provides real-time Remaining Useful Life (RUL) prediction and anomaly detection "
        "for NASA C-MAPSS turbofan engines using LSTM, TCN, and Autoencoder models.\n\n"
        "### Quick Start\n"
        "1. `GET /health` — verify server is running\n"
        "2. `GET /status` — check which models are loaded\n"
        "3. `POST /predict/rul` — predict RUL for a single engine\n"
        "4. `POST /predict/anomaly` — anomaly score for current sensor readings\n"
        "5. `POST /predict/batch` — RUL predictions for up to 100 engines\n\n"
        "### Model Checkpoints Required\n"
        "Run `python pipeline/sentineliq_ml_pipeline.py` to train and save models before "
        "starting the server."
    ),
    version="2.0.0",
    contact={
        "name": "SentinelIQ Team",
        "url": "https://github.com/Ibadat-Ali86/sentinel-iq-cmpass-nasa-rul-prediction",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # Next.js dev server
        "http://localhost:3001",
        "https://sentineliq.vercel.app",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler — returns a structured ErrorResponse on unexpected errors."""
    from datetime import datetime, timezone
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="INTERNAL_SERVER_ERROR",
            detail=str(exc),
            timestamp=datetime.now(tz=timezone.utc),
        ).model_dump(mode="json"),
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(anomaly.router)


# ── Root redirect ─────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API docs."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


# ── Dev runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ml_server.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
