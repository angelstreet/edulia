from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class PlatformResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    url: str
    logo_url: str | None = None
    description: str | None = None
    is_free: bool = False
    has_certificates: bool = False
    languages: list[str] = []
    categories: list[str] = []
    course_count: int = 0

    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: UUID
    platform_id: UUID
    platform_name: str | None = None
    title: str
    url: str
    description: str | None = None
    difficulty: str = "beginner"
    format: str = "video"
    language: str = "en"
    duration_hours: float | None = None
    is_free: bool = True
    has_certificate: bool = False
    tags: list[str] = []
    category: str = "professional"
    image_url: str | None = None

    model_config = {"from_attributes": True}
