import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session as DBSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.db.models.activity import Activity
from app.db.models.activity_attempt import ActivityAttempt
from app.db.models.live_session import LiveSession, _generate_join_code
from app.modules.activity.scoring import score_attempt

logger = logging.getLogger(__name__)


def create_session(
    db: DBSession,
    tenant_id: UUID,
    teacher_id: UUID,
    activity_id: UUID,
) -> LiveSession:
    """Create a new live session with a unique join code."""
    # Generate join code, retry if collision (rare)
    code = None
    for _ in range(10):
        candidate = _generate_join_code()
        existing = db.query(LiveSession).filter(LiveSession.join_code == candidate).first()
        if not existing:
            code = candidate
            break

    if code is None:
        # Extremely unlikely — all 10 attempts collided
        raise RuntimeError("Could not generate a unique join code after 10 attempts")

    session = LiveSession(
        tenant_id=tenant_id,
        activity_id=activity_id,
        teacher_id=teacher_id,
        join_code=code,
        state='lobby',
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_by_code(db: DBSession, join_code: str) -> LiveSession:
    """Get session by join code. Raises NotFoundException if not found."""
    session = db.query(LiveSession).filter(
        LiveSession.join_code == join_code.upper()
    ).first()
    if not session:
        raise NotFoundException(f"Session {join_code} not found")
    return session


def get_session_by_id(db: DBSession, session_id: UUID) -> LiveSession:
    """Get session by id. Raises NotFoundException if not found."""
    session = db.query(LiveSession).filter(LiveSession.id == session_id).first()
    if not session:
        raise NotFoundException("Session not found")
    return session


def finish_session(db: DBSession, session_id: UUID) -> LiveSession:
    """Mark session as finished."""
    session = get_session_by_id(db, session_id)
    session.state = 'finished'
    session.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def get_activity_by_id(db: DBSession, activity_id: UUID) -> Activity:
    """Get activity by id. Raises NotFoundException if not found."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise NotFoundException("Activity not found")
    return activity


def advance_session_question(
    db: DBSession,
    session_id: UUID,
    new_index: int,
    new_state: str,
    set_started_at: bool = False,
) -> LiveSession:
    """
    Update current_question_index and state on a live session.
    Optionally sets started_at=now() when transitioning from lobby→active.
    Commits and refreshes.
    """
    session = get_session_by_id(db, session_id)
    session.current_question_index = new_index
    session.state = new_state
    if set_started_at:
        session.started_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def set_session_state(
    db: DBSession,
    session_id: UUID,
    new_state: str,
    ended_at: bool = False,
) -> LiveSession:
    """
    Update just the state on a live session.
    Optionally sets ended_at=now() for finished state.
    Commits and refreshes.
    """
    session = get_session_by_id(db, session_id)
    session.state = new_state
    if ended_at:
        session.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


# ---------------------------------------------------------------------------
# Feature 6 — Replay Mode
# ---------------------------------------------------------------------------


def enable_replay(
    db: DBSession,
    join_code: str,
    replay_deadline: datetime | None,
) -> LiveSession:
    """
    Teacher enables replay on a finished session.
    Raises 400 if session is not in 'finished' state.
    """
    session = get_session_by_code(db, join_code)
    if session.state != "finished":
        raise BadRequestException("Session must be finished to enable replay")
    session.replay_open = True
    session.replay_deadline = replay_deadline
    db.commit()
    db.refresh(session)
    return session


def submit_replay_attempt(
    db: DBSession,
    join_code: str,
    student_id: UUID,
    tenant_id: UUID,
    answers: list[dict],
) -> tuple[ActivityAttempt, list[dict]]:
    """
    Student submits a replay attempt for a finished session.

    - Validates replay_open and deadline.
    - If student already has an attempt for this activity (due to unique constraint
      on (activity_id, student_id)), returns the existing attempt with empty
      question_results rather than creating a duplicate.
    - Otherwise creates a new attempt with mode='replay', scores it, and returns it.
    """
    session = get_session_by_code(db, join_code)

    if not session.replay_open:
        raise ForbiddenException("Replay is not open for this session")

    if session.replay_deadline is not None and datetime.utcnow() > session.replay_deadline:
        raise ForbiddenException("Replay deadline has passed")

    # Check for existing attempt (unique constraint is on activity_id + student_id)
    existing = (
        db.query(ActivityAttempt)
        .filter(
            ActivityAttempt.activity_id == session.activity_id,
            ActivityAttempt.student_id == student_id,
        )
        .first()
    )
    if existing:
        # Return existing attempt; compute question_results from stored answers if submitted
        question_results = _build_question_results(db, session.activity_id, existing.answers or [])
        return existing, question_results

    # Load the activity to get questions
    activity = get_activity_by_id(db, session.activity_id)

    # Score the attempt
    scored, max_scored = score_attempt(activity.questions or [], answers)
    question_results = _build_question_results_from_questions(activity.questions or [], answers)

    now = datetime.utcnow()
    attempt = ActivityAttempt(
        tenant_id=tenant_id,
        activity_id=session.activity_id,
        student_id=student_id,
        session_id=session.id,
        mode="replay",
        started_at=now,
        submitted_at=now,
        scored_at=now,
        answers=answers,
        score=scored,
        max_score=max_scored,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt, question_results


def get_replay_attempt(
    db: DBSession,
    join_code: str,
    student_id: UUID,
) -> ActivityAttempt | None:
    """
    Return the student's existing attempt for the session's activity, or None.
    (Due to the unique constraint there is at most one attempt per student per activity.)
    """
    session = get_session_by_code(db, join_code)
    return (
        db.query(ActivityAttempt)
        .filter(
            ActivityAttempt.activity_id == session.activity_id,
            ActivityAttempt.student_id == student_id,
        )
        .first()
    )


def _build_question_results(
    db: DBSession,
    activity_id: UUID,
    answers: list[dict],
) -> list[dict]:
    """Load activity and build question results from stored answers."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        return []
    return _build_question_results_from_questions(activity.questions or [], answers)


def _build_question_results_from_questions(
    questions: list[dict],
    answers: list[dict],
) -> list[dict]:
    """Build per-question result dicts given question definitions and student answers."""
    answer_map = {a.get("question_id", ""): a for a in answers}
    question_results = []
    for q in questions:
        q_id = q.get("id", "")
        q_type = q.get("type", "single")
        points = q.get("points", 1)
        answer = answer_map.get(q_id, {})
        given = set(answer.get("choice_ids", []))
        correct_choice_ids = [c["id"] for c in q.get("choices", []) if c.get("is_correct")]

        if q_type == "open":
            question_results.append({
                "question_id": q_id,
                "correct": None,
                "correct_choice_ids": [],
                "points_earned": 0.0,
            })
        elif q_type == "single":
            is_correct = (
                len(given) == 1
                and bool(correct_choice_ids)
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
    return question_results
