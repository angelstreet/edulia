from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin


class Incident(Base, TenantMixin):
    __tablename__ = "incidents"

    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    reported_by = Column(UUID(as_uuid=True), nullable=False)
    incident_type = Column(String(50), nullable=False, default="behavior")  # behavior|absence|late|health|other
    severity = Column(String(20), nullable=False, default="low")  # low|medium|high
    description = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="open")  # open|resolved|escalated
