from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel


# --- Room ---

class RoomCreate(BaseModel):
    name: str
    campus_id: UUID | None = None
    capacity: int | None = None
    equipment: list[str] = []


class RoomUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = None
    equipment: list[str] | None = None


class RoomResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    campus_id: UUID | None
    capacity: int | None
    equipment: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Session ---

class SessionCreate(BaseModel):
    academic_year_id: UUID | None = None
    group_id: UUID
    subject_id: UUID
    teacher_id: UUID
    room_id: UUID | None = None
    day_of_week: int  # 0=Monday ... 6=Sunday
    start_time: time
    end_time: time
    recurrence: str = "weekly"
    effective_from: date | None = None
    effective_until: date | None = None


class SessionUpdate(BaseModel):
    group_id: UUID | None = None
    subject_id: UUID | None = None
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    day_of_week: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    recurrence: str | None = None
    effective_from: date | None = None
    effective_until: date | None = None
    status: str | None = None


class SessionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    academic_year_id: UUID | None
    group_id: UUID
    subject_id: UUID
    teacher_id: UUID
    room_id: UUID | None
    day_of_week: int
    start_time: time
    end_time: time
    recurrence: str
    effective_from: date | None
    effective_until: date | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- SessionException ---

class SessionExceptionCreate(BaseModel):
    session_id: UUID
    date: date
    exception_type: str  # cancelled|substituted|room_change|time_change
    substitute_teacher_id: UUID | None = None
    new_room_id: UUID | None = None
    new_start_time: time | None = None
    new_end_time: time | None = None
    reason: str | None = None


class SessionExceptionResponse(BaseModel):
    id: UUID
    session_id: UUID
    date: date
    exception_type: str
    substitute_teacher_id: UUID | None
    new_room_id: UUID | None
    new_start_time: time | None
    new_end_time: time | None
    reason: str | None
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
