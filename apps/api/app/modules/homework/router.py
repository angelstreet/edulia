from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.homework.schemas import (
    HomeworkCreate,
    HomeworkResponse,
    SubmissionCreate,
    SubmissionGrade,
    SubmissionResponse,
)
from app.modules.homework.service import (
    create_homework,
    create_submission,
    get_homework,
    get_homework_submissions,
    grade_submission,
    list_homework,
)

router = APIRouter(prefix="/api/v1/homework", tags=["homework"])


@router.get("/{homework_id}", response_model=HomeworkResponse)
def get_one(
    homework_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_homework(db, homework_id)


@router.post("", response_model=HomeworkResponse, status_code=201)
def create(
    request: HomeworkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hw = create_homework(db, current_user.tenant_id, current_user.id, **request.model_dump())
    return hw


@router.get("", response_model=list[HomeworkResponse])
def list_all(
    group_id: UUID | None = Query(None),
    subject_id: UUID | None = Query(None),
    due_from: date | None = Query(None),
    due_until: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_homework(db, current_user.tenant_id, group_id, subject_id, due_from, due_until)


@router.get("/{homework_id}/submissions", response_model=list[SubmissionResponse])
def get_submissions(
    homework_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_homework_submissions(db, homework_id)


@router.post("/{homework_id}/submit", response_model=SubmissionResponse, status_code=201)
def submit(
    homework_id: UUID,
    request: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_submission(db, homework_id, current_user.id, **request.model_dump())


@router.patch("/{homework_id}/submissions/{submission_id}", response_model=SubmissionResponse)
def grade(
    homework_id: UUID,
    submission_id: UUID,
    request: SubmissionGrade,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return grade_submission(db, submission_id, request.grade, request.teacher_feedback, request.status)
