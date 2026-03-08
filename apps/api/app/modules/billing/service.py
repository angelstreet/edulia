import io
import secrets
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.db.models.billing import SchoolInvoice
from app.db.models.tenant import Tenant
from app.modules.billing.schemas import InvoiceCreate, InvoiceUpdate


def _invoice_number(db: Session, tenant_id: UUID) -> str:
    now = datetime.utcnow()
    suffix = secrets.randbelow(9000) + 1000
    return f"FACT-{now.strftime('%Y%m')}-{suffix}"


def create_invoice(db: Session, tenant_id: UUID, created_by: UUID, data: InvoiceCreate) -> SchoolInvoice:
    subtotal = sum(item.total_cents for item in data.line_items)
    total_due = subtotal + data.previous_balance_cents

    invoice = SchoolInvoice(
        tenant_id=tenant_id,
        created_by=created_by,
        invoice_number=_invoice_number(db, tenant_id),
        student_id=data.student_id,
        student_name=data.student_name,
        student_class=data.student_class,
        parent_name=data.parent_name,
        parent_address=data.parent_address or {},
        academic_year=data.academic_year,
        issue_date=data.issue_date or date.today(),
        line_items=[item.model_dump() for item in data.line_items],
        subtotal_cents=subtotal,
        previous_balance_cents=data.previous_balance_cents,
        total_due_cents=total_due,
        payment_schedule=[e.model_dump() for e in data.payment_schedule],
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        bank_account=data.bank_account,
        contact_info=data.contact_info,
        notes=data.notes,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def list_invoices(
    db: Session,
    tenant_id: UUID,
    student_id: Optional[UUID] = None,
    status: Optional[str] = None,
) -> List[SchoolInvoice]:
    q = db.query(SchoolInvoice).filter(SchoolInvoice.tenant_id == tenant_id)
    if student_id:
        q = q.filter(SchoolInvoice.student_id == student_id)
    if status:
        q = q.filter(SchoolInvoice.status == status)
    return q.order_by(SchoolInvoice.issue_date.desc()).all()


def get_invoice(db: Session, invoice_id: UUID, tenant_id: UUID) -> SchoolInvoice:
    inv = db.query(SchoolInvoice).filter(
        SchoolInvoice.id == invoice_id,
        SchoolInvoice.tenant_id == tenant_id,
    ).first()
    if not inv:
        raise NotFoundException("Invoice not found")
    return inv


def update_invoice(db: Session, invoice_id: UUID, tenant_id: UUID, data: InvoiceUpdate) -> SchoolInvoice:
    inv = get_invoice(db, invoice_id, tenant_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv


def _fmt(cents: int) -> str:
    return f"{cents / 100:,.2f}".replace(",", " ").replace(".", ",")


def _fmt_qty(qty: float) -> str:
    return f"{qty:,.2f}".replace(",", " ").replace(".", ",")


def generate_pdf(invoice: SchoolInvoice, tenant: Tenant) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas
        from reportlab.platypus import Table, TableStyle
    except ImportError:
        return _fallback_pdf(invoice)

    buf = io.BytesIO()
    w, h = A4
    c = canvas.Canvas(buf, pagesize=A4)

    branding = tenant.branding or {}
    settings = tenant.settings or {}

    school_name = tenant.name
    school_address = settings.get("school_address", settings.get("address", ""))
    school_phone = settings.get("school_phone", settings.get("phone", ""))
    school_siret = settings.get("siret", "")
    school_ics = settings.get("ics", "")

    # ── Sender block (top-left) ──────────────────────────────
    c.setFont("Helvetica-Bold", 11)
    c.drawString(2 * cm, h - 3.2 * cm, school_name)
    c.setFont("Helvetica", 9)
    y_school = h - 3.8 * cm
    if school_address:
        for line in school_address.split("\n"):
            if line.strip():
                c.drawString(2 * cm, y_school, line.strip())
                y_school -= 0.45 * cm
    if school_phone:
        c.drawString(2 * cm, y_school, school_phone)
        y_school -= 0.45 * cm
    c.setFont("Helvetica", 8)
    if school_siret:
        c.drawString(2 * cm, y_school, f"SIRET : {school_siret}")
        y_school -= 0.45 * cm
    if school_ics:
        c.drawString(2 * cm, y_school, f"N° ICS : {school_ics}")

    # ── Recipient block (top-right, in border box) ───────────
    box_x, box_y = 12 * cm, h - 6 * cm
    box_w, box_h = 7 * cm, 3.5 * cm
    c.roundRect(box_x, box_y, box_w, box_h, 5, stroke=1, fill=0)
    c.setFont("Helvetica", 9)
    addr = invoice.parent_address or {}
    lines = [
        invoice.parent_name or "",
        addr.get("line1", ""),
        addr.get("line2", ""),
        f"{addr.get('postal_code', '')} {addr.get('city', '')}".strip(),
        addr.get("phone", ""),
    ]
    ty = box_y + box_h - 0.5 * cm
    for line in lines:
        if line.strip():
            c.drawString(box_x + 0.3 * cm, ty, line)
            ty -= 0.45 * cm

    # ── Invoice header bar ───────────────────────────────────
    bar_y = h - 7.5 * cm
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.rect(2 * cm, bar_y, w - 4 * cm, 0.65 * cm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2.3 * cm, bar_y + 0.18 * cm, f"FACTURE N {invoice.invoice_number}")
    c.setFont("Helvetica", 10)
    date_str = invoice.issue_date.strftime("%d/%m/%Y")
    right_text = f"Annee scolaire {invoice.academic_year}  le {date_str}"
    c.drawRightString(w - 2.3 * cm, bar_y + 0.18 * cm, right_text)
    c.setFillColorRGB(0, 0, 0)

    # ── Line items table ─────────────────────────────────────
    table_y = bar_y - 0.8 * cm  # Fixed: was 0.1cm causing overlap with header bar
    col_widths = [9.5 * cm, 2 * cm, 2.5 * cm, 2 * cm, 2.2 * cm]
    headers = ["", "Qte", "Prix Unit.", "Montant", "Total"]

    # student row
    subtotal_str = f"sous-total : {_fmt(invoice.subtotal_cents)} Euros"
    student_label = invoice.student_name
    if invoice.student_class:
        student_label += f"   ({invoice.student_class})"

    table_data = [headers]
    table_data.append([student_label, "", "", subtotal_str, ""])

    for item in (invoice.line_items or []):
        desc = item.get("description", "")
        qty = item.get("qty", 0)
        unit = item.get("unit_price_cents", 0)
        total = item.get("total_cents", 0)
        table_data.append([
            desc,
            _fmt_qty(qty),
            _fmt(abs(unit)),
            _fmt(abs(total)),
            _fmt(abs(total)),
        ])

    # pad to minimum rows for spacing
    while len(table_data) < 16:
        table_data.append(["", "", "", "", ""])

    tbl = Table(table_data, colWidths=col_widths)
    style = TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (1, 0), (-1, 0), "CENTER"),
        # Student row (row 1)
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f0f0f0")),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 8),
        ("SPAN", (3, 1), (4, 1)),
        # Data rows
        ("FONTSIZE", (0, 2), (-1, -1), 8),
        ("ALIGN", (1, 2), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (0, -1), 4),
        # Bottom border on header
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.white),
        # Outer box
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#eeeeee")),
    ])
    tbl.setStyle(style)

    tbl_w = sum(col_widths)
    tbl_x = 2 * cm
    tbl_h = len(table_data) * 0.42 * cm
    tbl.wrapOn(c, tbl_w, tbl_h)
    tbl_bottom = table_y - tbl_h
    tbl.drawOn(c, tbl_x, tbl_bottom)

    # ── Footer: 2 columns ────────────────────────────────────
    footer_y = tbl_bottom - 0.3 * cm
    footer_h = 5 * cm
    footer_top = footer_y - 0.1 * cm

    # Left: payment info text
    left_text_lines = []
    if invoice.bank_account:
        left_text_lines.append(f"Cette facture sera prelevee selon l'echeancier ci-contre")
        left_text_lines.append(f"sur le compte : {invoice.bank_account}")
        left_text_lines.append("")
    if invoice.contact_info:
        for line in invoice.contact_info.split("\n"):
            left_text_lines.append(line)
    if invoice.notes:
        left_text_lines.append("")
        for line in invoice.notes.split("\n"):
            left_text_lines.append(line)

    c.setFont("Helvetica", 7.5)
    ty = footer_top - 0.3 * cm
    for line in left_text_lines[:14]:
        c.drawString(2 * cm, ty, line)
        ty -= 0.38 * cm

    # Right: échéancier + totals
    schedule = invoice.payment_schedule or []
    right_x = 11.5 * cm

    if schedule:
        c.setFont("Helvetica-Bold", 8)
        c.drawString(right_x, footer_top - 0.3 * cm, "Echeancier")
        c.drawRightString(right_x + 3 * cm, footer_top - 0.3 * cm, "€")
        c.setFont("Helvetica", 7.5)
        sy = footer_top - 0.7 * cm
        for entry in schedule:
            dt = entry.get("date", "")
            amt = entry.get("amount_cents", 0)
            c.drawString(right_x, sy, dt)
            c.drawRightString(right_x + 3 * cm, sy, _fmt(amt))
            sy -= 0.35 * cm

    # Totals box (right side)
    totals_x = right_x + 3.3 * cm
    totals_data = [
        ["Total", "€", _fmt(invoice.subtotal_cents)],
        ["Solde anterieur", "€", _fmt(invoice.previous_balance_cents)],
        ["Total a PAYER", "€", _fmt(invoice.total_due_cents)],
    ]
    if invoice.payment_reference:
        totals_data.append([f"Ref : {invoice.payment_reference}", "", ""])

    tot_col_w = [3.2 * cm, 0.5 * cm, 2 * cm]
    tot_tbl = Table(totals_data, colWidths=tot_col_w)
    tot_style = TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("BOX", (0, 0), (-1, -2), 0.5, colors.HexColor("#cccccc")),
        ("INNERGRID", (0, 0), (-1, -2), 0.25, colors.HexColor("#eeeeee")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ])
    tot_tbl.setStyle(tot_style)
    tot_h = len(totals_data) * 0.45 * cm
    tot_tbl.wrapOn(c, sum(tot_col_w), tot_h)
    tot_tbl.drawOn(c, totals_x, footer_top - tot_h - 0.3 * cm)

    # ── Bottom line: payment method ──────────────────────────
    if invoice.payment_method:
        c.setFont("Helvetica", 7.5)
        c.drawString(2 * cm, 1.8 * cm, f"Reglement : {invoice.payment_method}")

    c.setFont("Helvetica", 7.5)
    c.drawRightString(w - 2 * cm, 1.8 * cm, "1/1")

    c.save()
    return buf.getvalue()


def _fallback_pdf(invoice: SchoolInvoice) -> bytes:
    """Plain-text PDF fallback when reportlab not available."""
    lines = [
        f"FACTURE N° {invoice.invoice_number}",
        f"Annee scolaire : {invoice.academic_year}",
        f"Date : {invoice.issue_date}",
        f"Elève : {invoice.student_name}",
        "",
    ]
    for item in (invoice.line_items or []):
        lines.append(f"  {item.get('description','')}  {_fmt(item.get('total_cents',0))} €")
    lines += [
        "",
        f"Sous-total : {_fmt(invoice.subtotal_cents)} €",
        f"Solde anterieur : {_fmt(invoice.previous_balance_cents)} €",
        f"Total a payer : {_fmt(invoice.total_due_cents)} €",
    ]
    content = "\n".join(lines).encode("utf-8")
    # Minimal valid PDF
    body = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
    )
    stream = b"BT /F1 10 Tf 50 800 Td\n"
    for line in lines:
        escaped = line.replace("(", "\\(").replace(")", "\\)").encode("latin-1", errors="replace")
        stream += b"(" + escaped + b") Tj T*\n"
    stream += b"ET"
    body += b"4 0 obj\n<< /Length " + str(len(stream)).encode() + b" >>\nstream\n"
    body += stream + b"\nendstream\nendobj\n"
    body += b"xref\n0 5\n0000000000 65535 f \n"
    body += b"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n9\n%%EOF\n"
    return body


def pay_from_wallet(
    db,
    invoice_id,
    tenant_id,
    user_id,
    amount_cents: int,
):
    """Debit wallet for invoice payment. Auto-approve linked enrollment if threshold met."""
    from app.modules.wallet.service import get_or_create_wallet
    from app.db.models.wallet import WalletTransaction

    inv = get_invoice(db, invoice_id, tenant_id)
    if inv.status in ("paid", "cancelled"):
        raise AppException(400, "Invoice already paid or cancelled")

    wallet = get_or_create_wallet(db, tenant_id, user_id)
    if wallet.balance_cents < amount_cents:
        raise AppException(400, "Insufficient wallet balance")

    # Debit wallet
    wallet.balance_cents -= amount_cents
    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount_cents=-amount_cents,
        type="debit",
        description=f"Invoice payment: {inv.invoice_number}",
        reference_type="school_invoice",
        reference_id=inv.id,
    )
    db.add(tx)

    # Update invoice paid amount
    inv.paid_cents = (inv.paid_cents or 0) + amount_cents
    if inv.paid_cents >= inv.total_due_cents:
        inv.status = "paid"

    # Check enrollment threshold
    if inv.enrollment_request_id:
        from app.db.models.enrollment import EnrollmentRequest
        enroll = db.query(EnrollmentRequest).filter(
            EnrollmentRequest.id == inv.enrollment_request_id
        ).first()
        if enroll and enroll.status == "pending_payment":
            minimum = enroll.payment_minimum_cents or inv.total_due_cents
            if inv.paid_cents >= minimum:
                from app.modules.enrollment.service import _create_student_user
                from app.db.models.group import GroupMembership
                enroll.status = "approved"
                from datetime import datetime
                enroll.reviewed_at = datetime.utcnow()
                student = _create_student_user(db, enroll)
                enroll.student_user_id = student.id
                if enroll.requested_group_id:
                    existing = db.query(GroupMembership).filter(
                        GroupMembership.group_id == enroll.requested_group_id,
                        GroupMembership.user_id == student.id,
                    ).first()
                    if not existing:
                        db.add(GroupMembership(
                            group_id=enroll.requested_group_id,
                            user_id=student.id,
                            role_in_group="member",
                        ))

    db.commit()
    db.refresh(inv)
    return inv
