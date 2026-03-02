import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class Homework(Base, TenantMixin):
    __tablename__ = "homework"

    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    allow_submission = Column(Boolean, default=False)
    submission_type = Column(String(20), default="file")  # file|text|both

    submissions = relationship("Submission", back_populates="homework", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    homework_id = Column(UUID(as_uuid=True), ForeignKey("homework.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    content = Column(Text, nullable=True)
    status = Column(String(20), default="submitted")  # submitted|late|graded|returned
    grade = Column(Numeric(5, 2), nullable=True)
    teacher_feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    homework = relationship("Homework", back_populates="submissions")
