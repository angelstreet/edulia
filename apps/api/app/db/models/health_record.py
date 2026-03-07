from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TenantMixin


class HealthRecord(Base, TenantMixin):
    __tablename__ = "health_records"

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    allergies = Column(Text, nullable=True)
    medical_conditions = Column(Text, nullable=True)
    medications = Column(Text, nullable=True)
    doctor_name = Column(String(200), nullable=True)
    doctor_phone = Column(String(50), nullable=True)
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)
    blood_type = Column(String(10), nullable=True)
    notes = Column(Text, nullable=True)
