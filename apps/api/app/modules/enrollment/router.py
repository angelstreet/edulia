from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException
from app.db.database import get_db
from app.db.models.user import User
from app.modules.enrollment.schemas import EnrollmentCreate, EnrollmentResponse, EnrollmentReview
from app.modules.enrollment.service import create_request, get_request, list_requests, review_request

router = APIRouter(prefix="/api/v1/enrollment", tags=["enrollment"])


def _get_role(user: User) -> str:
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            return ur.role.code
    return "student"


@router.post("", response_model=EnrollmentResponse, status_code=201)
def submit_enrollment(
    request: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Any authenticated user (parent) can submit an enrollment request."""
    req = create_request(
        db,
        tenant_id=current_user.tenant_id,
        submitted_by=current_user.id,
        **request.model_dump(),
    )
    # Notify admins (best effort)
    try:
        from app.modules.notifications.engine import dispatch_notification
        from app.db.models.user import UserRole
        admins = db.query(UserRole).join(UserRole.role).filter(
            UserRole.tenant_id == current_user.tenant_id,
            UserRole.revoked_at.is_(None),
        ).all()
        for admin_role in admins:
            if admin_role.role and admin_role.role.code == "admin":
                dispatch_notification(
                    db, current_user.tenant_id, admin_role.user_id,
                    type="action",
                    title=f"New enrollment request: {req.child_first_name} {req.child_last_name}",
                    body=f"From {req.parent_first_name} {req.parent_last_name}",
                    link="/admin/enrollment",
                )
    except Exception:
        pass
    return req


@router.get("", response_model=list[EnrollmentResponse])
def list_enrollment_requests(
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin only: list all enrollment requests, optionally filtered by status."""
    role = _get_role(current_user)
    if role != "admin":
        raise ForbiddenException("Only admins can view enrollment requests")
    return list_requests(db, current_user.tenant_id, status)


@router.get("/my", response_model=list[EnrollmentResponse])
def my_enrollment_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parent: view their own submitted enrollment requests."""
    from app.db.models.enrollment import EnrollmentRequest
    return (
        db.query(EnrollmentRequest)
        .filter(
            EnrollmentRequest.tenant_id == current_user.tenant_id,
            EnrollmentRequest.submitted_by == current_user.id,
        )
        .order_by(EnrollmentRequest.created_at.desc())
        .all()
    )


@router.get("/{request_id}", response_model=EnrollmentResponse)
def get_enrollment_request(
    request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: get a single enrollment request."""
    role = _get_role(current_user)
    if role != "admin":
        raise ForbiddenException("Only admins can view enrollment requests")
    return get_request(db, request_id, current_user.tenant_id)


@router.patch("/{request_id}/review", response_model=EnrollmentResponse)
def review_enrollment(
    request_id: UUID,
    body: EnrollmentReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin: update status (reviewing | approved | rejected) and add notes."""
    role = _get_role(current_user)
    if role != "admin":
        raise ForbiddenException("Only admins can review enrollment requests")
    req = review_request(
        db,
        request_id=request_id,
        tenant_id=current_user.tenant_id,
        reviewer_id=current_user.id,
        status=body.status,
        admin_notes=body.admin_notes,
        invoice_id=body.invoice_id,
        payment_minimum_cents=body.payment_minimum_cents,
    )
    # Notify parent (best effort)
    try:
        from app.modules.notifications.engine import dispatch_notification
        if req.submitted_by:
            status_label = {"reviewing": "under review", "approved": "approved!", "rejected": "rejected"}.get(body.status, body.status)
            dispatch_notification(
                db, current_user.tenant_id, req.submitted_by,
                type="info",
                title=f"Enrollment request {status_label}",
                body=body.admin_notes or f"Your request for {req.child_first_name} has been {body.status}.",
                link="/enrollment/my",
            )
    except Exception:
        pass
    return req
