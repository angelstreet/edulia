import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class Form(Base, TenantMixin):
    __tablename__ = "forms"

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(30), default="survey")  # survey|consent|info
    status = Column(String(20), default="draft")  # draft|published|closed
    target_roles = Column(ARRAY(Text), default=list)
    deadline = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    fields = relationship("FormField", back_populates="form", cascade="all, delete-orphan", order_by="FormField.position")
    responses = relationship("FormResponse", back_populates="form", cascade="all, delete-orphan")


class FormField(Base):
    __tablename__ = "form_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)
    label = Column(String(500), nullable=False)
    field_type = Column(String(30), nullable=False)  # text|textarea|checkbox|radio|select|date|file
    required = Column(Boolean, default=False)
    options = Column(JSONB, default=list)  # list of strings for radio/select/checkbox
    position = Column(Integer, default=0)

    form = relationship("Form", back_populates="fields")


class FormResponse(Base):
    __tablename__ = "form_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    form_id = Column(UUID(as_uuid=True), ForeignKey("forms.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    data = Column(JSONB, default=dict)

    form = relationship("Form", back_populates="responses")
