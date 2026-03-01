from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.subjects.schemas import SubjectCreate, SubjectResponse, SubjectUpdate
from app.modules.subjects.service import create_subject, delete_subject, list_subjects, update_subject

router = APIRouter(prefix="/api/v1/subjects", tags=["subjects"])


@router.post("", response_model=SubjectResponse, status_code=201)
def create(
    request: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_subject(db, current_user.tenant_id, **request.model_dump())


@router.get("", response_model=list[SubjectResponse])
def list_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_subjects(db, current_user.tenant_id)


@router.patch("/{subject_id}", response_model=SubjectResponse)
def update(
    subject_id: UUID,
    request: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_subject(db, subject_id, **request.model_dump(exclude_unset=True))


@router.delete("/{subject_id}", status_code=204)
def delete(
    subject_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_subject(db, subject_id)
