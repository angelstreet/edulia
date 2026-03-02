from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.community.schemas import DelegateResponse, DirectoryUser
from app.modules.community.service import list_delegates, list_directory

router = APIRouter(prefix="/api/v1/community", tags=["community"])


@router.get("/directory", response_model=list[DirectoryUser])
def directory(
    role: str | None = Query(None),
    group_id: UUID | None = Query(None),
    q: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_directory(db, current_user.tenant_id, role=role, group_id=group_id, q=q)


@router.get("/delegates", response_model=list[DelegateResponse])
def delegates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_delegates(db, current_user.tenant_id)
