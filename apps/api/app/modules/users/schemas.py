from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str | None = None
    first_name: str
    last_name: str
    display_name: str | None = None
    phone: str | None = None
    gender: str | None = None
    role_code: str | None = None  # Assign a role by code at creation


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    display_name: str | None = None
    phone: str | None = None
    gender: str | None = None
    avatar_url: str | None = None
    status: str | None = None


class UserResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    email: str
    first_name: str
    last_name: str
    display_name: str | None
    avatar_url: str | None
    phone: str | None
    gender: str | None
    status: str
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
    roles: list[str] = []

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int


class RelationshipCreate(BaseModel):
    to_user_id: UUID
    type: str  # guardian | manager | tutor | mentor | emergency_contact
    is_primary: bool = False
    metadata: dict | None = None


class RelationshipResponse(BaseModel):
    id: UUID
    from_user_id: UUID
    to_user_id: UUID
    type: str
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}
