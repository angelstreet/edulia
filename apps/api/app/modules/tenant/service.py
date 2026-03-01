from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.db.models.tenant import Tenant


def get_tenant(db: Session, tenant_id: UUID) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise NotFoundException("Tenant not found")
    return tenant


def update_tenant(db: Session, tenant_id: UUID, **kwargs) -> Tenant:
    tenant = get_tenant(db, tenant_id)
    for key, value in kwargs.items():
        if value is not None and hasattr(tenant, key):
            setattr(tenant, key, value)
    db.commit()
    db.refresh(tenant)
    return tenant


def get_tenant_settings(db: Session, tenant_id: UUID) -> dict:
    tenant = get_tenant(db, tenant_id)
    return tenant.settings or {}


def update_tenant_settings(db: Session, tenant_id: UUID, settings: dict) -> dict:
    tenant = get_tenant(db, tenant_id)
    current = tenant.settings or {}
    current.update(settings)
    tenant.settings = current
    db.commit()
    db.refresh(tenant)
    return tenant.settings
