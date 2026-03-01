from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    user_id: UUID
    type: str = "info"
    channel: str = "in_app"
    title: str
    body: str | None = None
    link: str | None = None


class NotificationResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    type: str
    channel: str
    title: str
    body: str | None
    link: str | None
    read_at: datetime | None
    sent_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
