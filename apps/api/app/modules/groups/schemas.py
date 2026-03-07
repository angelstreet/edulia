from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class GroupCreate(BaseModel):
    type: str = "class"
    name: str
    description: str | None = None
    capacity: int | None = None
    campus_id: UUID | None = None
    academic_year_id: UUID | None = None


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    capacity: int | None = None


class MemberAdd(BaseModel):
    user_id: UUID
    role_in_group: str = "member"


class MemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    role_in_group: str
    role: str = ""
    display_name: str = ""
    joined_at: datetime

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    type: str
    name: str
    description: str | None
    capacity: int | None
    created_at: datetime
    member_count: int = 0

    model_config = {"from_attributes": True}


class GroupDetailResponse(GroupResponse):
    members: list[MemberResponse] = []
