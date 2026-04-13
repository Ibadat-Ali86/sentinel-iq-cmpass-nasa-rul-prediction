# =============================================================================
# SentinelIQ — Multi-Stage Dockerfile
# =============================================================================
# Stage 1: builder  — install all Python dependencies
# Stage 2: runtime  — lean image with only what's needed at runtime
#
# Build:  docker build -t sentineliq-server .
# Run:    docker run -p 8000:8000 --env-file .env sentineliq-server
# =============================================================================

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Build-time system deps (compiler for asyncpg C extension, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy only requirements first so Docker layer cache is reused on code changes
COPY requirements.txt .

# Install to a isolated prefix we'll copy into the runtime stage
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL maintainer="SentinelIQ Team"
LABEL version="2.0"
LABEL description="SentinelIQ ML Inference Server — RUL Prediction & Anomaly Detection"

# Runtime system deps (libpq for asyncpg, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN groupadd --gid 1001 sentineliq \
 && useradd  --uid 1001 --gid sentineliq --no-create-home sentineliq

# ── App directory ─────────────────────────────────────────────────────────────
WORKDIR /app

# Copy application source (respects .dockerignore)
COPY --chown=sentineliq:sentineliq src/           ./src/
COPY --chown=sentineliq:sentineliq ml_server/     ./ml_server/
COPY --chown=sentineliq:sentineliq pipeline/      ./pipeline/
COPY --chown=sentineliq:sentineliq db/            ./db/
COPY --chown=sentineliq:sentineliq entrypoint.sh  ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

# Create runtime directories (volumes mount on top of these)
RUN mkdir -p /app/data/raw /app/data/processed /app/models /app/outputs \
 && chown -R sentineliq:sentineliq /app

USER sentineliq

# ── Environment defaults (override with --env-file or docker-compose) ─────────
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    ML_SERVER_HOST=0.0.0.0 \
    ML_SERVER_PORT=8000

EXPOSE 8000

# Docker health check — pings the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
