from functools import wraps
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.permissions import check_permission
from app.core.security import decode_token
from app.db.database import get_db
from app.db.models.user import User, UserRole


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload.get("sub")
    user = (
        db.query(User)
        .options(joinedload(User.user_roles).joinedload(UserRole.role))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise UnauthorizedException("User not found")

    return user


def require_permission(permission_code: str):
    """Dependency factory that checks a user has a specific permission."""

    def dependency(current_user: User = Depends(get_current_user)):
        if not check_permission(current_user.user_roles, permission_code):
            raise ForbiddenException(f"Permission required: {permission_code}")
        return current_user

    return dependency
