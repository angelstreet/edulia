import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class LearningPlatform(Base):
    """Learning platform directory — not tenant-scoped (global)."""
    __tablename__ = "learning_platforms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    url = Column(Text, nullable=False)
    logo_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    is_free = Column(Boolean, default=False)
    has_certificates = Column(Boolean, default=False)
    languages = Column(ARRAY(Text), default=list)
    categories = Column(ARRAY(Text), default=list)  # academic|professional|skills
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    courses = relationship("Course", back_populates="platform", cascade="all, delete-orphan")


class Course(Base):
    """Course link — not tenant-scoped (global catalog)."""
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform_id = Column(UUID(as_uuid=True), ForeignKey("learning_platforms.id"), nullable=False)
    title = Column(String(500), nullable=False)
    url = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), default="beginner")  # beginner|intermediate|advanced
    format = Column(String(20), default="video")  # video|text|interactive|project|mixed
    language = Column(String(10), default="en")  # en|fr|es|...
    duration_hours = Column(Float, nullable=True)
    is_free = Column(Boolean, default=True)
    has_certificate = Column(Boolean, default=False)
    tags = Column(ARRAY(Text), default=list)
    category = Column(String(30), default="professional")  # academic|professional|skills
    image_url = Column(Text, nullable=True)
    provider_course_id = Column(String(255), nullable=True)  # external ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    platform = relationship("LearningPlatform", back_populates="courses")


class CourseSubscription(Base):
    __tablename__ = "course_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    subscribed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    __table_args__ = (UniqueConstraint("user_id", "course_id"),)


class CourseRating(Base):
    __tablename__ = "course_ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    review = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (UniqueConstraint("user_id", "course_id"),)
