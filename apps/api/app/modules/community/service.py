from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.db.models.group import Group, GroupMembership
from app.db.models.user import Role, User, UserRole


def list_directory(
    db: Session,
    tenant_id: UUID,
    role: str | None = None,
    group_id: UUID | None = None,
    q: str | None = None,
) -> list[dict]:
    query = (
        db.query(User)
        .options(joinedload(User.user_roles).joinedload(UserRole.role))
        .filter(User.tenant_id == tenant_id, User.status == "active")
    )

    if role:
        query = query.join(User.user_roles).join(UserRole.role).filter(Role.code == role)

    if group_id:
        query = (
            query.join(GroupMembership, GroupMembership.user_id == User.id)
            .filter(GroupMembership.group_id == group_id, GroupMembership.left_at.is_(None))
        )

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search),
                User.last_name.ilike(search),
                User.display_name.ilike(search),
            )
        )

    query = query.distinct()
    users = query.order_by(User.last_name, User.first_name).all()

    # Populate group_name from active group memberships
    user_ids = [u.id for u in users]
    memberships = (
        db.query(GroupMembership)
        .options(joinedload(GroupMembership.group))
        .filter(
            GroupMembership.user_id.in_(user_ids),
            GroupMembership.left_at.is_(None),
        )
        .all()
    ) if user_ids else []
    group_by_user: dict = {}
    for m in memberships:
        if m.group and m.user_id not in group_by_user:
            group_by_user[m.user_id] = m.group.name

    result = []
    for u in users:
        active_roles = [ur.role.code for ur in u.user_roles if ur.revoked_at is None and ur.role]
        result.append({
            "id": u.id,
            "display_name": u.display_name or f"{u.first_name} {u.last_name}",
            "role": active_roles[0] if active_roles else "unknown",
            "group_name": group_by_user.get(u.id),
        })
    return result


def list_delegates(db: Session, tenant_id: UUID) -> list[dict]:
    memberships = (
        db.query(GroupMembership)
        .options(joinedload(GroupMembership.group))
        .join(Group, Group.id == GroupMembership.group_id)
        .join(User, User.id == GroupMembership.user_id)
        .filter(
            Group.tenant_id == tenant_id,
            GroupMembership.role_in_group == "delegate",
            GroupMembership.left_at.is_(None),
        )
        .all()
    )

    result = []
    for m in memberships:
        user = db.query(User).filter(User.id == m.user_id).first()
        display = user.display_name or f"{user.first_name} {user.last_name}" if user else str(m.user_id)
        result.append({
            "user_id": m.user_id,
            "display_name": display,
            "group_id": m.group_id,
            "group_name": m.group.name if m.group else "",
        })
    return result
