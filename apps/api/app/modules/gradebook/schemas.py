from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


# --- GradeCategory ---

class GradeCategoryCreate(BaseModel):
    subject_id: UUID
    group_id: UUID
    term_id: UUID
    name: str
    weight: Decimal = Decimal("1")


class GradeCategoryResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    subject_id: UUID
    group_id: UUID
    term_id: UUID
    name: str
    weight: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Assessment ---

class AssessmentCreate(BaseModel):
    subject_id: UUID
    group_id: UUID
    term_id: UUID
    category_id: UUID | None = None
    title: str
    description: str | None = None
    date: date
    max_score: Decimal = Decimal("20")
    coefficient: Decimal = Decimal("1")


class AssessmentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    subject_id: UUID
    group_id: UUID
    term_id: UUID
    category_id: UUID | None
    teacher_id: UUID
    title: str
    description: str | None
    date: date
    max_score: Decimal
    coefficient: Decimal
    is_published: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Grade ---

class GradeCreate(BaseModel):
    student_id: UUID
    score: Decimal | None = None
    is_absent: bool = False
    is_exempt: bool = False
    comment: str | None = None


class BulkGradeCreate(BaseModel):
    grades: list[GradeCreate]


class GradeResponse(BaseModel):
    id: UUID
    assessment_id: UUID
    student_id: UUID
    score: Decimal | None
    is_absent: bool
    is_exempt: bool
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Student averages ---

class SubjectAverage(BaseModel):
    subject_id: UUID
    subject_name: str
    average: Decimal | None
    assessment_count: int


class StudentAveragesResponse(BaseModel):
    student_id: UUID
    term_id: UUID | None
    averages: list[SubjectAverage]
    general_average: Decimal | None


# --- Student subject detail ---

class StudentGradeDetail(BaseModel):
    assessment_id: UUID
    assessment_title: str
    assessment_date: date
    max_score: Decimal
    coefficient: Decimal
    score: Decimal | None
    is_absent: bool
    is_exempt: bool
    comment: str | None

    model_config = {"from_attributes": True}

class StudentSubjectGradesResponse(BaseModel):
    subject_id: UUID
    subject_name: str
    average: Decimal | None
    grades: list[StudentGradeDetail]
