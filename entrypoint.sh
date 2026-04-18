#!/usr/bin/env bash
# =============================================================================
# SentinelIQ — Container Entrypoint
# =============================================================================
# 1. Wait for PostgreSQL to accept connections (up to 60 s)
# 2. Start the FastAPI/Uvicorn server
#
# Environment variables:
#   DATABASE_URL     — asyncpg connection string (optional; skip DB wait if unset)
#   ML_SERVER_HOST   — bind host (default: 0.0.0.0)
#   ML_SERVER_PORT   — bind port (default: 8000)
#   UVICORN_WORKERS  — number of Uvicorn workers (default: 2)
# =============================================================================

set -euo pipefail

HOST="${ML_SERVER_HOST:-0.0.0.0}"
PORT="${ML_SERVER_PORT:-7860}"
WORKERS="${UVICORN_WORKERS:-2}"

# ── Wait for PostgreSQL ───────────────────────────────────────────────────────

wait_for_postgres() {
    # Extract host:port from DATABASE_URL
    # Supports:  postgresql+asyncpg://user:pass@HOST:PORT/db
    #            postgresql://user:pass@HOST:PORT/db
    local url="${DATABASE_URL:-}"

    if [[ -z "$url" ]]; then
        echo "[entrypoint] DATABASE_URL not set — skipping Postgres wait."
        return 0
    fi

    # Strip driver prefix → plain postgresql:// for parsing
    url="${url/postgresql+asyncpg:\/\//postgresql:\/\/}"
    url="${url/postgres+asyncpg:\/\//postgresql:\/\/}"

    # Extract host and port using parameter expansion
    local hostport
    hostport=$(echo "$url" | sed -E 's|.*@([^/]+)/.*|\1|')
    local pg_host="${hostport%%:*}"
    local pg_port="${hostport##*:}"
    pg_port="${pg_port:-5432}"

    echo "[entrypoint] Waiting for PostgreSQL at ${pg_host}:${pg_port} ..."

    local retries=30
    until python -c "
import socket, sys
try:
    s = socket.create_connection(('${pg_host}', ${pg_port}), timeout=2)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
        retries=$((retries - 1))
        if [[ $retries -le 0 ]]; then
            echo "[entrypoint] ERROR: PostgreSQL did not become ready in time. Exiting."
            exit 1
        fi
        echo "[entrypoint] Postgres not yet ready (${retries} retries left) — sleeping 2s..."
        sleep 2
    done

    echo "[entrypoint] PostgreSQL is ready."
}

wait_for_postgres

# ── Start Uvicorn ─────────────────────────────────────────────────────────────

echo "[entrypoint] Starting SentinelIQ ML Server on ${HOST}:${PORT} (workers=${WORKERS})"

exec uvicorn ml_server.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --workers "$WORKERS" \
    --log-level info \
    --no-access-log
