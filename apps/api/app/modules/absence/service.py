from datetime import datetime, date
from uuid import UUID
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundException, AppException
from app.db.models.absence_justification import AbsenceJustification


def create_justification(db, tenant_id, submitted_by, **kwargs):
    j = AbsenceJustification(tenant_id=tenant_id, submitted_by=submitted_by, **kwargs)
    db.add(j)
    db.commit()
    db.refresh(j)
    return j


def list_justifications(db, tenant_id, student_id=None, status=None):
    q = db.query(AbsenceJustification).filter(AbsenceJustification.tenant_id == tenant_id)
    if student_id:
        q = q.filter(AbsenceJustification.student_id == student_id)
    if status:
        q = q.filter(AbsenceJustification.status == status)
    return q.order_by(AbsenceJustification.absence_date.desc()).all()


def review_justification(db, justification_id, tenant_id, reviewer_id, status):
    if status not in ("accepted", "rejected"):
        raise AppException(400, "Status must be accepted or rejected")
    j = db.query(AbsenceJustification).filter(
        AbsenceJustification.id == justification_id,
        AbsenceJustification.tenant_id == tenant_id,
    ).first()
    if not j:
        raise NotFoundException("Justification not found")
    j.status = status
    j.reviewed_by = reviewer_id
    j.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(j)
    return j
