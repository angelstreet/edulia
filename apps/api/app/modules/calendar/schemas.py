from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_at: datetime
    end_at: Optional[datetime] = None
    event_type: str = "general"
    color: Optional[str] = None
    target_roles: Optional[List[str]] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    event_type: Optional[str] = None
    color: Optional[str] = None
    target_roles: Optional[List[str]] = None


class EventResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    title: str
    description: Optional[str]
    start_at: datetime
    end_at: Optional[datetime]
    event_type: str
    color: Optional[str]
    target_roles: Optional[List[str]]
    created_by: Optional[UUID]
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_obj(cls, obj) -> "EventResponse":
        roles = [r for r in obj.target_roles.split(",") if r] if obj.target_roles else None
        return cls(
            id=obj.id,
            tenant_id=obj.tenant_id,
            title=obj.title,
            description=obj.description,
            start_at=obj.start_at,
            end_at=obj.end_at,
            event_type=obj.event_type,
            color=obj.color,
            target_roles=roles,
            created_by=obj.created_by,
            created_at=obj.created_at,
        )
