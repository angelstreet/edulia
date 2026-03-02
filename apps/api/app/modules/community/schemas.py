from uuid import UUID

from pydantic import BaseModel


class DirectoryUser(BaseModel):
    id: UUID
    display_name: str
    role: str
    group_name: str | None = None

    model_config = {"from_attributes": True}


class DelegateResponse(BaseModel):
    user_id: UUID
    display_name: str
    group_id: UUID
    group_name: str

    model_config = {"from_attributes": True}
