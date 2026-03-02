import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Portfolio(Base):
    """User's public portfolio page."""
    __tablename__ = "portfolios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    headline = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)
    linkedin_url = Column(Text, nullable=True)
    website_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
