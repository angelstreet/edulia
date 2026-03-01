from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FileResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    uploaded_by: UUID
    name: str
    mime_type: str
    size_bytes: int
    storage_key: str
    folder: str | None
    visibility: str
    context_type: str | None
    context_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
