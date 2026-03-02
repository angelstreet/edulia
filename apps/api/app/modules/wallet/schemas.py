from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class WalletResponse(BaseModel):
    id: UUID
    user_id: UUID
    balance_cents: int
    currency: str
    last_topped_up: datetime | None
    recent_transactions: list[Any] = []

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: UUID
    wallet_id: UUID
    amount_cents: int
    type: str
    description: str | None
    reference_type: str | None
    reference_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TopupRequest(BaseModel):
    amount_cents: int
    description: str = "Top-up"


class DebitRequest(BaseModel):
    amount_cents: int
    description: str
    reference_type: str | None = None
    reference_id: UUID | None = None


class ServiceCreate(BaseModel):
    name: str
    category: str
    unit_price_cents: int
    billing_period: str


class ServiceResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    category: str
    unit_price_cents: int
    billing_period: str
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscribeRequest(BaseModel):
    student_id: UUID
    start_date: datetime | None = None
    days_of_week: list[int] = []


class SubscriptionResponse(BaseModel):
    id: UUID
    student_id: UUID
    service_id: UUID
    start_date: datetime
    end_date: datetime | None
    days_of_week: list[Any]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
