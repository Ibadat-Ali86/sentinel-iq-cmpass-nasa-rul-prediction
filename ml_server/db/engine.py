"""
SentinelIQ — Async Database Engine
=====================================

Provides:
  - create_async_engine backed by asyncpg
  - async_sessionmaker for dependency injection
  - init_db()  — called once at FastAPI lifespan startup
  - get_db()   — FastAPI dependency that yields an AsyncSession

Environment variable:
  DATABASE_URL — asyncpg-format URL, e.g.
      postgresql+asyncpg://user:pass@host:5432/dbname

  If DATABASE_URL is not set the module loads silently in
  "no-DB" mode — all CRUD calls are no-ops (graceful degradation).

Author: SentinelIQ Team
Version: 2.0
"""

import logging
import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

logger = logging.getLogger(__name__)

# ── Read configuration ──────────────────────────────────────────────────────

_RAW_URL: str | None = os.getenv("DATABASE_URL")

# Supabase / some providers give postgres:// — normalise to asyncpg driver
def _normalise_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    # Already has asyncpg — leave as-is
    return url


if _RAW_URL:
    _DATABASE_URL = _normalise_url(_RAW_URL)
    logger.info("Database URL configured (asyncpg).")
else:
    _DATABASE_URL = None
    logger.warning(
        "DATABASE_URL not set — running in no-DB mode. "
        "Predictions will NOT be persisted to PostgreSQL."
    )

# ── Engine + Session factory ────────────────────────────────────────────────

if _DATABASE_URL:
    engine = create_async_engine(
        _DATABASE_URL,
        echo=False,            # Set True for SQL debug logging
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,    # Detect stale connections
        pool_recycle=1800,     # Recycle connections every 30 min
    )
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
else:
    engine = None              # type: ignore[assignment]
    AsyncSessionLocal = None   # type: ignore[assignment]


# ── init_db — called at FastAPI startup ────────────────────────────────────

async def init_db() -> None:
    """
    Create all ORM-mapped tables if they do not already exist.

    Safe to call on every startup — uses CREATE TABLE IF NOT EXISTS.
    In production (Supabase) prefer running db/schema.sql directly.
    """
    if engine is None:
        logger.info("init_db() skipped — no DATABASE_URL configured.")
        return

    from ml_server.db.models import Base  # local import avoids circular import

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialised (CREATE IF NOT EXISTS).")


# ── get_db — FastAPI dependency ─────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession | None, None]:
    """
    FastAPI dependency — yields an AsyncSession or None (no-DB mode).

    Usage:
        @router.post("/predict/rul")
        async def predict_rul(db: AsyncSession | None = Depends(get_db)):
            if db:
                await crud.log_prediction(db, ...)
    """
    if AsyncSessionLocal is None:
        yield None  # No-DB mode — callers must handle None
        return

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
