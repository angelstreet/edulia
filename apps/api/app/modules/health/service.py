from uuid import UUID
from sqlalchemy.orm import Session
from app.db.models.health_record import HealthRecord


def get_or_create(db, tenant_id, student_id):
    r = db.query(HealthRecord).filter(HealthRecord.student_id == student_id).first()
    if not r:
        r = HealthRecord(tenant_id=tenant_id, student_id=student_id)
        db.add(r)
        db.commit()
        db.refresh(r)
    return r


def upsert(db, tenant_id, student_id, **data):
    r = get_or_create(db, tenant_id, student_id)
    for k, v in data.items():
        if v is not None:
            setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r
