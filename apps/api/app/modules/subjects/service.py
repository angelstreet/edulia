from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.db.models.subject import Subject


def create_subject(db: Session, tenant_id: UUID, **kwargs) -> Subject:
    subject = Subject(tenant_id=tenant_id, **kwargs)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def list_subjects(db: Session, tenant_id: UUID) -> list[Subject]:
    return db.query(Subject).filter(Subject.tenant_id == tenant_id).order_by(Subject.code).all()


def update_subject(db: Session, subject_id: UUID, **kwargs) -> Subject:
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise NotFoundException("Subject not found")
    for key, value in kwargs.items():
        if value is not None:
            setattr(subject, key, value)
    db.commit()
    db.refresh(subject)
    return subject


def delete_subject(db: Session, subject_id: UUID) -> None:
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise NotFoundException("Subject not found")
    db.delete(subject)
    db.commit()
