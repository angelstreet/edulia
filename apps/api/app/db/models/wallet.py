import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TenantMixin


class Wallet(Base, TenantMixin):
    __tablename__ = "wallets"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    balance_cents = Column(Integer, default=0, nullable=False)
    currency = Column(String(10), default="EUR", nullable=False)
    last_topped_up = Column(DateTime, nullable=True)

    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False)
    amount_cents = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)  # topup|debit|refund
    description = Column(String(500), nullable=True)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    wallet = relationship("Wallet", back_populates="transactions")


class ServiceCatalog(Base, TenantMixin):
    __tablename__ = "service_catalog"

    name = Column(String(255), nullable=False)
    category = Column(String(30), nullable=False)  # cantine|garderie|etude|sortie|other
    unit_price_cents = Column(Integer, nullable=False)
    billing_period = Column(String(20), nullable=False)  # daily|weekly|monthly|per_event
    active = Column(Boolean, default=True, nullable=False)

    subscriptions = relationship("ServiceSubscription", back_populates="service", cascade="all, delete-orphan")


class ServiceSubscription(Base, TenantMixin):
    __tablename__ = "service_subscriptions"

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey("service_catalog.id"), nullable=False)
    start_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    days_of_week = Column(JSONB, default=list)
    status = Column(String(20), default="active")  # active|paused|cancelled

    service = relationship("ServiceCatalog", back_populates="subscriptions")
