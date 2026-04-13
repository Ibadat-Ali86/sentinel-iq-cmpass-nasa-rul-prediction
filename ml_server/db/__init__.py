"""
SentinelIQ — Database Package
================================

Exports the async SQLAlchemy engine, session factory, and FastAPI
dependency for router injection.

Usage in a router:
    from ml_server.db import get_db
    from sqlalchemy.ext.asyncio import AsyncSession
    from fastapi import Depends

    @router.post("/predict/rul")
    async def predict_rul(payload: ..., db: AsyncSession = Depends(get_db)):
        ...
"""

from ml_server.db.engine import AsyncSessionLocal, engine, get_db, init_db

__all__ = ["engine", "AsyncSessionLocal", "get_db", "init_db"]
