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
