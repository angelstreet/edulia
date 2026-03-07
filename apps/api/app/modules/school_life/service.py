from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.db.models.school_life import Incident


def list_incidents(
    db: Session,
    tenant_id: UUID,
    student_id: Optional[UUID] = None,
    status: Optional[str] = None,
) -> list[Incident]:
    query = db.query(Incident).filter(Incident.tenant_id == tenant_id)
    if student_id:
        query = query.filter(Incident.student_id == student_id)
    if status:
        query = query.filter(Incident.status == status)
    return query.order_by(Incident.created_at.desc()).all()


def create_incident(
    db: Session,
    tenant_id: UUID,
    reported_by: UUID,
    student_id: UUID,
    incident_type: str,
    severity: str,
    description: str,
    action_taken: Optional[str] = None,
) -> Incident:
    incident = Incident(
        tenant_id=tenant_id,
        student_id=student_id,
        reported_by=reported_by,
        incident_type=incident_type,
        severity=severity,
        description=description,
        action_taken=action_taken,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def update_incident(
    db: Session,
    incident_id: UUID,
    tenant_id: UUID,
    action_taken: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
) -> Incident:
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.tenant_id == tenant_id,
    ).first()
    if not incident:
        raise NotFoundException("Incident not found")
    if action_taken is not None:
        incident.action_taken = action_taken
    if status is not None:
        incident.status = status
    if severity is not None:
        incident.severity = severity
    db.commit()
    db.refresh(incident)
    return incident
