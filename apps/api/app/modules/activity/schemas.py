from datetime import datetime
from decimal import Decimal
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


# ---------------------------------------------------------------------------
# Feature 2 — Async Attempt + Auto-Scoring
# ---------------------------------------------------------------------------


class QuestionChoiceStripped(BaseModel):
    """Choice as returned to students: no is_correct field."""
    id: str
    text: str


class QuestionStripped(BaseModel):
    """Question as returned to students: choices have no is_correct field."""
    id: str
    text: str
    type: str = "single"
    choices: list[QuestionChoiceStripped] = []
    time_limit_s: int | None = None
    points: int = 1


class ActivityResponseStripped(BaseModel):
    """Activity as returned on attempt start: is_correct stripped from all choices."""
    id: UUID
    tenant_id: UUID
    created_by: UUID
    title: str
    description: str | None
    type: str
    status: str
    questions: list[QuestionStripped]
    group_id: str | None
    subject_id: str | None
    scheduled_at: datetime | None
    replay_deadline: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AnswerInput(BaseModel):
    question_id: str
    choice_ids: list[str] = []
    text: str | None = None
    answered_at_ms: int | None = None


class AttemptStartResponse(BaseModel):
    attempt_id: UUID
    activity: ActivityResponseStripped  # questions WITHOUT is_correct field


class AttemptSubmitRequest(BaseModel):
    answers: list[AnswerInput]


class AttemptResult(BaseModel):
    id: UUID
    activity_id: UUID
    student_id: UUID
    mode: str
    started_at: datetime
    submitted_at: datetime | None
    answers: list[dict]
    score: Decimal | None
    max_score: Decimal | None
    scored_at: datetime | None
    # after submit, include per-question result:
    question_results: list[dict] | None = None
    # [{question_id, correct: bool, correct_choice_ids: [str], points_earned: float}]

    model_config = {"from_attributes": True}
