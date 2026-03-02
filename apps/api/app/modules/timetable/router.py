from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.timetable.schemas import (
    RoomCreate,
    RoomResponse,
    SessionCreate,
    SessionExceptionCreate,
    SessionExceptionResponse,
    SessionResponse,
    SessionUpdate,
)
from app.modules.timetable.service import (
    create_room,
    create_session,
    create_session_exception,
    delete_session,
    list_rooms,
    list_sessions,
    update_session,
)

router = APIRouter(prefix="/api/v1/timetable", tags=["timetable"])


# --- Rooms ---

@router.get("/rooms", response_model=list[RoomResponse])
def get_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_rooms(db, current_user.tenant_id)


@router.post("/rooms", response_model=RoomResponse, status_code=201)
def add_room(
    request: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_room(db, current_user.tenant_id, **request.model_dump())


# --- Sessions ---

@router.get("/sessions", response_model=list[SessionResponse])
def get_sessions(
    group_id: UUID | None = Query(None),
    teacher_id: UUID | None = Query(None),
    day_of_week: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_sessions(db, current_user.tenant_id, group_id, teacher_id, day_of_week)


@router.post("/sessions", response_model=SessionResponse, status_code=201)
def add_session(
    request: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_session(db, current_user.tenant_id, **request.model_dump())


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
def edit_session(
    session_id: UUID,
    request: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_session(db, session_id, **request.model_dump(exclude_unset=True))


@router.delete("/sessions/{session_id}", status_code=204)
def remove_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_session(db, session_id)


# --- Session Exceptions ---

@router.post("/session-exceptions", response_model=SessionExceptionResponse, status_code=201)
def add_session_exception(
    request: SessionExceptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_session_exception(db, current_user.id, **request.model_dump())


@router.post("/check-conflicts")
def check_conflicts_endpoint(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check for scheduling conflicts before creating a session."""
    from .service import check_conflicts
    conflicts = check_conflicts(
        db,
        tenant_id=current_user.tenant_id,
        day_of_week=request.get("day_of_week"),
        start_time=request.get("start_time"),
        end_time=request.get("end_time"),
        teacher_id=request.get("teacher_id"),
        room_id=request.get("room_id"),
        group_id=request.get("group_id"),
        exclude_session_id=request.get("exclude_session_id"),
    )
    return {"conflicts": conflicts, "has_conflicts": len(conflicts) > 0}
