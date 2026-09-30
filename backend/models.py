# =========================================================
# DATABASE MODELS
# =========================================================

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, index=True)


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_name = Column(String(255), nullable=False)
    examiner_name = Column(String(255), nullable=False)
    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(
        Integer,
        ForeignKey("cases.id"),
        nullable=False,
        index=True,
    )
    filename = Column(String(255), nullable=False)
    original_hash = Column(String(64), nullable=False)
    metadata_json = Column(Text, default="{}", nullable=False)
    status = Column(String(50), default="UPLOADED", nullable=False, index=True)
    clock_offset = Column(Float, default=0.0, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(
        Integer,
        ForeignKey("cases.id"),
        nullable=False,
        index=True,
    )
    evidence_id = Column(
        Integer,
        ForeignKey("evidence.id"),
        nullable=True,
        index=True,
    )
    action = Column(String(255), nullable=False)
    timestamp = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    entry_hash = Column(String(64), nullable=False)


class Triage(Base):
    __tablename__ = "triage"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(
        Integer,
        ForeignKey("evidence.id"),
        nullable=False,
        index=True,
    )
    label = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_json = Column(Text, nullable=False)
    annotated_path = Column(String(500), nullable=False)
    decision = Column(
        String(20),
        default="PENDING",
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
