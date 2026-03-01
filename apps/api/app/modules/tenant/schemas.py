from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TenantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    type: str
    subscription_plan: str | None
    custom_domain: str | None
    branding: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantUpdate(BaseModel):
    name: str | None = None
    custom_domain: str | None = None
    branding: dict | None = None


class TenantSettingsResponse(BaseModel):
    settings: dict


class TenantSettingsUpdate(BaseModel):
    settings: dict
