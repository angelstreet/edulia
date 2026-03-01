import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    type = Column(String(50), nullable=False, default="school")  # school | tutoring_center | enterprise
    subscription_plan = Column(String(50), default="free")  # free | pro | enterprise
    settings = Column(JSONB, default=dict)
    branding = Column(JSONB, default=dict)
    custom_domain = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    campuses = relationship("Campus", back_populates="tenant")
    academic_years = relationship("AcademicYear", back_populates="tenant")


class Campus(Base, TenantMixin):
    __tablename__ = "campuses"

    name = Column(String(255), nullable=False)
    address = Column(JSONB, default=dict)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    is_default = Column(Boolean, default=False)

    tenant = relationship("Tenant", back_populates="campuses")


class AcademicYear(Base, TenantMixin):
    __tablename__ = "academic_years"

    name = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False)

    tenant = relationship("Tenant", back_populates="academic_years")
    terms = relationship("Term", back_populates="academic_year")


class Term(Base):
    __tablename__ = "terms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False)
    name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    academic_year = relationship("AcademicYear", back_populates="terms")
