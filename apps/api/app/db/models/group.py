import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class Group(Base, TenantMixin):
    __tablename__ = "groups"

    campus_id = Column(UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=True)
    type = Column(String(30), nullable=False, default="class")  # class|section|cohort|team|tutoring_group
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    capacity = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)

    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role_in_group = Column(String(20), default="member")  # member|leader|teacher|tutor
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True)

    group = relationship("Group", back_populates="memberships")
