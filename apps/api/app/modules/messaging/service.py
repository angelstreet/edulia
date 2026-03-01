from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.models.message import Message, Thread, ThreadParticipant


def create_thread(
    db: Session, tenant_id: UUID, created_by: UUID, type: str, subject: str | None,
    participant_ids: list[UUID], body: str,
) -> dict:
    thread = Thread(tenant_id=tenant_id, created_by=created_by, type=type, subject=subject)
    db.add(thread)
    db.flush()

    # Add creator as sender participant
    creator_participant = ThreadParticipant(
        thread_id=thread.id, user_id=created_by, role="sender",
        read_at=datetime.utcnow(),
    )
    db.add(creator_participant)

    # Add other participants as recipients
    for uid in participant_ids:
        if uid != created_by:
            db.add(ThreadParticipant(thread_id=thread.id, user_id=uid, role="recipient"))

    # Create initial message
    message = Message(thread_id=thread.id, sender_id=created_by, body=body)
    db.add(message)

    db.commit()
    db.refresh(thread)

    return _thread_to_response(thread, created_by)


def list_threads(db: Session, tenant_id: UUID, user_id: UUID) -> list[dict]:
    threads = (
        db.query(Thread)
        .options(joinedload(Thread.participants), joinedload(Thread.messages))
        .join(ThreadParticipant)
        .filter(
            Thread.tenant_id == tenant_id,
            ThreadParticipant.user_id == user_id,
            ThreadParticipant.archived == False,
        )
        .order_by(Thread.updated_at.desc())
        .all()
    )
    seen = set()
    result = []
    for t in threads:
        if t.id not in seen:
            seen.add(t.id)
            result.append(_thread_to_response(t, user_id))
    return result


def get_thread_detail(db: Session, thread_id: UUID, user_id: UUID) -> dict:
    thread = (
        db.query(Thread)
        .options(joinedload(Thread.participants), joinedload(Thread.messages))
        .filter(Thread.id == thread_id)
        .first()
    )
    if not thread:
        raise NotFoundException("Thread not found")

    participant_ids = [p.user_id for p in thread.participants]
    if user_id not in participant_ids:
        raise ForbiddenException("Not a participant of this thread")

    return {
        "id": thread.id,
        "tenant_id": thread.tenant_id,
        "type": thread.type,
        "subject": thread.subject,
        "created_by": thread.created_by,
        "created_at": thread.created_at,
        "participant_count": len(thread.participants),
        "unread": _is_unread(thread, user_id),
        "participants": thread.participants,
        "messages": thread.messages,
    }


def send_message(db: Session, thread_id: UUID, sender_id: UUID, body: str, attachments: list | None = None) -> Message:
    thread = (
        db.query(Thread)
        .options(joinedload(Thread.participants))
        .filter(Thread.id == thread_id)
        .first()
    )
    if not thread:
        raise NotFoundException("Thread not found")

    participant_ids = [p.user_id for p in thread.participants]
    if sender_id not in participant_ids:
        raise ForbiddenException("Not a participant of this thread")

    message = Message(
        thread_id=thread_id, sender_id=sender_id, body=body,
        attachments=attachments or [],
    )
    db.add(message)

    # Update thread updated_at
    thread.updated_at = datetime.utcnow()

    # Reset read_at for other participants
    for p in thread.participants:
        if p.user_id != sender_id:
            p.read_at = None

    db.commit()
    db.refresh(message)
    return message


def mark_read(db: Session, thread_id: UUID, user_id: UUID) -> dict:
    participant = (
        db.query(ThreadParticipant)
        .filter(ThreadParticipant.thread_id == thread_id, ThreadParticipant.user_id == user_id)
        .first()
    )
    if not participant:
        raise NotFoundException("Not a participant of this thread")

    participant.read_at = datetime.utcnow()
    db.commit()
    return {"status": "read"}


def _thread_to_response(thread: Thread, user_id: UUID) -> dict:
    return {
        "id": thread.id,
        "tenant_id": thread.tenant_id,
        "type": thread.type,
        "subject": thread.subject,
        "created_by": thread.created_by,
        "created_at": thread.created_at,
        "participant_count": len(thread.participants),
        "unread": _is_unread(thread, user_id),
    }


def _is_unread(thread: Thread, user_id: UUID) -> bool:
    for p in thread.participants:
        if p.user_id == user_id:
            return p.read_at is None
    return False
