import secrets
import string
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.db.models.enrollment import EnrollmentRequest
from app.db.models.group import GroupMembership
from app.db.models.user import User, UserRole, Role


def list_requests(db: Session, tenant_id: UUID, status: str | None = None) -> list[EnrollmentRequest]:
    q = db.query(EnrollmentRequest).filter(EnrollmentRequest.tenant_id == tenant_id)
    if status:
        q = q.filter(EnrollmentRequest.status == status)
    return q.order_by(EnrollmentRequest.created_at.desc()).all()


def get_request(db: Session, request_id: UUID, tenant_id: UUID) -> EnrollmentRequest:
    req = db.query(EnrollmentRequest).filter(
        EnrollmentRequest.id == request_id,
        EnrollmentRequest.tenant_id == tenant_id,
    ).first()
    if not req:
        raise NotFoundException("Enrollment request not found")
    return req


def create_request(db: Session, tenant_id: UUID, submitted_by: UUID | None = None, **kwargs) -> EnrollmentRequest:
    req = EnrollmentRequest(
        tenant_id=tenant_id,
        submitted_by=submitted_by,
        **kwargs,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def review_request(
    db: Session,
    request_id: UUID,
    tenant_id: UUID,
    reviewer_id: UUID,
    status: str,
    admin_notes: str | None = None,
) -> EnrollmentRequest:
    valid_statuses = ("reviewing", "approved", "rejected")
    if status not in valid_statuses:
        raise AppException(400, f"Invalid status. Must be one of: {valid_statuses}")

    req = get_request(db, request_id, tenant_id)
    if req.status == "approved":
        raise AppException(400, "Already approved")

    req.status = status
    req.admin_notes = admin_notes
    req.reviewed_by = reviewer_id
    req.reviewed_at = datetime.utcnow()

    if status == "approved":
        # Auto-create student user
        student = _create_student_user(db, req)
        req.student_user_id = student.id

        # Auto-add to requested group
        if req.requested_group_id:
            existing = db.query(GroupMembership).filter(
                GroupMembership.group_id == req.requested_group_id,
                GroupMembership.user_id == student.id,
            ).first()
            if not existing:
                membership = GroupMembership(
                    group_id=req.requested_group_id,
                    user_id=student.id,
                    role_in_group="member",
                )
                db.add(membership)

    db.commit()
    db.refresh(req)
    return req


def _generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _create_student_user(db: Session, req: EnrollmentRequest) -> User:
    """Create a student User from an approved enrollment request."""
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    temp_password = _generate_password()
    student = User(
        tenant_id=req.tenant_id,
        email=req.parent_email,  # Use parent email; parent can update later
        password_hash=pwd_ctx.hash(temp_password),
        first_name=req.child_first_name,
        last_name=req.child_last_name,
        display_name=f"{req.child_first_name} {req.child_last_name}",
        date_of_birth=req.child_date_of_birth,
        gender=req.child_gender,
        status="active",
    )
    db.add(student)
    db.flush()  # get student.id before role assignment

    # Assign student role
    student_role = db.query(Role).filter(
        Role.code == "student",
        Role.tenant_id == req.tenant_id,
    ).first()
    if student_role:
        user_role = UserRole(user_id=student.id, role_id=student_role.id, tenant_id=req.tenant_id)
        db.add(user_role)

    return student
