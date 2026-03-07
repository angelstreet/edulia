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


# ---------------------------------------------------------------------------
# Feature 3 — Teacher Auto-Reporting Dashboard
# ---------------------------------------------------------------------------


class QuestionErrorRate(BaseModel):
    question_id: str
    question_text: str
    error_rate: float  # 0.0 to 1.0 — fraction who answered wrong


class ActivityReport(BaseModel):
    id: UUID
    title: str
    type: str
    status: str
    group_id: str | None
    subject_id: str | None
    created_at: datetime
    total_attempts: int
    avg_score: float | None      # None if no submissions yet
    max_score: float | None      # max possible score (from activity questions)
    completion_rate: float       # submitted / total_attempts (always 0 if no attempts)
    question_error_rates: list[QuestionErrorRate]


class StudentActivityScore(BaseModel):
    activity_id: UUID
    activity_title: str
    score: float | None
    max_score: float | None
    submitted_at: datetime | None
    mode: str  # async | live | replay


class StudentReport(BaseModel):
    student_id: UUID
    attempts: list[StudentActivityScore]
    avg_score: float | None
    total_submitted: int
