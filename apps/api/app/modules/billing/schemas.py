from datetime import date
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class LineItem(BaseModel):
    description: str
    qty: float              # can be negative for discounts
    unit_price_cents: int   # can be negative for discounts
    total_cents: int


class PaymentScheduleEntry(BaseModel):
    date: str               # "2025-10-15"
    amount_cents: int


class InvoiceCreate(BaseModel):
    student_id: UUID
    student_name: str
    student_class: Optional[str] = None
    parent_name: Optional[str] = None
    parent_address: Optional[dict] = None
    academic_year: str                          # "2025-2026"
    issue_date: Optional[date] = None
    line_items: List[LineItem]
    previous_balance_cents: int = 0
    payment_schedule: List[PaymentScheduleEntry] = []
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    bank_account: Optional[str] = None
    contact_info: Optional[str] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    invoice_number: str
    created_by: UUID
    student_id: UUID
    student_name: str
    student_class: Optional[str]
    parent_name: Optional[str]
    parent_address: Optional[dict]
    academic_year: str
    issue_date: date
    status: str
    line_items: list
    subtotal_cents: int
    previous_balance_cents: int
    total_due_cents: int
    payment_schedule: list
    payment_method: Optional[str]
    payment_reference: Optional[str]
    bank_account: Optional[str]
    contact_info: Optional[str]
    notes: Optional[str]

    model_config = {"from_attributes": True}
