from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.messaging.schemas import (
    MessageCreate,
    MessageResponse,
    ThreadCreate,
    ThreadDetailResponse,
    ThreadResponse,
)
from app.modules.messaging.service import (
    create_thread,
    get_thread_detail,
    list_threads,
    mark_read,
    send_message,
)

router = APIRouter(prefix="/api/v1/threads", tags=["messaging"])


@router.post("", response_model=ThreadResponse, status_code=201)
def create(
    request: ThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_thread(
        db, current_user.tenant_id, current_user.id,
        request.type, request.subject, request.participant_ids, request.body,
    )


@router.get("", response_model=list[ThreadResponse])
def list_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_threads(db, current_user.tenant_id, current_user.id)


@router.get("/{thread_id}", response_model=ThreadDetailResponse)
def detail(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_thread_detail(db, thread_id, current_user.id)


@router.post("/{thread_id}/messages", response_model=MessageResponse, status_code=201)
def reply(
    thread_id: UUID,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return send_message(db, thread_id, current_user.id, request.body, request.attachments)


@router.patch("/{thread_id}/read")
def read(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return mark_read(db, thread_id, current_user.id)
