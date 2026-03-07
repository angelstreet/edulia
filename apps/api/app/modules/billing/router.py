from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.modules.billing.schemas import InvoiceCreate, InvoiceResponse, InvoiceUpdate
from app.modules.billing.service import (
    create_invoice,
    generate_pdf,
    get_invoice,
    list_invoices,
    update_invoice,
    pay_from_wallet,
)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


def _can_manage(user: User) -> bool:
    roles = {ur.role.code for ur in user.user_roles if ur.role}
    return bool(roles & {"admin", "teacher", "tutor"})


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
def create(
    body: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _can_manage(current_user):
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Only admin/teacher/tutor can create invoices")
    return create_invoice(db, current_user.tenant_id, current_user.id, body)


@router.get("/invoices", response_model=List[InvoiceResponse])
def list_all(
    student_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roles = {ur.role.name for ur in current_user.user_roles if ur.role}
    # Parents only see invoices for their children
    if "parent" in roles and not (_can_manage(current_user) or "admin" in roles):
        from app.db.models.user import Relationship
        child_ids = db.query(Relationship.to_user_id).filter(
            Relationship.from_user_id == current_user.id,
            Relationship.tenant_id == current_user.tenant_id,
        ).all()
        child_ids = [r[0] for r in child_ids]
        if student_id and student_id not in child_ids:
            return []
        # Return all children invoices if no specific student requested
        results = []
        for cid in child_ids:
            results.extend(list_invoices(db, current_user.tenant_id, student_id=cid, status=status))
        return results
    return list_invoices(db, current_user.tenant_id, student_id=student_id, status=status)


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_one(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_invoice(db, invoice_id, current_user.tenant_id)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
def update(
    invoice_id: UUID,
    body: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _can_manage(current_user):
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Only admin/teacher/tutor can update invoices")
    return update_invoice(db, invoice_id, current_user.tenant_id, body)


@router.get("/invoices/{invoice_id}/pdf")
def download_pdf(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = get_invoice(db, invoice_id, current_user.tenant_id)
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    pdf_bytes = generate_pdf(inv, tenant)
    filename = f"facture-{inv.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


class PayFromWalletRequest(BaseModel):
    amount_cents: int


@router.post("/invoices/{invoice_id}/pay-from-wallet", response_model=InvoiceResponse)
def pay_invoice_from_wallet(
    invoice_id: UUID,
    body: PayFromWalletRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return pay_from_wallet(db, invoice_id, current_user.tenant_id, current_user.id, body.amount_cents)
