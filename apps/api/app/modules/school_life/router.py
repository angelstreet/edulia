from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.school_life.schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from app.modules.school_life.service import create_incident, list_incidents, update_incident

router = APIRouter(prefix="/api/v1/school-life", tags=["school_life"])


@router.get("/incidents", response_model=list[IncidentResponse])
def get_incidents(
    student_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Students can only see their own incidents
    sid = student_id
    if current_user.role == "student":
        sid = current_user.id
    elif current_user.role == "parent":
        # parent must pass student_id explicitly
        pass
    return list_incidents(db, current_user.tenant_id, sid, status)


@router.post("/incidents", response_model=IncidentResponse, status_code=201)
def post_incident(
    request: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_incident(
        db, current_user.tenant_id, current_user.id,
        student_id=request.student_id,
        incident_type=request.incident_type,
        severity=request.severity,
        description=request.description,
        action_taken=request.action_taken,
    )


@router.patch("/incidents/{incident_id}", response_model=IncidentResponse)
def patch_incident(
    incident_id: UUID,
    request: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_incident(
        db, incident_id, current_user.tenant_id,
        action_taken=request.action_taken,
        status=request.status,
        severity=request.severity,
    )
