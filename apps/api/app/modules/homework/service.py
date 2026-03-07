from datetime import date, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.db.models.homework import Homework, Submission


def create_homework(db: Session, tenant_id: UUID, teacher_id: UUID, **kwargs) -> Homework:
    hw = Homework(tenant_id=tenant_id, teacher_id=teacher_id, **kwargs)
    db.add(hw)
    db.commit()
    db.refresh(hw)
    return hw


def list_homework(
    db: Session,
    tenant_id: UUID,
    group_id: UUID | None = None,
    subject_id: UUID | None = None,
    due_from: date | None = None,
    due_until: date | None = None,
) -> list[Homework]:
    query = db.query(Homework).filter(Homework.tenant_id == tenant_id)
    if group_id:
        query = query.filter(Homework.group_id == group_id)
    if subject_id:
        query = query.filter(Homework.subject_id == subject_id)
    if due_from:
        query = query.filter(Homework.due_date >= due_from)
    if due_until:
        query = query.filter(Homework.due_date <= due_until)
    return query.order_by(Homework.due_date.desc()).all()


def get_homework(db: Session, homework_id: UUID) -> Homework:
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw:
        raise NotFoundException("Homework not found")
    return hw


def get_homework_submissions(db: Session, homework_id: UUID) -> list[Submission]:
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw:
        raise NotFoundException("Homework not found")
    return (
        db.query(Submission)
        .filter(Submission.homework_id == homework_id)
        .order_by(Submission.submitted_at.desc())
        .all()
    )


def get_submission(db: Session, submission_id: UUID) -> Submission:
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise NotFoundException("Submission not found")
    return sub


def grade_submission(db: Session, submission_id: UUID, grade, teacher_feedback: str | None, status: str) -> Submission:
    sub = get_submission(db, submission_id)
    if grade is not None:
        sub.grade = grade
    if teacher_feedback is not None:
        sub.teacher_feedback = teacher_feedback
    sub.status = status
    sub.graded_at = datetime.utcnow()
    db.commit()
    db.refresh(sub)
    return sub


def create_submission(db: Session, homework_id: UUID, student_id: UUID, **kwargs) -> Submission:
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw:
        raise NotFoundException("Homework not found")

    status = "submitted"
    if hw.due_date and datetime.utcnow().date() > hw.due_date:
        status = "late"

    submission = Submission(
        homework_id=homework_id,
        student_id=student_id,
        status=status,
        **kwargs,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission
