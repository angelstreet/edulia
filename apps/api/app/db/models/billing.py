import uuid
import secrets
from datetime import datetime, date

from sqlalchemy import Column, Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base, TenantMixin


class SchoolInvoice(Base, TenantMixin):
    __tablename__ = "school_invoices"

    invoice_number = Column(String(50), nullable=False)          # FACT-202509-0626
    created_by = Column(UUID(as_uuid=True), nullable=False)      # admin or tutor user_id

    # Snapshot of student/parent at invoice time (frozen for PDF)
    student_id = Column(UUID(as_uuid=True), nullable=False)
    student_name = Column(String(200), nullable=False)
    student_class = Column(String(100), nullable=True)           # "PS/MS/GS P, Externe libre"
    parent_name = Column(String(200), nullable=True)
    parent_address = Column(JSONB, default=dict)                 # {line1, line2, city, postal_code}

    academic_year = Column(String(20), nullable=False)           # "2025-2026"
    issue_date = Column(Date, nullable=False, default=date.today)
    status = Column(String(20), default="draft")                 # draft|sent|paid|cancelled

    # Line items: [{description, qty, unit_price_cents, total_cents}]
    # qty and unit_price_cents can be negative for discounts
    line_items = Column(JSONB, default=list)

    subtotal_cents = Column(Integer, nullable=False, default=0)
    previous_balance_cents = Column(Integer, nullable=False, default=0)   # negative = credit
    total_due_cents = Column(Integer, nullable=False, default=0)

    # Payment schedule: [{date: "2025-10-15", amount_cents: 5900}]
    payment_schedule = Column(JSONB, default=list)
    payment_method = Column(String(100), nullable=True)     # "Prélèvement", "Virement", etc.
    payment_reference = Column(String(100), nullable=True)  # "4111LACOUTURE"
    bank_account = Column(String(50), nullable=True)        # IBAN shown on invoice

    contact_info = Column(Text, nullable=True)              # free text footer note
    notes = Column(Text, nullable=True)
    paid_cents = Column(Integer, nullable=False, default=0)
    enrollment_request_id = Column(UUID(as_uuid=True), nullable=True)

