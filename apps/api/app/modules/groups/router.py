from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.groups.schemas import (
    GroupCreate,
    GroupDetailResponse,
    GroupResponse,
    GroupUpdate,
    MemberAdd,
    MemberResponse,
)
from app.modules.groups.service import (
    add_member,
    create_group,
    delete_group,
    get_group_detail,
    list_groups,
    remove_member,
    update_group,
)

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])


@router.post("", response_model=GroupResponse, status_code=201)
def create(
    request: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = create_group(db, current_user.tenant_id, **request.model_dump())
    return GroupResponse(**{
        "id": group.id, "tenant_id": group.tenant_id, "type": group.type,
        "name": group.name, "description": group.description, "capacity": group.capacity,
        "created_at": group.created_at, "member_count": 0,
    })


@router.get("", response_model=list[GroupResponse])
def list_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_groups(db, current_user.tenant_id)


@router.get("/{group_id}", response_model=GroupDetailResponse)
def detail(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_group_detail(db, group_id)


@router.patch("/{group_id}", response_model=GroupResponse)
def update(
    group_id: UUID,
    request: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = update_group(db, group_id, **request.model_dump(exclude_unset=True))
    return GroupResponse(**{
        "id": group.id, "tenant_id": group.tenant_id, "type": group.type,
        "name": group.name, "description": group.description, "capacity": group.capacity,
        "created_at": group.created_at, "member_count": 0,
    })


@router.delete("/{group_id}", status_code=204)
def delete(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_group(db, group_id)


@router.post("/{group_id}/members", response_model=MemberResponse, status_code=201)
def add(
    group_id: UUID,
    request: MemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return add_member(db, group_id, request.user_id, request.role_in_group)


@router.delete("/{group_id}/members/{user_id}", status_code=204)
def remove(
    group_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    remove_member(db, group_id, user_id)
