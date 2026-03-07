from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.db.models.activity import Activity
from app.db.models.activity_attempt import ActivityAttempt
from app.modules.activity.scoring import score_attempt


def list_activities(
    db: Session,
    tenant_id: UUID,
    user_id: UUID,
    role: str,
    group_id: str | None = None,
) -> list[Activity]:
    query = db.query(Activity).filter(Activity.tenant_id == tenant_id)

    if role == "student":
        # Students see only published activities where group_id matches their group
        query = query.filter(Activity.status == "published")
        if group_id:
            query = query.filter(Activity.group_id == group_id)
    else:
        # Teachers and admins see all activities for the tenant
        if group_id:
            query = query.filter(Activity.group_id == group_id)

    return query.order_by(Activity.created_at.desc()).all()


def get_activity(db: Session, activity_id: UUID) -> Activity:
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise NotFoundException("Activity not found")
    return activity


def create_activity(
    db: Session,
    tenant_id: UUID,
    created_by: UUID,
    title: str,
    description: str | None = None,
    type: str = "qcm",
    group_id: str | None = None,
    subject_id: str | None = None,
    questions: list[dict] | None = None,
    scheduled_at=None,
) -> Activity:
    activity = Activity(
        tenant_id=tenant_id,
        created_by=created_by,
        title=title,
        description=description,
        type=type,
        group_id=group_id,
        subject_id=subject_id,
        questions=questions or [],
        scheduled_at=scheduled_at,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def update_activity(db: Session, activity_id: UUID, **kwargs) -> Activity:
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise NotFoundException("Activity not found")
    for key, value in kwargs.items():
        if value is not None:
            setattr(activity, key, value)
    db.commit()
    db.refresh(activity)
    return activity


def delete_activity(db: Session, activity_id: UUID) -> None:
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise NotFoundException("Activity not found")
    db.delete(activity)
    db.commit()


# ---------------------------------------------------------------------------
# Feature 2 — Async Attempt + Auto-Scoring
# ---------------------------------------------------------------------------


def strip_correct_answers(activity: Activity) -> dict:
    """Return activity dict with is_correct removed from all choices."""
    questions = []
    for q in (activity.questions or []):
        choices = [
            {k: v for k, v in c.items() if k != "is_correct"}
            for c in q.get("choices", [])
        ]
        questions.append({**q, "choices": choices})
    # Build a plain dict from the ORM instance, replacing questions
    activity_dict = {
        "id": activity.id,
        "tenant_id": activity.tenant_id,
        "created_by": activity.created_by,
        "title": activity.title,
        "description": activity.description,
        "type": activity.type,
        "status": activity.status,
        "questions": questions,
        "group_id": str(activity.group_id) if activity.group_id else None,
        "subject_id": str(activity.subject_id) if activity.subject_id else None,
        "scheduled_at": activity.scheduled_at,
        "replay_deadline": activity.replay_deadline,
        "created_at": activity.created_at,
    }
    return activity_dict


def start_attempt(
    db: Session,
    activity_id: UUID,
    student_id: UUID,
    tenant_id: UUID,
) -> tuple[ActivityAttempt, Activity]:
    """Create attempt. Raise 409 if already attempted. Raise 404 if activity not found or not published."""
    # Check activity exists and is published
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise NotFoundException("Activity not found")
    if activity.status != "published":
        raise NotFoundException("Activity is not published")

    # Check no existing attempt for this student+activity
    existing = (
        db.query(ActivityAttempt)
        .filter(
            ActivityAttempt.activity_id == activity_id,
            ActivityAttempt.student_id == student_id,
        )
        .first()
    )
    if existing:
        raise ConflictException("You have already attempted this activity")

    # Create ActivityAttempt with mode='async', started_at=now
    attempt = ActivityAttempt(
        tenant_id=tenant_id,
        activity_id=activity_id,
        student_id=student_id,
        mode="async",
        started_at=datetime.utcnow(),
        answers=[],
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt, activity


def submit_attempt(
    db: Session,
    attempt_id: UUID,
    student_id: UUID,
    answers: list[dict],
) -> tuple[ActivityAttempt, list[dict]]:
    """Score and save. Return (attempt, question_results)."""
    # Get attempt, verify student_id matches, verify not already submitted
    attempt = db.query(ActivityAttempt).filter(ActivityAttempt.id == attempt_id).first()
    if not attempt:
        raise NotFoundException("Attempt not found")
    if attempt.student_id != student_id:
        raise ForbiddenException("You are not the owner of this attempt")
    if attempt.submitted_at is not None:
        raise ConflictException("This attempt has already been submitted")

    # Get activity
    activity = db.query(Activity).filter(Activity.id == attempt.activity_id).first()
    if not activity:
        raise NotFoundException("Activity not found")

    # Score via scoring.score_attempt
    scored, max_scored = score_attempt(activity.questions or [], answers)

    # Build question_results: for each question, whether student got it right + correct_choice_ids
    answer_map = {a["question_id"]: a for a in answers}
    question_results = []
    for q in (activity.questions or []):
        q_id = q.get("id", "")
        q_type = q.get("type", "single")
        points = q.get("points", 1)
        answer = answer_map.get(q_id, {})
        given = set(answer.get("choice_ids", []))
        correct_choice_ids = [c["id"] for c in q.get("choices", []) if c.get("is_correct")]

        if q_type == "open":
            question_results.append({
                "question_id": q_id,
                "correct": None,  # manual grading required
                "correct_choice_ids": [],
                "points_earned": 0.0,
            })
        elif q_type == "single":
            is_correct = (
                len(given) == 1
                and correct_choice_ids
                and list(given)[0] == correct_choice_ids[0]
            )
            question_results.append({
                "question_id": q_id,
                "correct": is_correct,
                "correct_choice_ids": correct_choice_ids,
                "points_earned": float(points) if is_correct else 0.0,
            })
        elif q_type == "multi":
            correct_set = set(correct_choice_ids)
            total_correct = len(correct_set)
            correct_selected = len(given & correct_set)
            incorrect_selected = len(given - correct_set)
            if total_correct > 0:
                raw = max(0, (correct_selected - incorrect_selected) / total_correct)
            else:
                raw = 0.0
            earned = raw * points
            question_results.append({
                "question_id": q_id,
                "correct": correct_set == given,
                "correct_choice_ids": correct_choice_ids,
                "points_earned": round(earned, 4),
            })
        else:
            question_results.append({
                "question_id": q_id,
                "correct": False,
                "correct_choice_ids": correct_choice_ids,
                "points_earned": 0.0,
            })

    now = datetime.utcnow()
    attempt.answers = answers
    attempt.score = scored
    attempt.max_score = max_scored
    attempt.submitted_at = now
    attempt.scored_at = now
    db.commit()
    db.refresh(attempt)
    return attempt, question_results


def get_my_attempt(
    db: Session,
    activity_id: UUID,
    student_id: UUID,
) -> ActivityAttempt | None:
    """Get student's own attempt for an activity, or None."""
    return (
        db.query(ActivityAttempt)
        .filter(
            ActivityAttempt.activity_id == activity_id,
            ActivityAttempt.student_id == student_id,
        )
        .first()
    )


def get_all_attempts(db: Session, activity_id: UUID) -> list[ActivityAttempt]:
    """Teacher: get all attempts for an activity."""
    return (
        db.query(ActivityAttempt)
        .filter(ActivityAttempt.activity_id == activity_id)
        .order_by(ActivityAttempt.submitted_at.desc())
        .all()
    )
