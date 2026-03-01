import secrets
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictException, NotFoundException
from app.core.pagination import paginate
from app.core.security import hash_password
from app.db.models.user import Relationship, Role, User, UserRole


def get_user_by_id(db: Session, user_id: UUID) -> User:
    user = (
        db.query(User)
        .options(joinedload(User.user_roles).joinedload(UserRole.role))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise NotFoundException("User not found")
    return user


def list_users(
    db: Session,
    tenant_id: UUID,
    page: int = 1,
    page_size: int = 20,
    role: str | None = None,
    q: str | None = None,
) -> dict:
    query = (
        db.query(User)
        .options(joinedload(User.user_roles).joinedload(UserRole.role))
        .filter(User.tenant_id == tenant_id, User.status != "inactive")
    )

    if role:
        query = query.join(User.user_roles).join(UserRole.role).filter(Role.code == role)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search),
                User.last_name.ilike(search),
                User.email.ilike(search),
            )
        )

    # Deduplicate from joins
    query = query.distinct()

    return paginate(query, page, page_size)


def create_user(
    db: Session,
    tenant_id: UUID,
    email: str,
    first_name: str,
    last_name: str,
    password: str | None = None,
    display_name: str | None = None,
    phone: str | None = None,
    gender: str | None = None,
    role_code: str | None = None,
) -> User:
    existing = db.query(User).filter(User.tenant_id == tenant_id, User.email == email).first()
    if existing:
        raise ConflictException("User with this email already exists in this tenant")

    user = User(
        tenant_id=tenant_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
        display_name=display_name or f"{first_name} {last_name}",
        phone=phone,
        gender=gender,
    )

    if password:
        user.password_hash = hash_password(password)
        user.status = "active"
    else:
        user.invite_token = secrets.token_urlsafe(32)
        user.status = "invited"

    db.add(user)
    db.flush()

    if role_code:
        role = db.query(Role).filter(Role.tenant_id == tenant_id, Role.code == role_code).first()
        if role:
            user_role = UserRole(user_id=user.id, role_id=role.id, scope_type="tenant")
            db.add(user_role)

    db.commit()
    db.refresh(user)
    return get_user_by_id(db, user.id)


def update_user(db: Session, user_id: UUID, **kwargs) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User not found")

    for key, value in kwargs.items():
        if value is not None and hasattr(user, key):
            setattr(user, key, value)

    db.commit()
    return get_user_by_id(db, user_id)


def soft_delete_user(db: Session, user_id: UUID) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User not found")
    user.status = "inactive"
    db.commit()


# --- Relationships ---


def create_relationship(
    db: Session,
    tenant_id: UUID,
    from_user_id: UUID,
    to_user_id: UUID,
    type: str,
    is_primary: bool = False,
    metadata: dict | None = None,
) -> Relationship:
    rel = Relationship(
        tenant_id=tenant_id,
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        type=type,
        is_primary=is_primary,
        metadata_=metadata or {},
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return rel


def get_relationships(db: Session, user_id: UUID) -> list[Relationship]:
    return (
        db.query(Relationship)
        .filter(
            or_(
                Relationship.from_user_id == user_id,
                Relationship.to_user_id == user_id,
            )
        )
        .all()
    )


def get_children(db: Session, user_id: UUID) -> list[User]:
    rels = (
        db.query(Relationship)
        .filter(Relationship.from_user_id == user_id, Relationship.type == "guardian")
        .all()
    )
    child_ids = [r.to_user_id for r in rels]
    if not child_ids:
        return []
    return db.query(User).filter(User.id.in_(child_ids)).all()
