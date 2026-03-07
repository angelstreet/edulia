import random
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin


def _generate_join_code() -> str:
    """6 uppercase alphanumeric chars, no ambiguous O/0/I/1."""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(chars, k=6))


class LiveSession(Base, TenantMixin):
    __tablename__ = "live_sessions"

    activity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    teacher_id = Column(UUID(as_uuid=True), nullable=False)
    join_code = Column(String(6), nullable=False, unique=True, index=True)
    state = Column(String(20), nullable=False, default='lobby')
    # states: lobby | active | reveal | finished
    current_question_index = Column(Integer, nullable=False, default=0)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    replay_open = Column(Boolean, nullable=False, default=False)
    replay_deadline = Column(DateTime, nullable=True)
