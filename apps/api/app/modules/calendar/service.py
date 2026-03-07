from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.db.models.calendar import CalendarEvent
from app.modules.calendar.schemas import EventResponse


def _to_response(event: CalendarEvent) -> EventResponse:
    return EventResponse.from_orm_obj(event)


def list_events(
    db: Session,
    tenant_id: UUID,
    user_role: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> List[EventResponse]:
    query = db.query(CalendarEvent).filter(CalendarEvent.tenant_id == tenant_id)
    if start:
        query = query.filter(CalendarEvent.start_at >= start)
    if end:
        query = query.filter(CalendarEvent.start_at <= end)
    events = query.order_by(CalendarEvent.start_at).all()
    # Filter by target_roles if set
    result = []
    for e in events:
        if not e.target_roles:
            result.append(_to_response(e))
        elif user_role in e.target_roles.split(","):
            result.append(_to_response(e))
    return result


def create_event(
    db: Session,
    tenant_id: UUID,
    user_id: UUID,
    title: str,
    description: Optional[str],
    start_at: datetime,
    end_at: Optional[datetime],
    event_type: str,
    color: Optional[str],
    target_roles: Optional[List[str]],
) -> EventResponse:
    event = CalendarEvent(
        tenant_id=tenant_id,
        title=title,
        description=description,
        start_at=start_at,
        end_at=end_at,
        event_type=event_type,
        color=color,
        target_roles=",".join(target_roles) if target_roles else None,
        created_by=user_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _to_response(event)


def update_event(
    db: Session,
    event_id: UUID,
    tenant_id: UUID,
    **kwargs,
) -> EventResponse:
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.tenant_id == tenant_id,
    ).first()
    if not event:
        raise NotFoundException("Event not found")
    for key, value in kwargs.items():
        if value is not None:
            if key == "target_roles":
                setattr(event, key, ",".join(value))
            else:
                setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return _to_response(event)


def delete_event(db: Session, event_id: UUID, tenant_id: UUID) -> None:
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.tenant_id == tenant_id,
    ).first()
    if not event:
        raise NotFoundException("Event not found")
    db.delete(event)
    db.commit()
