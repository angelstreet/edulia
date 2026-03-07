from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException
from app.db.database import get_db
from app.db.models.user import User
from app.modules.tutoring.schemas import (
    InvoiceCreate,
    InvoiceResponse,
    PackageCreate,
    PackageResponse,
    SessionCreate,
    SessionResponse,
    SessionUpdate,
)
from app.modules.tutoring.service import (
    create_package,
    create_session,
    generate_invoice,
    generate_invoice_pdf,
    get_invoice,
    list_invoices,
    list_my_students,
    list_packages,
    list_sessions,
    update_session,
)

router = APIRouter(prefix="/api/v1/tutoring", tags=["tutoring"])


def _get_role(user: User) -> str:
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            return ur.role.code
    return "student"


def _require_tutor_or_admin(user: User) -> str:
    role = _get_role(user)
    if role not in ("tutor", "admin"):
        raise ForbiddenException("Only tutors or admins can access this endpoint")
    return role


@router.get("/my-students")
def get_my_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tutor sees their students list with session counts and last session date."""
    _require_tutor_or_admin(current_user)
    return list_my_students(db, tutor_id=current_user.id, tenant_id=current_user.tenant_id)


@router.post("/sessions", response_model=SessionResponse, status_code=201)
def log_session(
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a tutoring session."""
    _require_tutor_or_admin(current_user)
    return create_session(db, tenant_id=current_user.tenant_id, **body.model_dump())


@router.get("/sessions", response_model=List[SessionResponse])
def get_sessions(
    student_id: Optional[UUID] = Query(None),
    tutor_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List sessions. Tutors see their own; admins can filter freely."""
    role = _require_tutor_or_admin(current_user)
    # Tutors are scoped to their own sessions unless admin
    effective_tutor_id = tutor_id if role == "admin" else current_user.id
    return list_sessions(
        db,
        tenant_id=current_user.tenant_id,
        tutor_id=effective_tutor_id,
        student_id=student_id,
    )


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
def patch_session(
    session_id: UUID,
    body: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update session notes/status."""
    _require_tutor_or_admin(current_user)
    return update_session(
        db,
        session_id=session_id,
        tenant_id=current_user.tenant_id,
        **{k: v for k, v in body.model_dump().items() if v is not None},
    )


@router.post("/packages", response_model=PackageResponse, status_code=201)
def create_tutoring_package(
    body: PackageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a tutoring package."""
    _require_tutor_or_admin(current_user)
    return create_package(db, tenant_id=current_user.tenant_id, **body.model_dump())


@router.get("/packages", response_model=List[PackageResponse])
def get_packages(
    student_id: Optional[UUID] = Query(None),
    tutor_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List packages."""
    role = _require_tutor_or_admin(current_user)
    effective_tutor_id = tutor_id if role == "admin" else current_user.id
    return list_packages(
        db,
        tenant_id=current_user.tenant_id,
        tutor_id=effective_tutor_id,
        student_id=student_id,
    )


@router.post("/invoices/generate", response_model=InvoiceResponse, status_code=201)
def generate_tutoring_invoice(
    body: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an invoice from uninvoiced completed sessions for a student."""
    _require_tutor_or_admin(current_user)
    return generate_invoice(
        db,
        tenant_id=current_user.tenant_id,
        tutor_id=current_user.id,
        student_id=body.student_id,
        period_label=body.period_label,
        notes=body.notes,
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
def get_invoices(
    student_id: Optional[UUID] = Query(None),
    tutor_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List invoices."""
    role = _require_tutor_or_admin(current_user)
    effective_tutor_id = tutor_id if role == "admin" else current_user.id
    return list_invoices(
        db,
        tenant_id=current_user.tenant_id,
        tutor_id=effective_tutor_id,
        student_id=student_id,
    )


@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a PDF for an invoice."""
    _require_tutor_or_admin(current_user)
    invoice = get_invoice(db, invoice_id, current_user.tenant_id)
    pdf_bytes = generate_invoice_pdf(invoice)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{invoice.invoice_number}.pdf"},
    )
