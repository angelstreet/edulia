from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.db.models.gradebook import Assessment, Grade, GradeCategory
from app.db.models.subject import Subject


def create_grade_category(db: Session, tenant_id: UUID, **kwargs) -> GradeCategory:
    category = GradeCategory(tenant_id=tenant_id, **kwargs)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def list_grade_categories(db: Session, tenant_id: UUID, group_id: UUID, subject_id: UUID, term_id: UUID) -> list[GradeCategory]:
    return (
        db.query(GradeCategory)
        .filter(
            GradeCategory.tenant_id == tenant_id,
            GradeCategory.group_id == group_id,
            GradeCategory.subject_id == subject_id,
            GradeCategory.term_id == term_id,
        )
        .order_by(GradeCategory.name)
        .all()
    )


def create_assessment(db: Session, tenant_id: UUID, teacher_id: UUID, **kwargs) -> Assessment:
    assessment = Assessment(tenant_id=tenant_id, teacher_id=teacher_id, **kwargs)
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


def list_assessments(
    db: Session,
    tenant_id: UUID,
    group_id: UUID | None = None,
    subject_id: UUID | None = None,
    term_id: UUID | None = None,
) -> list[Assessment]:
    query = db.query(Assessment).filter(Assessment.tenant_id == tenant_id)
    if group_id:
        query = query.filter(Assessment.group_id == group_id)
    if subject_id:
        query = query.filter(Assessment.subject_id == subject_id)
    if term_id:
        query = query.filter(Assessment.term_id == term_id)
    return query.order_by(Assessment.date.desc()).all()


def get_assessment(db: Session, assessment_id: UUID) -> Assessment:
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.grades))
        .filter(Assessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise NotFoundException("Assessment not found")
    return assessment


def get_assessment_grades(db: Session, assessment_id: UUID) -> list[Grade]:
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise NotFoundException("Assessment not found")
    return (
        db.query(Grade)
        .filter(Grade.assessment_id == assessment_id)
        .order_by(Grade.student_id)
        .all()
    )


def bulk_create_grades(db: Session, assessment_id: UUID, grades_data: list[dict]) -> list[Grade]:
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise NotFoundException("Assessment not found")

    # Delete existing grades for this assessment to allow re-entry
    db.query(Grade).filter(Grade.assessment_id == assessment_id).delete()

    grades = []
    for data in grades_data:
        grade = Grade(assessment_id=assessment_id, **data)
        db.add(grade)
        grades.append(grade)

    db.commit()
    for g in grades:
        db.refresh(g)
    return grades


def get_student_averages(
    db: Session,
    tenant_id: UUID,
    student_id: UUID,
    term_id: UUID | None = None,
) -> dict:
    """Compute weighted averages per subject for a student."""
    query = (
        db.query(
            Assessment.subject_id,
            Subject.name.label("subject_name"),
            func.sum(Grade.score * Assessment.coefficient).label("weighted_sum"),
            func.sum(Assessment.max_score * Assessment.coefficient).label("weighted_max"),
            func.count(Grade.id).label("assessment_count"),
        )
        .join(Grade, Grade.assessment_id == Assessment.id)
        .join(Subject, Subject.id == Assessment.subject_id)
        .filter(
            Assessment.tenant_id == tenant_id,
            Grade.student_id == student_id,
            Grade.score.isnot(None),
            Grade.is_absent.is_(False),
            Grade.is_exempt.is_(False),
        )
    )
    if term_id:
        query = query.filter(Assessment.term_id == term_id)

    rows = query.group_by(Assessment.subject_id, Subject.name).all()

    averages = []
    total_weighted = Decimal("0")
    total_max = Decimal("0")

    for row in rows:
        if row.weighted_max and row.weighted_max > 0:
            avg = (row.weighted_sum / row.weighted_max) * 20
            avg = round(avg, 2)
        else:
            avg = None

        averages.append({
            "subject_id": row.subject_id,
            "subject_name": row.subject_name,
            "average": avg,
            "assessment_count": row.assessment_count,
        })

        if avg is not None:
            total_weighted += row.weighted_sum
            total_max += row.weighted_max

    general_average = None
    if total_max > 0:
        general_average = round((total_weighted / total_max) * 20, 2)

    return {
        "student_id": student_id,
        "term_id": term_id,
        "averages": averages,
        "general_average": general_average,
    }
