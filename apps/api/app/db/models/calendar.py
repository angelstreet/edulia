from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin


class CalendarEvent(Base, TenantMixin):
    __tablename__ = "calendar_events"

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=True)
    event_type = Column(String(50), nullable=False, default="general")  # general|holiday|exam|meeting
    color = Column(String(20), nullable=True)
    target_roles = Column(String(255), nullable=True)  # comma-separated or null = all
    created_by = Column(UUID(as_uuid=True), nullable=True)
