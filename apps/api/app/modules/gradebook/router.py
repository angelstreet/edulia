from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.gradebook.schemas import (
    AssessmentCreate,
    AssessmentResponse,
    BulkGradeCreate,
    GradeCategoryCreate,
    GradeCategoryResponse,
    GradeResponse,
    StudentAveragesResponse,
    StudentSubjectGradesResponse,
)
from app.modules.gradebook.service import (
    bulk_create_grades,
    create_assessment,
    create_grade_category,
    get_assessment,
    get_assessment_grades,
    list_assessments,
    list_grade_categories,
    get_student_averages,
    get_student_subject_grades,
)

router = APIRouter(prefix="/api/v1/gradebook", tags=["gradebook"])


# --- Grade Categories ---

@router.post("/categories", response_model=GradeCategoryResponse, status_code=201)
def create_category(
    request: GradeCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = create_grade_category(db, current_user.tenant_id, **request.model_dump())
    return category


@router.get("/categories", response_model=list[GradeCategoryResponse])
def list_categories(
    group_id: UUID = Query(...),
    subject_id: UUID = Query(...),
    term_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_grade_categories(db, current_user.tenant_id, group_id, subject_id, term_id)


# --- Assessments ---

@router.post("/assessments", response_model=AssessmentResponse, status_code=201)
def create(
    request: AssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assessment = create_assessment(db, current_user.tenant_id, current_user.id, **request.model_dump())
    return assessment


@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
def get_assessment_detail(
    assessment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_assessment(db, assessment_id)


@router.get("/assessments", response_model=list[AssessmentResponse])
def list_all(
    group_id: UUID | None = Query(None),
    subject_id: UUID | None = Query(None),
    term_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_assessments(db, current_user.tenant_id, group_id, subject_id, term_id)


# --- Grades ---

@router.get("/assessments/{assessment_id}/grades", response_model=list[GradeResponse])
def get_grades(
    assessment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_assessment_grades(db, assessment_id)


@router.post("/grades/bulk", response_model=list[GradeResponse], status_code=201)
def bulk_grades(
    assessment_id: UUID = Query(...),
    request: BulkGradeCreate = ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    grades_data = [g.model_dump() for g in request.grades]
    grades = bulk_create_grades(db, assessment_id, grades_data)
    # Dispatch notification per student graded
    try:
        from app.modules.notifications.engine import dispatch_notification
        assessment = get_assessment(db, assessment_id)
        for grade in grades:
            if grade.score is not None:
                dispatch_notification(
                    db, current_user.tenant_id, grade.student_id,
                    type="info",
                    title=f"New grade: {assessment.title}",
                    body=f"Score: {grade.score}/{assessment.max_score}",
                    link=f"/grades",
                )
    except Exception:
        pass
    return grades


# --- Student Averages ---

@router.get("/students/{student_id}/averages", response_model=StudentAveragesResponse)
def student_averages(
    student_id: UUID,
    term_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_student_averages(db, current_user.tenant_id, student_id, term_id)


@router.get("/students/{student_id}/subjects/{subject_id}/grades", response_model=StudentSubjectGradesResponse)
def student_subject_grades(
    student_id: UUID,
    subject_id: UUID,
    term_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_student_subject_grades(db, current_user.tenant_id, student_id, subject_id, term_id)
