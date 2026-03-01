from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.notifications.schemas import NotificationResponse
from app.modules.notifications.service import list_notifications, mark_all_read, mark_read

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_notifications(db, current_user.tenant_id, current_user.id)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return mark_read(db, notification_id, current_user.id)


@router.post("/read-all")
def read_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = mark_all_read(db, current_user.tenant_id, current_user.id)
    return {"marked_read": count}
