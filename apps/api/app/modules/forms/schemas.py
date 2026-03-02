from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class FormFieldCreate(BaseModel):
    label: str
    field_type: str
    required: bool = False
    options: list[str] = []
    position: int = 0


class FormFieldResponse(BaseModel):
    id: UUID
    form_id: UUID
    label: str
    field_type: str
    required: bool
    options: list[Any]
    position: int

    model_config = {"from_attributes": True}


class FormCreate(BaseModel):
    title: str
    description: str | None = None
    type: str = "survey"
    target_roles: list[str] = []
    deadline: datetime | None = None
    fields: list[FormFieldCreate] = []


class FormUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    deadline: datetime | None = None


class FormResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    description: str | None
    type: str
    status: str
    target_roles: list[str]
    deadline: datetime | None
    created_by: UUID
    created_at: datetime
    response_count: int = 0

    model_config = {"from_attributes": True}


class FormDetailResponse(FormResponse):
    fields: list[FormFieldResponse] = []


class FormSubmit(BaseModel):
    data: dict[str, Any]


class FormResponseRecord(BaseModel):
    id: UUID
    form_id: UUID
    user_id: UUID
    submitted_at: datetime
    data: dict[str, Any]

    model_config = {"from_attributes": True}


class FormStats(BaseModel):
    field_id: UUID
    label: str
    field_type: str
    summary: dict[str, Any]
