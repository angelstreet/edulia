from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session as DbSession

from app.core.exceptions import NotFoundException
from app.db.models.attendance import AttendanceRecord


def list_attendance(
    db: DbSession,
    tenant_id: UUID,
    session_id: UUID | None = None,
    record_date: date | None = None,
) -> list[AttendanceRecord]:
    query = db.query(AttendanceRecord).filter(AttendanceRecord.tenant_id == tenant_id)
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)
    if record_date:
        query = query.filter(AttendanceRecord.date == record_date)
    return query.order_by(AttendanceRecord.student_id).all()


def create_attendance_bulk(
    db: DbSession,
    tenant_id: UUID,
    recorded_by: UUID,
    session_id: UUID,
    record_date: date,
    records: list[dict],
) -> list[AttendanceRecord]:
    results = []
    for rec in records:
        attendance = AttendanceRecord(
            tenant_id=tenant_id,
            session_id=session_id,
            date=record_date,
            recorded_by=recorded_by,
            student_id=rec["student_id"],
            status=rec.get("status", "present"),
            late_minutes=rec.get("late_minutes"),
            reason=rec.get("reason"),
        )
        db.add(attendance)
        results.append(attendance)
    db.commit()
    for r in results:
        db.refresh(r)
    return results


def update_attendance(db: DbSession, record_id: UUID, **kwargs) -> AttendanceRecord:
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise NotFoundException("Attendance record not found")
    for key, value in kwargs.items():
        if value is not None:
            setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record
