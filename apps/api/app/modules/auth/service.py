import secrets
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models.user import User, UserRole


def authenticate_user(db: Session, email: str, password: str, tenant_id: UUID | None = None) -> User:
    query = db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role)
    ).filter(User.email == email)
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
    user = query.first()

    if not user or not user.password_hash:
        raise UnauthorizedException("Invalid email or password")
    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")
    if user.status == "suspended":
        raise UnauthorizedException("Account suspended")

    user.last_login_at = datetime.utcnow()
    db.commit()
    return user


def create_tokens(user: User) -> dict:
    roles = []
    permissions = []
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            roles.append(ur.role.code)
            if ur.role.permissions:
                permissions.extend(ur.role.permissions)

    token_data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "roles": roles,
        "permissions": list(set(permissions)),
    }
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
    }


def refresh_access_token(db: Session, refresh_token: str) -> str:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid refresh token")

    user_id = payload.get("sub")
    user = db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role)
    ).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("User not found")

    roles = []
    permissions = []
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            roles.append(ur.role.code)
            if ur.role.permissions:
                permissions.extend(ur.role.permissions)

    token_data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "roles": roles,
        "permissions": list(set(permissions)),
    }
    return create_access_token(token_data)


def generate_reset_token(db: Session, email: str) -> str | None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None  # Don't reveal if email exists

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    return token


def reset_password(db: Session, token: str, new_password: str) -> None:
    user = db.query(User).filter(
        User.reset_token == token,
        User.reset_token_expires > datetime.utcnow(),
    ).first()
    if not user:
        raise UnauthorizedException("Invalid or expired reset token")

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()


def accept_invite(db: Session, token: str, password: str) -> User:
    user = db.query(User).filter(User.invite_token == token).first()
    if not user:
        raise NotFoundException("Invalid invite token")

    user.password_hash = hash_password(password)
    user.invite_token = None
    user.status = "active"
    db.commit()
    return user
