from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class HealthRecordUpsert(BaseModel):
    allergies: str | None = None
    medical_conditions: str | None = None
    medications: str | None = None
    doctor_name: str | None = None
    doctor_phone: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None
    blood_type: str | None = None
    notes: str | None = None


class HealthRecordResponse(HealthRecordUpsert):
    id: UUID
    tenant_id: UUID
    student_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
