from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ThreadCreate(BaseModel):
    type: str = "direct"
    subject: str | None = None
    participant_ids: list[UUID]
    body: str


class MessageCreate(BaseModel):
    body: str
    attachments: list[dict] | None = None


class MessageResponse(BaseModel):
    id: UUID
    thread_id: UUID
    sender_id: UUID
    body: str
    attachments: list[dict] | None = None
    created_at: datetime
    edited_at: datetime | None = None

    model_config = {"from_attributes": True}


class ParticipantResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    read_at: datetime | None = None

    model_config = {"from_attributes": True}


class ThreadResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    type: str
    subject: str | None
    created_by: UUID
    created_at: datetime
    participant_count: int = 0
    unread: bool = False

    model_config = {"from_attributes": True}


class ThreadDetailResponse(ThreadResponse):
    participants: list[ParticipantResponse] = []
    messages: list[MessageResponse] = []
