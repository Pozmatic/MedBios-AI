"""
MedBios AI — Database Models
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def _utcnow():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    hashed_password: Mapped[str] = mapped_column(String(500))
    role: Mapped[str] = mapped_column(String(50), default="Physician")
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=True)
    age: Mapped[int] = mapped_column(nullable=True)
    gender: Mapped[str] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    reports: Mapped[list["Report"]] = relationship(back_populates="patient", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), nullable=True)
    filename: Mapped[str] = mapped_column(String(500))
    document_type: Mapped[str] = mapped_column(String(50), default="lab_report")
    raw_text: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="processing")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # Full analysis result as JSON
    analysis_result: Mapped[dict] = mapped_column(JSON, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="reports")
    lab_results: Mapped[list["LabResult"]] = relationship(back_populates="report", cascade="all, delete-orphan")
    insights: Mapped[list["ClinicalInsight"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class LabResult(Base):
    __tablename__ = "lab_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"))
    test_name: Mapped[str] = mapped_column(String(200))
    value: Mapped[float] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=True)
    reference_min: Mapped[float] = mapped_column(Float, nullable=True)
    reference_max: Mapped[float] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="normal")  # normal, low, high, critical
    raw_text: Mapped[str] = mapped_column(Text, nullable=True)

    report: Mapped["Report"] = relationship(back_populates="lab_results")


class ClinicalInsight(Base):
    __tablename__ = "clinical_insights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"))
    condition: Mapped[str] = mapped_column(String(300))
    confidence: Mapped[str] = mapped_column(String(20))  # high, medium, low
    category: Mapped[str] = mapped_column(String(100))   # e.g. hematology, cardiovascular
    evidence: Mapped[dict] = mapped_column(JSON, nullable=True)
    reasoning: Mapped[str] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str] = mapped_column(Text, nullable=True)

    report: Mapped["Report"] = relationship(back_populates="insights")
