from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.forms.schemas import (
    FormCreate,
    FormDetailResponse,
    FormResponse,
    FormResponseRecord,
    FormStats,
    FormSubmit,
    FormUpdate,
)
from app.modules.forms.service import (
    create_form,
    get_form,
    get_responses,
    get_stats,
    list_forms,
    submit_response,
    update_form,
)

router = APIRouter(prefix="/api/v1/forms", tags=["forms"])


@router.post("", response_model=FormDetailResponse, status_code=201)
def create(
    request: FormCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_form(
        db, current_user.tenant_id, current_user.id,
        title=request.title,
        description=request.description,
        type=request.type,
        target_roles=request.target_roles,
        deadline=request.deadline,
        fields=[f.model_dump() for f in request.fields],
    )


@router.get("", response_model=list[FormResponse])
def list_all(
    status: str | None = Query(None),
    target_role: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_forms(db, current_user.tenant_id, status=status, target_role=target_role)


@router.get("/{form_id}", response_model=FormDetailResponse)
def detail(
    form_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_form(db, form_id)


@router.patch("/{form_id}", response_model=FormDetailResponse)
def update(
    form_id: UUID,
    request: FormUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_form(db, form_id, **request.model_dump(exclude_unset=True))
    return get_form(db, form_id)


@router.post("/{form_id}/responses", response_model=FormResponseRecord, status_code=201)
def submit(
    form_id: UUID,
    request: FormSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return submit_response(db, form_id, current_user.id, request.data)


@router.get("/{form_id}/responses", response_model=list[FormResponseRecord])
def responses(
    form_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_responses(db, form_id)


@router.get("/{form_id}/stats", response_model=list[FormStats])
def stats(
    form_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_stats(db, form_id)
