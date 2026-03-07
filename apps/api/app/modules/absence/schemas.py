from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel


class JustificationCreate(BaseModel):
    student_id: UUID
    absence_date: date
    reason: str
    description: str | None = None
    document_url: str | None = None


class JustificationReview(BaseModel):
    status: str  # accepted | rejected


class JustificationResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    student_id: UUID
    submitted_by: UUID | None
    absence_date: date
    reason: str
    description: str | None
    document_url: str | None
    status: str
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}
