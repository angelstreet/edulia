from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.database import get_db
from app.db.models.user import User
from app.modules.activity.schemas import (
    ActivityCreate,
    ActivityResponse,
    ActivityResponseStripped,
    ActivityUpdate,
    AttemptResult,
    AttemptStartResponse,
    AttemptSubmitRequest,
)
from app.modules.activity.service import (
    create_activity,
    delete_activity,
    get_activity,
    get_all_attempts,
    get_my_attempt,
    list_activities,
    start_attempt,
    strip_correct_answers,
    submit_attempt,
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


# ---------------------------------------------------------------------------
# Feature 2 — Async Attempt + Auto-Scoring
# ---------------------------------------------------------------------------


@router.post("/{activity_id}/attempt/start", response_model=AttemptStartResponse, status_code=201)
def attempt_start(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student: start an async attempt for an activity. Returns activity WITHOUT is_correct fields."""
    role = _get_user_role(current_user)
    if role in ("teacher", "admin"):
        raise ForbiddenException("Teachers and admins cannot attempt activities")

    attempt, activity = start_attempt(db, activity_id, current_user.id, current_user.tenant_id)

    # Strip is_correct from activity questions before returning
    activity_data = strip_correct_answers(activity)
    activity_response = ActivityResponseStripped.model_validate(activity_data)

    return AttemptStartResponse(attempt_id=attempt.id, activity=activity_response)


@router.post(
    "/{activity_id}/attempt/{attempt_id}/submit",
    response_model=AttemptResult,
)
def attempt_submit(
    activity_id: UUID,
    attempt_id: UUID,
    request: AttemptSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student: submit answers for an attempt. Returns scored result WITH correct answers revealed."""
    role = _get_user_role(current_user)
    if role in ("teacher", "admin"):
        raise ForbiddenException("Teachers and admins cannot submit attempts")

    answers = [a.model_dump() for a in request.answers]
    attempt, question_results = submit_attempt(db, attempt_id, current_user.id, answers)

    result = AttemptResult.model_validate(attempt)
    result.question_results = question_results
    return result


@router.get("/{activity_id}/attempt/my", response_model=AttemptResult)
def attempt_my(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student: get their own attempt result for an activity."""
    role = _get_user_role(current_user)
    if role in ("teacher", "admin"):
        raise ForbiddenException("Teachers and admins do not have attempts")

    attempt = get_my_attempt(db, activity_id, current_user.id)
    if not attempt:
        raise NotFoundException("No attempt found for this activity")
    return AttemptResult.model_validate(attempt)


@router.get("/{activity_id}/attempts", response_model=list[AttemptResult])
def attempts_list(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher: get all student attempts for an activity."""
    role = _get_user_role(current_user)
    if role == "student":
        raise ForbiddenException("Students cannot view all attempts")

    attempts = get_all_attempts(db, activity_id)
    return [AttemptResult.model_validate(a) for a in attempts]
