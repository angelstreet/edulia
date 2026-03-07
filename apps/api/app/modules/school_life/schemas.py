from typing import Optional
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class IncidentCreate(BaseModel):
    student_id: UUID
    incident_type: str = "behavior"
    severity: str = "low"
    description: str
    action_taken: Optional[str] = None


class IncidentUpdate(BaseModel):
    action_taken: Optional[str] = None
    status: Optional[str] = None
    severity: Optional[str] = None


class IncidentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    student_id: UUID
    reported_by: UUID
    incident_type: str
    severity: str
    description: str
    action_taken: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
