from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.db.models.notification import Notification


def create_notification(db: Session, tenant_id: UUID, **kwargs) -> Notification:
    notification = Notification(tenant_id=tenant_id, sent_at=datetime.utcnow(), **kwargs)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def list_notifications(db: Session, tenant_id: UUID, user_id: UUID) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.tenant_id == tenant_id, Notification.user_id == user_id)
        .order_by(Notification.read_at.asc().nullsfirst(), Notification.created_at.desc())
        .all()
    )


def mark_read(db: Session, notification_id: UUID, user_id: UUID) -> Notification:
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notification:
        raise NotFoundException("Notification not found")
    notification.read_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_read(db: Session, tenant_id: UUID, user_id: UUID) -> int:
    count = (
        db.query(Notification)
        .filter(
            Notification.tenant_id == tenant_id,
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
        )
        .update({"read_at": datetime.utcnow()})
    )
    db.commit()
    return count
