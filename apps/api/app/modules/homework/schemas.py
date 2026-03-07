from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


# --- Homework ---

class HomeworkCreate(BaseModel):
    subject_id: UUID
    group_id: UUID
    title: str
    description: str | None = None
    assigned_date: date
    due_date: date
    allow_submission: bool = False
    submission_type: str = "file"


class HomeworkResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    subject_id: UUID
    group_id: UUID
    teacher_id: UUID
    title: str
    description: str | None
    assigned_date: date
    due_date: date
    allow_submission: bool
    submission_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Submission ---

class SubmissionCreate(BaseModel):
    content: str | None = None


class SubmissionGrade(BaseModel):
    grade: Decimal | None = None
    teacher_feedback: str | None = None
    status: str = "graded"


class SubmissionResponse(BaseModel):
    id: UUID
    homework_id: UUID
    student_id: UUID
    submitted_at: datetime
    content: str | None
    status: str
    grade: Decimal | None
    teacher_feedback: str | None
    graded_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
