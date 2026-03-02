from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel


class CertificateCreate(BaseModel):
    title: str
    issuer: str
    issued_date: date | None = None
    expiry_date: date | None = None
    credential_id: str | None = None
    verification_url: str | None = None
    course_id: UUID | None = None
    skills: str | None = None


class CertificateResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    issuer: str
    issued_date: date | None = None
    expiry_date: date | None = None
    credential_id: str | None = None
    verification_url: str | None = None
    file_id: UUID | None = None
    course_id: UUID | None = None
    skills: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
