from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException
from app.db.database import get_db
from app.db.models.user import User
from app.modules.activity.schemas import ActivityCreate, ActivityResponse, ActivityUpdate
from app.modules.activity.service import (
    create_activity,
    delete_activity,
    get_activity,
    list_activities,
    update_activity,
)

router = APIRouter(prefix="/api/v1/activities", tags=["activities"])


def _get_user_role(user: User) -> str:
    """Return the primary (first active) role code for the user."""
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            return ur.role.code
    return "student"


@router.get("", response_model=list[ActivityResponse])
def list_all(
    group_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _get_user_role(current_user)
    return list_activities(db, current_user.tenant_id, current_user.id, role, group_id=group_id)


@router.post("", response_model=ActivityResponse, status_code=201)
def create(
    request: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can create activities")
    return create_activity(
        db,
        current_user.tenant_id,
        current_user.id,
        title=request.title,
        description=request.description,
        type=request.type,
        group_id=request.group_id,
        subject_id=request.subject_id,
        questions=[q.model_dump() for q in request.questions],
        scheduled_at=request.scheduled_at,
    )


@router.get("/{activity_id}", response_model=ActivityResponse)
def detail(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_activity(db, activity_id)


@router.patch("/{activity_id}", response_model=ActivityResponse)
def update(
    activity_id: UUID,
    request: ActivityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can update activities")
    data = request.model_dump(exclude_unset=True)
    if "questions" in data and data["questions"] is not None:
        data["questions"] = [q.model_dump() for q in request.questions]
    return update_activity(db, activity_id, **data)


@router.delete("/{activity_id}", status_code=204)
def remove(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can delete activities")
    activity = get_activity(db, activity_id)
    if activity.status != "draft":
        raise ForbiddenException("Only draft activities can be deleted")
    delete_activity(db, activity_id)
