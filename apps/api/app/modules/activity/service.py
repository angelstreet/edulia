from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.db.models.activity import Activity


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
