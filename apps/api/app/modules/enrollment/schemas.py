from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class EnrollmentCreate(BaseModel):
    parent_first_name: str
    parent_last_name: str
    parent_email: EmailStr
    parent_phone: str | None = None
    child_first_name: str
    child_last_name: str
    child_date_of_birth: datetime | None = None
    child_gender: str | None = None
    requested_group_id: UUID | None = None
    documents: list[str] = []  # list of file IDs / S3 keys


class EnrollmentReview(BaseModel):
    status: str  # reviewing | approved | rejected
    admin_notes: str | None = None


class EnrollmentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    parent_first_name: str
    parent_last_name: str
    parent_email: str
    parent_phone: str | None
    child_first_name: str
    child_last_name: str
    child_date_of_birth: datetime | None
    child_gender: str | None
    requested_group_id: UUID | None
    status: str
    admin_notes: str | None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    documents: list[str]
    student_user_id: UUID | None
    submitted_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
