import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base, TenantMixin


class ActivityAttempt(Base, TenantMixin):
    __tablename__ = "activity_attempts"

    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), nullable=True)   # null for async
    mode = Column(String(20), default="async")  # async | live | replay
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    answers = Column(JSONB, default=list)
    # answers schema: [{question_id, choice_ids: [str], text: str|null, answered_at_ms: int}]
    score = Column(Numeric(5, 2), nullable=True)
    max_score = Column(Numeric(5, 2), nullable=True)
    scored_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("activity_id", "student_id", name="uq_activity_attempt_student"),
    )
