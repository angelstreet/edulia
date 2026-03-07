import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base, TenantMixin


class Activity(Base, TenantMixin):
    __tablename__ = "activities"

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(20), default="qcm")  # qcm | poll | game
    status = Column(String(20), default="draft")  # draft | published | closed
    questions = Column(JSONB, default=list)
    group_id = Column(UUID(as_uuid=True), nullable=True)
    subject_id = Column(UUID(as_uuid=True), nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    replay_deadline = Column(DateTime, nullable=True)
