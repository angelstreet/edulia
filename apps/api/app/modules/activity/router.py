from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.db.database import get_db
from app.db.models.user import User
from app.modules.activity.schemas import (
    ActivityCreate,
    ActivityReport,
    ActivityResponse,
    ActivityResponseStripped,
    ActivityUpdate,
    AttemptResult,
    AttemptStartResponse,
    AttemptSubmitRequest,
    LiveSessionCreate,
    LiveSessionResponse,
    PushToGradebookRequest,
    ReplayEnableRequest,
    ReplaySubmitRequest,
    StudentReport,
)
from app.modules.gradebook.schemas import AssessmentResponse
from app.modules.activity.service import (
    create_activity,
    delete_activity,
    get_activity,
    get_activity_report,
    get_all_activity_reports,
    get_all_attempts,
    get_my_attempt,
    get_student_report,
    list_activities,
    push_to_gradebook,
    start_attempt,
    strip_correct_answers,
    submit_attempt,
    update_activity,
)
from app.modules.activity import session_service

router = APIRouter(prefix="/api/v1/activities", tags=["activities"])
students_router = APIRouter(prefix="/api/v1/students", tags=["students"])
sessions_router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


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


# ---------------------------------------------------------------------------
# Feature 3 — Teacher Auto-Reporting Dashboard
# NOTE: This route is intentionally registered BEFORE /{activity_id} so that
# FastAPI does not interpret the literal path segment "report" as an activity_id.
# ---------------------------------------------------------------------------


@router.get("/report", response_model=list[ActivityReport])
def activity_reports(
    teacher_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher/admin: list all activities for the tenant with aggregated stats."""
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can access activity reports")
    return get_all_activity_reports(db, current_user.tenant_id, teacher_id=teacher_id)


@router.get("/{activity_id}/report", response_model=ActivityReport)
def activity_report_detail(
    activity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher/admin: get detailed report for a single activity."""
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can access activity reports")
    return get_activity_report(db, activity_id, current_user.tenant_id)


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


# ---------------------------------------------------------------------------
# Feature 7 — Push Activity Results to Gradebook
# ---------------------------------------------------------------------------


@router.post("/{activity_id}/push-to-gradebook", response_model=AssessmentResponse)
def push_activity_to_gradebook(
    activity_id: UUID,
    request: PushToGradebookRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher/admin: push auto-scored QCM results into the gradebook as a formal Assessment."""
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can push activities to the gradebook")

    assessment = push_to_gradebook(
        db,
        activity_id=activity_id,
        teacher_id=current_user.id,
        tenant_id=current_user.tenant_id,
        term_id=request.term_id,
        category_id=request.category_id,
        coefficient=request.coefficient,
        max_score=request.max_score,
    )
    return assessment


# ---------------------------------------------------------------------------
# Feature 3 — Per-student report (separate router: /api/v1/students/...)
# ---------------------------------------------------------------------------


@students_router.get("/{student_id}/activity-scores", response_model=StudentReport)
def student_activity_scores(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher/admin: get all activity scores for a specific student."""
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can access student reports")
    return get_student_report(db, student_id, current_user.tenant_id)


# ---------------------------------------------------------------------------
# Feature 4 — Live Session Infrastructure (REST endpoints)
# ---------------------------------------------------------------------------


@sessions_router.post("", response_model=LiveSessionResponse, status_code=201)
def create_session_endpoint(
    request: LiveSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher/admin: create a live session for an activity. Returns the join code."""
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can create live sessions")
    result = session_service.create_session(
        db,
        tenant_id=current_user.tenant_id,
        teacher_id=current_user.id,
        activity_id=request.activity_id,
    )
    # Notify enrolled students
    try:
        from app.modules.notifications.engine import dispatch_notification
        from app.db.models.group import GroupMembership
        activity = get_activity(db, request.activity_id)
        if activity.group_id:
            members = db.query(GroupMembership).filter(
                GroupMembership.group_id == activity.group_id,
                GroupMembership.left_at.is_(None),
                GroupMembership.role_in_group == "member",
            ).all()
            for m in members:
                dispatch_notification(
                    db, current_user.tenant_id, m.user_id,
                    type="action",
                    title=f"Live session started: {activity.title}",
                    body=f"Join code: {result.join_code}",
                    link=f"/activities",
                )
    except Exception:
        pass
    return result


@sessions_router.get("/{join_code}", response_model=LiveSessionResponse)
def get_session_endpoint(
    join_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Any authenticated user: look up a session by join code (needed for students to join)."""
    return session_service.get_session_by_code(db, join_code)


@sessions_router.post("/{join_code}/finish", response_model=LiveSessionResponse)
def finish_session_endpoint(
    join_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher/admin: mark a session as finished."""
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can finish live sessions")
    live_session = session_service.get_session_by_code(db, join_code)
    # Ensure only the owning teacher (or an admin) can finish the session
    if role == "teacher" and str(live_session.teacher_id) != str(current_user.id):
        raise ForbiddenException("You are not the teacher of this session")
    return session_service.finish_session(db, live_session.id)


# ---------------------------------------------------------------------------
# Feature 6 — Replay Mode
# ---------------------------------------------------------------------------


@sessions_router.patch("/{join_code}/replay", response_model=LiveSessionResponse)
def enable_replay_endpoint(
    join_code: str,
    request: ReplayEnableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher/admin: enable replay on a finished session."""
    role = _get_user_role(current_user)
    if role not in ("teacher", "admin"):
        raise ForbiddenException("Only teachers and admins can enable replay")
    result = session_service.enable_replay(db, join_code, request.replay_deadline)
    # Notify enrolled students
    try:
        from app.modules.notifications.engine import dispatch_notification
        from app.db.models.group import GroupMembership
        live_session = session_service.get_session_by_code(db, join_code)
        activity = get_activity(db, live_session.activity_id)
        if activity.group_id:
            members = db.query(GroupMembership).filter(
                GroupMembership.group_id == activity.group_id,
                GroupMembership.left_at.is_(None),
                GroupMembership.role_in_group == "member",
            ).all()
            for m in members:
                dispatch_notification(
                    db, current_user.tenant_id, m.user_id,
                    type="info",
                    title=f"Replay available: {activity.title}",
                    body="You can now replay this session",
                    link=f"/activities",
                )
    except Exception:
        pass
    return result


@sessions_router.post("/{join_code}/replay/attempt", response_model=AttemptResult)
def submit_replay_attempt_endpoint(
    join_code: str,
    request: ReplaySubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student: submit answers for a replay attempt on a finished session."""
    role = _get_user_role(current_user)
    if role in ("teacher", "admin"):
        raise ForbiddenException("Teachers and admins cannot submit replay attempts")

    answers = [a.model_dump() for a in request.answers]
    attempt, question_results = session_service.submit_replay_attempt(
        db,
        join_code=join_code,
        student_id=current_user.id,
        tenant_id=current_user.tenant_id,
        answers=answers,
    )
    result = AttemptResult.model_validate(attempt)
    result.question_results = question_results
    return result


@sessions_router.get("/{join_code}/replay/attempt", response_model=AttemptResult)
def get_replay_attempt_endpoint(
    join_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student: get their replay (or any) attempt result for this session's activity."""
    role = _get_user_role(current_user)
    if role in ("teacher", "admin"):
        raise ForbiddenException("Teachers and admins do not have replay attempts")

    attempt = session_service.get_replay_attempt(db, join_code, current_user.id)
    if not attempt:
        raise NotFoundException("No attempt found for this session's activity")
    return AttemptResult.model_validate(attempt)
