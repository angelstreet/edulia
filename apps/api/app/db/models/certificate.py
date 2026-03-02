import uuid
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class Certificate(Base):
    """User-uploaded certificate — not tenant-scoped (EduliaHub is global)."""
    __tablename__ = "certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    issuer = Column(String(255), nullable=False)  # "Coursera", "AWS", etc.
    issued_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    credential_id = Column(String(255), nullable=True)
    verification_url = Column(Text, nullable=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id"), nullable=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    skills = Column(Text, nullable=True)  # comma-separated skills
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
