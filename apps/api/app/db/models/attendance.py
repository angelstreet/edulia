from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin


class AttendanceRecord(Base, TenantMixin):
    __tablename__ = "attendance_records"

    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="present")  # present|absent|late|excused|sick
    late_minutes = Column(Integer, nullable=True)
    reason = Column(Text, nullable=True)
    justified = Column(Boolean, default=False, nullable=False)
    justified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    justified_at = Column(DateTime, nullable=True)
    justification_document_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=True)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
