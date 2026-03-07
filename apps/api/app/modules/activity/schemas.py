from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class QuestionChoice(BaseModel):
    id: str  # UUID string
    text: str
    is_correct: bool = False


class Question(BaseModel):
    id: str  # UUID string
    text: str
    type: str = "single"  # single | multi | open
    choices: list[QuestionChoice] = []
    time_limit_s: int | None = None
    points: int = 1


class ActivityCreate(BaseModel):
    title: str
    description: str | None = None
    type: str = "qcm"
    group_id: str | None = None  # UUID as string
    subject_id: str | None = None
    questions: list[Question] = []
    scheduled_at: datetime | None = None


class ActivityUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None  # draft | published | closed
    group_id: str | None = None
    subject_id: str | None = None
    questions: list[Question] | None = None
    scheduled_at: datetime | None = None
    replay_deadline: datetime | None = None


class ActivityResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    created_by: UUID
    title: str
    description: str | None
    type: str
    status: str
    questions: list[Question]
    group_id: str | None
    subject_id: str | None
    scheduled_at: datetime | None
    replay_deadline: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
