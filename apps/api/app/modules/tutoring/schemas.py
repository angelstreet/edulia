from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel


class SessionCreate(BaseModel):
    tutor_id: UUID
    student_id: UUID
    subject_id: Optional[UUID] = None
    session_date: datetime
    duration_minutes: int = 60
    rate_cents: int = 0
    status: str = "completed"
    notes: Optional[str] = None
    homework_given: Optional[str] = None
    package_id: Optional[UUID] = None


class SessionUpdate(BaseModel):
    subject_id: Optional[UUID] = None
    session_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    rate_cents: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    homework_given: Optional[str] = None
    package_id: Optional[UUID] = None
    invoiced: Optional[bool] = None


class SessionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    tutor_id: UUID
    student_id: UUID
    subject_id: Optional[UUID]
    session_date: datetime
    duration_minutes: int
    rate_cents: int
    status: str
    notes: Optional[str]
    homework_given: Optional[str]
    package_id: Optional[UUID]
    invoiced: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PackageCreate(BaseModel):
    tutor_id: UUID
    student_id: UUID
    name: str
    sessions_total: int
    price_cents: int
    notes: Optional[str] = None


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    sessions_total: Optional[int] = None
    sessions_used: Optional[int] = None
    price_cents: Optional[int] = None
    status: Optional[str] = None
    paid: Optional[bool] = None
    notes: Optional[str] = None


class PackageResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    tutor_id: UUID
    student_id: UUID
    name: str
    sessions_total: int
    sessions_used: int
    price_cents: int
    status: str
    paid: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    student_id: UUID
    period_label: Optional[str] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    tutor_id: UUID
    student_id: UUID
    invoice_number: str
    period_label: Optional[str]
    line_items: List[Any]
    total_cents: int
    paid: bool
    paid_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
