import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class GradeCategory(Base, TenantMixin):
    __tablename__ = "grade_categories"

    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    term_id = Column(UUID(as_uuid=True), ForeignKey("terms.id"), nullable=False)
    name = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 2), nullable=False, default=1)

    assessments = relationship("Assessment", back_populates="category", cascade="all, delete-orphan")


class Assessment(Base, TenantMixin):
    __tablename__ = "assessments"

    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    term_id = Column(UUID(as_uuid=True), ForeignKey("terms.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("grade_categories.id"), nullable=True)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    max_score = Column(Numeric(5, 2), nullable=False, default=20)
    coefficient = Column(Numeric(5, 2), nullable=False, default=1)
    is_published = Column(Boolean, default=False)
    source_activity_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    category = relationship("GradeCategory", back_populates="assessments")
    grades = relationship("Grade", back_populates="assessment", cascade="all, delete-orphan")


class Grade(Base):
    __tablename__ = "grades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    score = Column(Numeric(5, 2), nullable=True)
    is_absent = Column(Boolean, default=False)
    is_exempt = Column(Boolean, default=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    assessment = relationship("Assessment", back_populates="grades")
