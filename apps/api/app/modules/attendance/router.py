from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.attendance.schemas import (
    AttendanceBulkCreate,
    AttendanceRecordResponse,
    AttendanceRecordUpdate,
)
from app.modules.attendance.service import (
    create_attendance_bulk,
    list_attendance,
    update_attendance,
)

router = APIRouter(prefix="/api/v1/attendance", tags=["attendance"])


@router.get("", response_model=list[AttendanceRecordResponse])
def get_attendance(
    session_id: UUID | None = Query(None),
    record_date: date | None = Query(None, alias="date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_attendance(db, current_user.tenant_id, session_id, record_date)


@router.post("/bulk", response_model=list[AttendanceRecordResponse], status_code=201)
def bulk_create(
    request: AttendanceBulkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_attendance_bulk(
        db,
        current_user.tenant_id,
        current_user.id,
        request.session_id,
        request.date,
        [r.model_dump() for r in request.records],
    )


@router.put("/{record_id}", response_model=AttendanceRecordResponse)
def update_record(
    record_id: UUID,
    request: AttendanceRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_attendance(db, record_id, **request.model_dump(exclude_unset=True))
