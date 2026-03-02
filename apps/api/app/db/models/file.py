from sqlalchemy import BigInteger, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, TenantMixin


class File(Base, TenantMixin):
    __tablename__ = "files"

    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(500), nullable=False)
    mime_type = Column(String(255), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    storage_key = Column(Text, nullable=False)
    folder = Column(String(500), nullable=True)
    visibility = Column(String(20), default="private")  # private|group|public
    context_type = Column(String(50), nullable=True)
    context_id = Column(UUID(as_uuid=True), nullable=True)
    category = Column(String(50), default="general")  # general|administrative|school_life|grades|invoices|enrollment
    source_module = Column(String(100), nullable=True)
