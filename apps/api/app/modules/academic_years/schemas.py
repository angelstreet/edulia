from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class TermCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    order: int


class TermResponse(BaseModel):
    id: UUID
    name: str
    start_date: date
    end_date: date
    order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AcademicYearCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool | None = None


class AcademicYearResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: datetime
    terms: list[TermResponse] = []

    model_config = {"from_attributes": True}
