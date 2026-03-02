from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.user import User
from app.modules.files.schemas import CategoryCount, FileResponse
from app.modules.files.service import get_file, get_category_counts, list_files, remove_file, upload
from app.modules.files.storage import get_presigned_url

router = APIRouter(prefix="/api/v1/files", tags=["files"])


@router.post("/upload", response_model=FileResponse, status_code=201)
def upload_file(
    file: UploadFile = File(...),
    folder: str | None = None,
    visibility: str = "private",
    context_type: str | None = None,
    context_id: UUID | None = None,
    category: str = "general",
    source_module: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return upload(
        db, current_user.tenant_id, current_user.id, file,
        folder=folder, visibility=visibility,
        context_type=context_type, context_id=context_id,
        category=category, source_module=source_module,
    )


@router.get("/categories", response_model=list[CategoryCount])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_category_counts(db, current_user.tenant_id)


@router.get("", response_model=list[FileResponse])
def list_all(
    context_type: str | None = Query(None),
    context_id: UUID | None = Query(None),
    category: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_files(db, current_user.tenant_id, context_type, context_id, category)


@router.get("/{file_id}", response_model=FileResponse)
def detail(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_file(db, file_id)


@router.get("/{file_id}/download")
def download(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    f = get_file(db, file_id)
    url = get_presigned_url(f.storage_key)
    return RedirectResponse(url=url, status_code=302)


@router.delete("/{file_id}", status_code=204)
def delete(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    remove_file(db, file_id)
