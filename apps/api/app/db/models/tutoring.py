import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TenantMixin


class TutoringSession(Base, TenantMixin):
    __tablename__ = "tutoring_sessions"

    tutor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    session_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    rate_cents = Column(Integer, nullable=False, default=0)  # per-session rate
    status = Column(String(20), default="completed")  # scheduled|completed|cancelled|no_show
    notes = Column(Text, nullable=True)  # private tutor notes
    homework_given = Column(Text, nullable=True)  # visible to student/parent
    package_id = Column(UUID(as_uuid=True), ForeignKey("tutoring_packages.id"), nullable=True)
    invoiced = Column(Boolean, default=False, nullable=False)


class TutoringPackage(Base, TenantMixin):
    __tablename__ = "tutoring_packages"

    tutor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)  # e.g. "10 sessions maths"
    sessions_total = Column(Integer, nullable=False)
    sessions_used = Column(Integer, default=0, nullable=False)
    price_cents = Column(Integer, nullable=False)  # total package price
    status = Column(String(20), default="active")  # active|completed|cancelled
    paid = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)


class TutoringInvoice(Base, TenantMixin):
    __tablename__ = "tutoring_invoices"

    tutor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    invoice_number = Column(String(50), nullable=False)
    period_label = Column(String(50), nullable=True)  # e.g. "March 2026"
    line_items = Column(JSONB, default=list)  # [{desc, qty, unit_price_cents, total_cents}]
    total_cents = Column(Integer, nullable=False, default=0)
    paid = Column(Boolean, default=False, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
