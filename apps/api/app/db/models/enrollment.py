import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class EnrollmentRequest(Base, TenantMixin):
    __tablename__ = "enrollment_requests"

    # Parent/guardian info
    parent_first_name = Column(String(100), nullable=False)
    parent_last_name = Column(String(100), nullable=False)
    parent_email = Column(String(255), nullable=False)
    parent_phone = Column(String(50), nullable=True)

    # Child info
    child_first_name = Column(String(100), nullable=False)
    child_last_name = Column(String(100), nullable=False)
    child_date_of_birth = Column(DateTime, nullable=True)
    child_gender = Column(String(20), nullable=True)  # male|female|other|undisclosed

    # Requested group (class)
    requested_group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=True)

    # Status workflow
    status = Column(String(20), default="pending", nullable=False)
    # pending | reviewing | approved | rejected

    # Admin notes
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Uploaded documents (list of file IDs or S3 keys)
    documents = Column(JSONB, default=list)

    # On approval: reference to created student user
    student_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Submitter user (if parent is already a user)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    # Payment gate (optional): enrollment confirmed after invoice paid
    invoice_id = Column(UUID(as_uuid=True), nullable=True)
    payment_minimum_cents = Column(Integer, nullable=False, default=0)  # 0 = full required

