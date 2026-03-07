import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session as DBSession

from app.core.exceptions import NotFoundException
from app.db.models.live_session import LiveSession, _generate_join_code

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
