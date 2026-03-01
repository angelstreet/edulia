from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.db.models.group import Group, GroupMembership


def create_group(db: Session, tenant_id: UUID, **kwargs) -> Group:
    group = Group(tenant_id=tenant_id, **kwargs)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def list_groups(db: Session, tenant_id: UUID) -> list[dict]:
    groups = (
        db.query(Group)
        .options(joinedload(Group.memberships))
        .filter(Group.tenant_id == tenant_id)
        .order_by(Group.name)
        .all()
    )
    result = []
    for g in groups:
        active_members = [m for m in g.memberships if m.left_at is None]
        result.append({
            "id": g.id,
            "tenant_id": g.tenant_id,
            "type": g.type,
            "name": g.name,
            "description": g.description,
            "capacity": g.capacity,
            "created_at": g.created_at,
            "member_count": len(active_members),
        })
    return result


def get_group_detail(db: Session, group_id: UUID) -> dict:
    group = (
        db.query(Group)
        .options(joinedload(Group.memberships))
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise NotFoundException("Group not found")
    active_members = [m for m in group.memberships if m.left_at is None]
    return {
        "id": group.id,
        "tenant_id": group.tenant_id,
        "type": group.type,
        "name": group.name,
        "description": group.description,
        "capacity": group.capacity,
        "created_at": group.created_at,
        "member_count": len(active_members),
        "members": active_members,
    }


def update_group(db: Session, group_id: UUID, **kwargs) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise NotFoundException("Group not found")
    for key, value in kwargs.items():
        if value is not None:
            setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return group


def delete_group(db: Session, group_id: UUID) -> None:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise NotFoundException("Group not found")
    db.delete(group)
    db.commit()


def add_member(db: Session, group_id: UUID, user_id: UUID, role_in_group: str = "member") -> GroupMembership:
    membership = GroupMembership(group_id=group_id, user_id=user_id, role_in_group=role_in_group)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def remove_member(db: Session, group_id: UUID, user_id: UUID) -> None:
    membership = (
        db.query(GroupMembership)
        .filter(GroupMembership.group_id == group_id, GroupMembership.user_id == user_id, GroupMembership.left_at.is_(None))
        .first()
    )
    if not membership:
        raise NotFoundException("Membership not found")
    db.delete(membership)
    db.commit()
