from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_permission
from app.db.database import get_db
from app.db.models.user import User
from app.modules.users.schemas import (
    RelationshipCreate,
    RelationshipResponse,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from app.modules.users.service import (
    create_relationship,
    create_user,
    get_children,
    get_relationships,
    get_user_by_id,
    list_users,
    soft_delete_user,
    update_user,
)

router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _user_to_response(user: User) -> UserResponse:
    roles = []
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            roles.append(ur.role.code)
    return UserResponse(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        phone=user.phone,
        gender=user.gender,
        status=user.status,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=roles,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_to_response(current_user)


@router.get("", response_model=UserListResponse)
def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = Query(None),
    q: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = list_users(db, current_user.tenant_id, page, page_size, role, q)
    return UserListResponse(
        items=[_user_to_response(u) for u in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.post("", response_model=UserResponse, status_code=201)
def create_user_endpoint(
    request: UserCreate,
    current_user: User = Depends(require_permission("admin.user.create")),
    db: Session = Depends(get_db),
):
    user = create_user(
        db,
        tenant_id=current_user.tenant_id,
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        password=request.password,
        display_name=request.display_name,
        phone=request.phone,
        gender=request.gender,
        role_code=request.role_code,
    )
    return _user_to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id)
    return _user_to_response(user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: UUID,
    request: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = update_user(db, user_id, **request.model_dump(exclude_unset=True))
    return _user_to_response(user)


@router.delete("/{user_id}", status_code=204)
def delete_user_endpoint(
    user_id: UUID,
    current_user: User = Depends(require_permission("admin.user.delete")),
    db: Session = Depends(get_db),
):
    soft_delete_user(db, user_id)


# --- Relationships ---


@router.post("/{user_id}/relationships", response_model=RelationshipResponse, status_code=201)
def create_relationship_endpoint(
    user_id: UUID,
    request: RelationshipCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rel = create_relationship(
        db,
        tenant_id=current_user.tenant_id,
        from_user_id=user_id,
        to_user_id=request.to_user_id,
        type=request.type,
        is_primary=request.is_primary,
        metadata=request.metadata,
    )
    return RelationshipResponse.model_validate(rel)


@router.get("/{user_id}/relationships", response_model=list[RelationshipResponse])
def get_relationships_endpoint(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rels = get_relationships(db, user_id)
    return [RelationshipResponse.model_validate(r) for r in rels]


@router.get("/{user_id}/children", response_model=list[UserResponse])
def get_children_endpoint(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    children = get_children(db, user_id)
    return [_user_to_response(c) for c in children]
