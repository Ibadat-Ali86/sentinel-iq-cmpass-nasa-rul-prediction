"""
SentinelIQ — SQLAlchemy ORM Models
=====================================

Maps the PostgreSQL tables defined in db/schema.sql to Python classes.

NOTE: These are DATABASE models, not PyTorch models.
      PyTorch model classes live in src/models.py.

Tables:
  - unit_metadata    → UnitMetadata
  - prediction_logs  → PredictionLog
  - anomaly_events   → AnomalyEvent

Uses SQLAlchemy 2.0 "Mapped" + "mapped_column" declarative style.

Author: SentinelIQ Team
Version: 2.0
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


# ── Base ─────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """Shared declarative base for all SentinelIQ ORM models."""
    pass


# ── UnitMetadata ─────────────────────────────────────────────────────────────

class UnitMetadata(Base):
    """
    Engine fleet registry — one row per turbofan unit.

    Corresponds to the `unit_metadata` table.
    """
    __tablename__ = "unit_metadata"
    __table_args__ = (
        CheckConstraint(
            "dataset IN ('FD001','FD002','FD003','FD004')",
            name="unit_metadata_dataset_chk",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[int] = mapped_column(
        Integer, nullable=False, unique=True, index=True
    )
    dataset: Mapped[str] = mapped_column(
        String(10), nullable=False, default="FD001"
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    commissioned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    prediction_logs: Mapped[list["PredictionLog"]] = relationship(
        "PredictionLog",
        back_populates="unit",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<UnitMetadata unit_id={self.unit_id} dataset={self.dataset}>"


# ── PredictionLog ─────────────────────────────────────────────────────────────

class PredictionLog(Base):
    """
    Audit log of every RUL prediction from /predict/rul.

    Corresponds to the `prediction_logs` table.
    """
    __tablename__ = "prediction_logs"
    __table_args__ = (
        CheckConstraint(
            "severity IN ('critical','warning','normal')",
            name="prediction_logs_severity_chk",
        ),
        CheckConstraint(
            "predicted_rul >= 0",
            name="prediction_logs_rul_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("unit_metadata.unit_id", ondelete="CASCADE", deferrable=True),
        nullable=False,
        index=True,
    )
    dataset: Mapped[str] = mapped_column(
        String(10), nullable=False, default="FD001"
    )
    predicted_rul: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    model_used: Mapped[str] = mapped_column(String(20), nullable=False, default="TCN")
    inference_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    sequence_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    # Relationship back to unit
    unit: Mapped["UnitMetadata"] = relationship(
        "UnitMetadata",
        back_populates="prediction_logs",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<PredictionLog unit_id={self.unit_id} "
            f"rul={self.predicted_rul:.1f} [{self.severity}]>"
        )


# ── AnomalyEvent ──────────────────────────────────────────────────────────────

class AnomalyEvent(Base):
    """
    Log of every anomaly detection call from /predict/anomaly.

    Corresponds to the `anomaly_events` table.
    Note: `is_anomaly` is a server-side GENERATED ALWAYS column —
    it is NOT mapped here to avoid ORM write conflicts; read it via raw SQL.
    """
    __tablename__ = "anomaly_events"
    __table_args__ = (
        CheckConstraint(
            "severity IN ('critical','warning','normal')",
            name="anomaly_events_severity_chk",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True, index=True
    )
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)
    isolation_forest_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    reconstruction_error: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<AnomalyEvent unit_id={self.unit_id} "
            f"score={self.anomaly_score:.3f} [{self.severity}]>"
        )
