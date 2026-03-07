from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.db.models.wallet import ServiceCatalog, ServiceSubscription, Wallet, WalletTransaction


def get_or_create_wallet(db: Session, tenant_id: UUID, user_id: UUID) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(tenant_id=tenant_id, user_id=user_id, balance_cents=0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def get_wallet(db: Session, tenant_id: UUID, user_id: UUID) -> dict:
    wallet = get_or_create_wallet(db, tenant_id, user_id)
    recent = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "id": wallet.id,
        "user_id": wallet.user_id,
        "balance_cents": wallet.balance_cents,
        "currency": wallet.currency,
        "last_topped_up": wallet.last_topped_up,
        "recent_transactions": [_tx_to_dict(t) for t in recent],
    }


def topup(db: Session, tenant_id: UUID, user_id: UUID, amount_cents: int, description: str = "Top-up") -> WalletTransaction:
    if amount_cents <= 0:
        raise AppException(400, "Amount must be positive")
    wallet = get_or_create_wallet(db, tenant_id, user_id)
    wallet.balance_cents += amount_cents
    wallet.last_topped_up = datetime.utcnow()
    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount_cents=amount_cents,
        type="topup",
        description=description,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def debit(
    db: Session, tenant_id: UUID, user_id: UUID,
    amount_cents: int, description: str,
    reference_type: str | None = None, reference_id: UUID | None = None,
) -> WalletTransaction:
    if amount_cents <= 0:
        raise AppException(400, "Amount must be positive")
    wallet = get_or_create_wallet(db, tenant_id, user_id)
    if wallet.balance_cents < amount_cents:
        raise AppException(400, "Insufficient balance")
    wallet.balance_cents -= amount_cents
    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount_cents=-amount_cents,
        type="debit",
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def get_transactions(db: Session, tenant_id: UUID, user_id: UUID, page: int = 1, page_size: int = 20) -> list[dict]:
    wallet = get_or_create_wallet(db, tenant_id, user_id)
    txs = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_tx_to_dict(t) for t in txs]


def list_services(db: Session, tenant_id: UUID, active_only: bool = True) -> list[ServiceCatalog]:
    query = db.query(ServiceCatalog).filter(ServiceCatalog.tenant_id == tenant_id)
    if active_only:
        query = query.filter(ServiceCatalog.active.is_(True))
    return query.order_by(ServiceCatalog.name).all()


def create_service(
    db: Session, tenant_id: UUID,
    name: str, category: str, unit_price_cents: int, billing_period: str,
) -> ServiceCatalog:
    service = ServiceCatalog(
        tenant_id=tenant_id,
        name=name,
        category=category,
        unit_price_cents=unit_price_cents,
        billing_period=billing_period,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def subscribe(
    db: Session, tenant_id: UUID, service_id: UUID,
    student_id: UUID, days_of_week: list[int] | None = None,
    start_date: datetime | None = None,
) -> ServiceSubscription:
    service = db.query(ServiceCatalog).filter(ServiceCatalog.id == service_id).first()
    if not service:
        raise NotFoundException("Service not found")
    sub = ServiceSubscription(
        tenant_id=tenant_id,
        student_id=student_id,
        service_id=service_id,
        start_date=start_date or datetime.utcnow(),
        days_of_week=days_of_week or [],
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def list_subscriptions(db: Session, tenant_id: UUID, student_id: UUID | None = None) -> list[ServiceSubscription]:
    query = (
        db.query(ServiceSubscription)
        .filter(ServiceSubscription.tenant_id == tenant_id, ServiceSubscription.status == "active")
    )
    if student_id:
        query = query.filter(ServiceSubscription.student_id == student_id)
    return query.order_by(ServiceSubscription.start_date.desc()).all()


def cancel_subscription(db: Session, subscription_id: UUID, tenant_id: UUID) -> ServiceSubscription:
    sub = (
        db.query(ServiceSubscription)
        .filter(ServiceSubscription.id == subscription_id, ServiceSubscription.tenant_id == tenant_id)
        .first()
    )
    if not sub:
        raise NotFoundException("Subscription not found")
    sub.status = "cancelled"
    sub.end_date = datetime.utcnow()
    db.commit()
    db.refresh(sub)
    return sub


def _tx_to_dict(tx: WalletTransaction) -> dict:
    return {
        "id": tx.id,
        "wallet_id": tx.wallet_id,
        "amount_cents": tx.amount_cents,
        "type": tx.type,
        "description": tx.description,
        "reference_type": tx.reference_type,
        "reference_id": tx.reference_id,
        "created_at": tx.created_at,
    }
