from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException
from app.db.database import get_db
from app.db.models.user import User
from app.modules.absence.schemas import JustificationCreate, JustificationResponse, JustificationReview
from app.modules.absence.service import create_justification, list_justifications, review_justification

router = APIRouter(prefix="/api/v1/justifications", tags=["absence"])


def _role(user):
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            return ur.role.code
    return "student"


@router.post("", response_model=JustificationResponse, status_code=201)
def submit(
    request: JustificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_justification(db, current_user.tenant_id, current_user.id, **request.model_dump())


@router.get("", response_model=list[JustificationResponse])
def list_all(
    student_id: UUID | None = Query(None),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_justifications(db, current_user.tenant_id, student_id, status)


@router.patch("/{justification_id}/review", response_model=JustificationResponse)
def review(
    justification_id: UUID,
    body: JustificationReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _role(current_user) not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can review justifications")
    return review_justification(db, justification_id, current_user.tenant_id, current_user.id, body.status)
