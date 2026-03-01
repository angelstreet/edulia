from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SubjectCreate(BaseModel):
    code: str
    name: str
    color: str | None = None
    description: str | None = None
    coefficient: float = 1.0


class SubjectUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    color: str | None = None
    description: str | None = None
    coefficient: float | None = None


class SubjectResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    code: str
    name: str
    color: str | None
    description: str | None
    coefficient: float | None
    created_at: datetime

    model_config = {"from_attributes": True}
