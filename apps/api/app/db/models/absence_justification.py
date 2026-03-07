import uuid
from datetime import datetime, date
from sqlalchemy import Column, DateTime, Date, ForeignKey, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TenantMixin


class AbsenceJustification(Base, TenantMixin):
    __tablename__ = "absence_justifications"

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # parent
    absence_date = Column(Date, nullable=False)
    reason = Column(String(50), nullable=False)  # illness|family|transport|other
    description = Column(Text, nullable=True)
    document_url = Column(Text, nullable=True)  # optional uploaded doc
    status = Column(String(20), default="pending", nullable=False)  # pending|accepted|rejected
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
