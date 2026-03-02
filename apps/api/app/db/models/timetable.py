import uuid
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class Room(Base, TenantMixin):
    __tablename__ = "rooms"

    campus_id = Column(UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True)
    name = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=True)
    equipment = Column(ARRAY(Text), default=list)


class Session(Base, TenantMixin):
    __tablename__ = "sessions"

    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday ... 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    recurrence = Column(String(20), nullable=False, default="weekly")  # weekly|biweekly|custom
    effective_from = Column(Date, nullable=True)
    effective_until = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="active")  # active|cancelled|substituted

    exceptions = relationship("SessionException", back_populates="session", cascade="all, delete-orphan")


class SessionException(Base):
    __tablename__ = "session_exceptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    date = Column(Date, nullable=False)
    exception_type = Column(String(20), nullable=False)  # cancelled|substituted|room_change|time_change
    substitute_teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    new_room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=True)
    new_start_time = Column(Time, nullable=True)
    new_end_time = Column(Time, nullable=True)
    reason = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    session = relationship("Session", back_populates="exceptions")
