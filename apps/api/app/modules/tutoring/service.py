import secrets
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.db.models.tutoring import TutoringInvoice, TutoringPackage, TutoringSession


def list_my_students(db: Session, tutor_id: UUID, tenant_id: UUID):
    """Return distinct students the tutor has sessions with, with last session date and count."""
    rows = (
        db.query(
            TutoringSession.student_id,
            func.count(TutoringSession.id).label("session_count"),
            func.max(TutoringSession.session_date).label("last_session"),
        )
        .filter(TutoringSession.tutor_id == tutor_id, TutoringSession.tenant_id == tenant_id)
        .group_by(TutoringSession.student_id)
        .all()
    )
    return [
        {
            "student_id": str(r.student_id),
            "session_count": r.session_count,
            "last_session": r.last_session,
        }
        for r in rows
    ]


def create_session(db: Session, tenant_id: UUID, **kwargs) -> TutoringSession:
    session = TutoringSession(tenant_id=tenant_id, **kwargs)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def list_sessions(
    db: Session,
    tenant_id: UUID,
    tutor_id: Optional[UUID] = None,
    student_id: Optional[UUID] = None,
) -> list:
    q = db.query(TutoringSession).filter(TutoringSession.tenant_id == tenant_id)
    if tutor_id:
        q = q.filter(TutoringSession.tutor_id == tutor_id)
    if student_id:
        q = q.filter(TutoringSession.student_id == student_id)
    return q.order_by(TutoringSession.session_date.desc()).all()


def get_session(db: Session, session_id: UUID, tenant_id: UUID) -> TutoringSession:
    obj = db.query(TutoringSession).filter(
        TutoringSession.id == session_id,
        TutoringSession.tenant_id == tenant_id,
    ).first()
    if not obj:
        raise NotFoundException("Tutoring session not found")
    return obj


def update_session(db: Session, session_id: UUID, tenant_id: UUID, **kwargs) -> TutoringSession:
    obj = get_session(db, session_id, tenant_id)
    for key, value in kwargs.items():
        if value is not None:
            setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def create_package(db: Session, tenant_id: UUID, **kwargs) -> TutoringPackage:
    pkg = TutoringPackage(tenant_id=tenant_id, **kwargs)
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg


def list_packages(
    db: Session,
    tenant_id: UUID,
    tutor_id: Optional[UUID] = None,
    student_id: Optional[UUID] = None,
) -> list:
    q = db.query(TutoringPackage).filter(TutoringPackage.tenant_id == tenant_id)
    if tutor_id:
        q = q.filter(TutoringPackage.tutor_id == tutor_id)
    if student_id:
        q = q.filter(TutoringPackage.student_id == student_id)
    return q.order_by(TutoringPackage.created_at.desc()).all()


def generate_invoice(
    db: Session,
    tenant_id: UUID,
    tutor_id: UUID,
    student_id: UUID,
    period_label: Optional[str] = None,
    notes: Optional[str] = None,
) -> TutoringInvoice:
    """
    Auto-generate invoice from uninvoiced completed sessions.
    Creates TutoringInvoice with line items. Marks sessions as invoiced=True.
    Invoice number: INV-{year}{month}-{random 4 digits}
    """
    sessions = (
        db.query(TutoringSession)
        .filter(
            TutoringSession.tutor_id == tutor_id,
            TutoringSession.student_id == student_id,
            TutoringSession.tenant_id == tenant_id,
            TutoringSession.invoiced == False,  # noqa: E712
            TutoringSession.status == "completed",
        )
        .order_by(TutoringSession.session_date)
        .all()
    )
    if not sessions:
        raise AppException(400, "No uninvoiced sessions found for this student")

    line_items = []
    total = 0
    for s in sessions:
        amount = s.rate_cents * (s.duration_minutes / 60)
        line_items.append(
            {
                "description": f"Session {s.session_date.strftime('%d/%m/%Y')} ({s.duration_minutes} min)",
                "qty": 1,
                "unit_price_cents": s.rate_cents,
                "duration_minutes": s.duration_minutes,
                "total_cents": round(amount),
            }
        )
        total += round(amount)

    now = datetime.utcnow()
    invoice_number = f"INV-{now.strftime('%Y%m')}-{secrets.randbelow(9000) + 1000}"
    invoice = TutoringInvoice(
        tenant_id=tenant_id,
        tutor_id=tutor_id,
        student_id=student_id,
        invoice_number=invoice_number,
        period_label=period_label or now.strftime("%B %Y"),
        line_items=line_items,
        total_cents=total,
        notes=notes,
    )
    db.add(invoice)
    for s in sessions:
        s.invoiced = True
    db.commit()
    db.refresh(invoice)
    return invoice


def list_invoices(
    db: Session,
    tenant_id: UUID,
    tutor_id: Optional[UUID] = None,
    student_id: Optional[UUID] = None,
) -> list:
    q = db.query(TutoringInvoice).filter(TutoringInvoice.tenant_id == tenant_id)
    if tutor_id:
        q = q.filter(TutoringInvoice.tutor_id == tutor_id)
    if student_id:
        q = q.filter(TutoringInvoice.student_id == student_id)
    return q.order_by(TutoringInvoice.created_at.desc()).all()


def get_invoice(db: Session, invoice_id: UUID, tenant_id: UUID) -> TutoringInvoice:
    obj = db.query(TutoringInvoice).filter(
        TutoringInvoice.id == invoice_id,
        TutoringInvoice.tenant_id == tenant_id,
    ).first()
    if not obj:
        raise NotFoundException("Tutoring invoice not found")
    return obj


def generate_invoice_pdf(invoice: TutoringInvoice) -> bytes:
    """Generate a simple PDF invoice using reportlab or fpdf2."""
    try:
        import io

        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        # Header
        c.setFont("Helvetica-Bold", 18)
        c.drawString(2 * cm, h - 2 * cm, "INVOICE")
        c.setFont("Helvetica", 11)
        c.drawString(2 * cm, h - 3 * cm, f"Invoice #: {invoice.invoice_number}")
        c.drawString(2 * cm, h - 3.6 * cm, f"Period: {invoice.period_label or ''}")

        # Line items
        y = h - 5 * cm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(2 * cm, y, "Description")
        c.drawString(14 * cm, y, "Amount")
        y -= 0.6 * cm
        c.line(2 * cm, y, w - 2 * cm, y)
        y -= 0.4 * cm

        c.setFont("Helvetica", 10)
        for item in invoice.line_items or []:
            c.drawString(2 * cm, y, item.get("description", ""))
            total_eur = item.get("total_cents", 0) / 100
            c.drawString(14 * cm, y, f"{total_eur:.2f} €")
            y -= 0.6 * cm

        y -= 0.4 * cm
        c.line(2 * cm, y, w - 2 * cm, y)
        y -= 0.6 * cm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(2 * cm, y, "Total")
        c.drawString(14 * cm, y, f"{invoice.total_cents / 100:.2f} €")

        if invoice.notes:
            y -= 1.5 * cm
            c.setFont("Helvetica", 9)
            c.drawString(2 * cm, y, f"Notes: {invoice.notes}")

        c.save()
        buf.seek(0)
        return buf.read()
    except ImportError:
        # reportlab not installed — return minimal text-based PDF placeholder
        content = f"Invoice {invoice.invoice_number}\nTotal: {invoice.total_cents / 100:.2f} EUR\n"
        return content.encode()
