from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class PortfolioUpdate(BaseModel):
    headline: str | None = None
    bio: str | None = None
    is_public: bool | None = None
    linkedin_url: str | None = None
    website_url: str | None = None


class PortfolioResponse(BaseModel):
    id: UUID
    user_id: UUID
    slug: str
    headline: str | None = None
    bio: str | None = None
    is_public: bool = True
    linkedin_url: str | None = None
    website_url: str | None = None
    user_name: str | None = None
    certificate_count: int = 0

    model_config = {"from_attributes": True}
