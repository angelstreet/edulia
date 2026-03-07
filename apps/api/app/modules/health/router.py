from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException
from app.db.database import get_db
from app.db.models.user import User
from app.modules.health.schemas import HealthRecordUpsert, HealthRecordResponse
from app.modules.health.service import get_or_create, upsert

router = APIRouter(prefix="/api/v1/health", tags=["health"])


def _role(user):
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            return ur.role.code
    return "student"


@router.get("/students/{student_id}", response_model=HealthRecordResponse)
def get_record(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _role(current_user) not in ("admin", "teacher"):
        raise ForbiddenException("Only admins and teachers can view health records")
    return get_or_create(db, current_user.tenant_id, student_id)


@router.put("/students/{student_id}", response_model=HealthRecordResponse)
def update_record(
    student_id: UUID,
    body: HealthRecordUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if _role(current_user) not in ("admin", "teacher"):
        raise ForbiddenException("Only admins and teachers can update health records")
    return upsert(db, current_user.tenant_id, student_id, **body.model_dump())
