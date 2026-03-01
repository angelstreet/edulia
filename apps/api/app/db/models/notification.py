from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin


class Notification(Base, TenantMixin):
    __tablename__ = "notifications"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String(20), default="info")  # info|warning|action|reminder
    channel = Column(String(20), default="in_app")  # in_app|email|push|sms
    title = Column(String(500), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(Text, nullable=True)
    read_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
