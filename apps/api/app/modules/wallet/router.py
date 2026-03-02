from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.wallet.schemas import (
    DebitRequest,
    ServiceCreate,
    ServiceResponse,
    SubscribeRequest,
    SubscriptionResponse,
    TopupRequest,
    TransactionResponse,
    WalletResponse,
)
from app.modules.wallet.service import (
    create_service,
    debit,
    get_transactions,
    get_wallet,
    list_services,
    subscribe,
    topup,
)
from uuid import UUID

router = APIRouter(tags=["wallet"])


@router.get("/api/v1/wallet", response_model=WalletResponse)
def my_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_wallet(db, current_user.tenant_id, current_user.id)


@router.post("/api/v1/wallet/topup", response_model=TransactionResponse, status_code=201)
def wallet_topup(
    request: TopupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return topup(db, current_user.tenant_id, current_user.id, request.amount_cents, request.description)


@router.get("/api/v1/wallet/transactions", response_model=list[TransactionResponse])
def wallet_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_transactions(db, current_user.tenant_id, current_user.id, page, page_size)


@router.post("/api/v1/wallet/debit", response_model=TransactionResponse, status_code=201)
def wallet_debit(
    request: DebitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return debit(
        db, current_user.tenant_id, current_user.id,
        request.amount_cents, request.description,
        request.reference_type, request.reference_id,
    )


@router.get("/api/v1/services", response_model=list[ServiceResponse])
def list_all_services(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_services(db, current_user.tenant_id)


@router.post("/api/v1/services", response_model=ServiceResponse, status_code=201)
def create_svc(
    request: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_service(
        db, current_user.tenant_id,
        name=request.name,
        category=request.category,
        unit_price_cents=request.unit_price_cents,
        billing_period=request.billing_period,
    )


@router.post("/api/v1/services/{service_id}/subscribe", response_model=SubscriptionResponse, status_code=201)
def subscribe_service(
    service_id: UUID,
    request: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return subscribe(
        db, current_user.tenant_id, service_id,
        student_id=request.student_id,
        days_of_week=request.days_of_week,
        start_date=request.start_date,
    )
