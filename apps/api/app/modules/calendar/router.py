from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.calendar.schemas import EventCreate, EventUpdate, EventResponse
from app.modules.calendar.service import create_event, delete_event, list_events, update_event

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


@router.get("/events", response_model=list[EventResponse])
def get_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_role = next(
        (ur.role.code for ur in current_user.user_roles if ur.role and ur.revoked_at is None),
        "student",
    )
    return list_events(db, current_user.tenant_id, user_role, start, end)


@router.post("/events", response_model=EventResponse, status_code=201)
def post_event(
    request: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_event(
        db, current_user.tenant_id, current_user.id,
        title=request.title,
        description=request.description,
        start_at=request.start_at,
        end_at=request.end_at,
        event_type=request.event_type,
        color=request.color,
        target_roles=request.target_roles,
    )


@router.patch("/events/{event_id}", response_model=EventResponse)
def patch_event(
    event_id: UUID,
    request: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_event(db, event_id, current_user.tenant_id, **request.model_dump(exclude_none=True))


@router.delete("/events/{event_id}", status_code=204)
def remove_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_event(db, event_id, current_user.tenant_id)
