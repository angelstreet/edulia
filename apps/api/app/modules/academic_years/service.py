from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.db.models.tenant import AcademicYear, Term


def create_academic_year(db: Session, tenant_id: UUID, **kwargs) -> AcademicYear:
    ay = AcademicYear(tenant_id=tenant_id, **kwargs)
    db.add(ay)
    db.commit()
    db.refresh(ay)
    return ay


def list_academic_years(db: Session, tenant_id: UUID) -> list[AcademicYear]:
    return (
        db.query(AcademicYear)
        .options(joinedload(AcademicYear.terms))
        .filter(AcademicYear.tenant_id == tenant_id)
        .order_by(AcademicYear.start_date.desc())
        .all()
    )


def update_academic_year(db: Session, year_id: UUID, **kwargs) -> AcademicYear:
    ay = db.query(AcademicYear).options(joinedload(AcademicYear.terms)).filter(AcademicYear.id == year_id).first()
    if not ay:
        raise NotFoundException("Academic year not found")
    for key, value in kwargs.items():
        if value is not None:
            setattr(ay, key, value)
    db.commit()
    db.refresh(ay)
    return ay


def delete_academic_year(db: Session, year_id: UUID) -> None:
    ay = db.query(AcademicYear).filter(AcademicYear.id == year_id).first()
    if not ay:
        raise NotFoundException("Academic year not found")
    db.delete(ay)
    db.commit()


def create_term(db: Session, year_id: UUID, **kwargs) -> Term:
    ay = db.query(AcademicYear).filter(AcademicYear.id == year_id).first()
    if not ay:
        raise NotFoundException("Academic year not found")
    term = Term(academic_year_id=year_id, **kwargs)
    db.add(term)
    db.commit()
    db.refresh(term)
    return term
