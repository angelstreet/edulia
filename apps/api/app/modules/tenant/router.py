from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.db.database import get_db
from app.db.models.user import User
from app.modules.tenant.schemas import (
    TenantResponse,
    TenantSettingsResponse,
    TenantSettingsUpdate,
    TenantUpdate,
)
from app.modules.tenant.service import (
    get_tenant,
    get_tenant_settings,
    update_tenant,
    update_tenant_settings,
)

router = APIRouter(prefix="/api/v1/tenant", tags=["tenant"])


@router.get("", response_model=TenantResponse)
def get_tenant_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_tenant(db, current_user.tenant_id)


@router.patch("", response_model=TenantResponse)
def update_tenant_info(
    request: TenantUpdate,
    current_user: User = Depends(require_permission("admin.tenant.edit")),
    db: Session = Depends(get_db),
):
    return update_tenant(db, current_user.tenant_id, **request.model_dump(exclude_unset=True))


@router.get("/settings")
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_tenant_settings(db, current_user.tenant_id)


@router.patch("/settings")
def update_settings(
    request: TenantSettingsUpdate,
    current_user: User = Depends(require_permission("admin.tenant.edit")),
    db: Session = Depends(get_db),
):
    return update_tenant_settings(db, current_user.tenant_id, request.settings)
