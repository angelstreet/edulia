from uuid import UUID

from sqlalchemy.orm import Session as DbSession

from app.core.exceptions import NotFoundException
from app.db.models.timetable import Room, Session, SessionException


# --- Room ---

def create_room(db: DbSession, tenant_id: UUID, **kwargs) -> Room:
    room = Room(tenant_id=tenant_id, **kwargs)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def list_rooms(db: DbSession, tenant_id: UUID) -> list[Room]:
    return (
        db.query(Room)
        .filter(Room.tenant_id == tenant_id)
        .order_by(Room.name)
        .all()
    )


# --- Session ---

def create_session(db: DbSession, tenant_id: UUID, **kwargs) -> Session:
    session = Session(tenant_id=tenant_id, **kwargs)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def list_sessions(
    db: DbSession,
    tenant_id: UUID,
    group_id: UUID | None = None,
    teacher_id: UUID | None = None,
    day_of_week: int | None = None,
) -> list[Session]:
    query = db.query(Session).filter(Session.tenant_id == tenant_id)
    if group_id:
        query = query.filter(Session.group_id == group_id)
    if teacher_id:
        query = query.filter(Session.teacher_id == teacher_id)
    if day_of_week is not None:
        query = query.filter(Session.day_of_week == day_of_week)
    return query.order_by(Session.day_of_week, Session.start_time).all()


def get_session(db: DbSession, session_id: UUID) -> Session:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise NotFoundException("Session not found")
    return session


def update_session(db: DbSession, session_id: UUID, **kwargs) -> Session:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise NotFoundException("Session not found")
    for key, value in kwargs.items():
        if value is not None:
            setattr(session, key, value)
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: DbSession, session_id: UUID) -> None:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise NotFoundException("Session not found")
    db.delete(session)
    db.commit()


# --- SessionException ---

def create_session_exception(db: DbSession, created_by: UUID, **kwargs) -> SessionException:
    exc = SessionException(created_by=created_by, **kwargs)
    db.add(exc)
    db.commit()
    db.refresh(exc)
    return exc


def check_conflicts(
    db: Session,
    tenant_id,
    day_of_week: int,
    start_time,
    end_time,
    teacher_id=None,
    room_id=None,
    group_id=None,
    exclude_session_id=None,
) -> list[dict]:
    """Check for scheduling conflicts. Returns list of conflict descriptions."""
    from app.db.models.timetable import Session as TimetableSession
    conflicts = []

    base_q = db.query(TimetableSession).filter(
        TimetableSession.tenant_id == tenant_id,
        TimetableSession.day_of_week == day_of_week,
        TimetableSession.start_time < end_time,
        TimetableSession.end_time > start_time,
        TimetableSession.status == "active",
    )
    if exclude_session_id:
        base_q = base_q.filter(TimetableSession.id != exclude_session_id)

    if teacher_id:
        clash = base_q.filter(TimetableSession.teacher_id == teacher_id).first()
        if clash:
            conflicts.append({
                "type": "teacher",
                "message": f"Teacher already has a session at this time (day {day_of_week}, {clash.start_time}-{clash.end_time})"
            })

    if room_id:
        clash = base_q.filter(TimetableSession.room_id == room_id).first()
        if clash:
            conflicts.append({
                "type": "room",
                "message": f"Room is already booked at this time (day {day_of_week}, {clash.start_time}-{clash.end_time})"
            })

    if group_id:
        clash = base_q.filter(TimetableSession.group_id == group_id).first()
        if clash:
            conflicts.append({
                "type": "group",
                "message": f"Group already has a session at this time (day {day_of_week}, {clash.start_time}-{clash.end_time})"
            })

    return conflicts
