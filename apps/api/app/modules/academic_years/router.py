from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.academic_years.schemas import (
    AcademicYearCreate,
    AcademicYearResponse,
    AcademicYearUpdate,
    TermCreate,
    TermResponse,
)
from app.modules.academic_years.service import (
    create_academic_year,
    create_term,
    delete_academic_year,
    list_academic_years,
    update_academic_year,
)

router = APIRouter(prefix="/api/v1/academic-years", tags=["academic-years"])


@router.post("", response_model=AcademicYearResponse, status_code=201)
def create_year(
    request: AcademicYearCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_academic_year(db, current_user.tenant_id, **request.model_dump())


@router.get("", response_model=list[AcademicYearResponse])
def list_years(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_academic_years(db, current_user.tenant_id)


@router.patch("/{year_id}", response_model=AcademicYearResponse)
def update_year(
    year_id: UUID,
    request: AcademicYearUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_academic_year(db, year_id, **request.model_dump(exclude_unset=True))


@router.delete("/{year_id}", status_code=204)
def delete_year(
    year_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_academic_year(db, year_id)


@router.post("/{year_id}/terms", response_model=TermResponse, status_code=201)
def add_term(
    year_id: UUID,
    request: TermCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_term(db, year_id, **request.model_dump())
