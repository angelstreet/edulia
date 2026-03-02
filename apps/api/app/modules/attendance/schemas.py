from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class AttendanceRecordCreate(BaseModel):
    session_id: UUID
    student_id: UUID
    date: date
    status: str = "present"  # present|absent|late|excused|sick
    late_minutes: int | None = None
    reason: str | None = None


class AttendanceBulkItem(BaseModel):
    student_id: UUID
    status: str = "present"
    late_minutes: int | None = None
    reason: str | None = None


class AttendanceBulkCreate(BaseModel):
    session_id: UUID
    date: date
    records: list[AttendanceBulkItem]


class AttendanceRecordUpdate(BaseModel):
    status: str | None = None
    late_minutes: int | None = None
    reason: str | None = None
    justified: bool | None = None


class AttendanceRecordResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    session_id: UUID
    student_id: UUID
    date: date
    status: str
    late_minutes: int | None
    reason: str | None
    justified: bool
    justified_by: UUID | None
    justified_at: datetime | None
    recorded_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
