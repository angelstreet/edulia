import os
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundException
from app.db.models.file import File
from app.modules.files.storage import ALLOWED_EXTENSIONS, MAX_FILE_SIZE, delete_file, upload_file


def upload(
    db: Session, tenant_id: UUID, uploaded_by: UUID, file: UploadFile,
    folder: str | None = None, visibility: str = "private",
    context_type: str | None = None, context_id: UUID | None = None,
    category: str = "general", source_module: str | None = None,
) -> File:
    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise AppException(400, f"File type '{ext}' not allowed")

    # Read content and validate size
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise AppException(413, "File too large (max 50MB)")

    # Upload to storage
    storage_key = upload_file(content, file.filename or "file", file.content_type or "application/octet-stream", folder)

    # Save metadata
    db_file = File(
        tenant_id=tenant_id,
        uploaded_by=uploaded_by,
        name=file.filename or "file",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        storage_key=storage_key,
        folder=folder,
        visibility=visibility,
        context_type=context_type,
        context_id=context_id,
        category=category,
        source_module=source_module,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def get_file(db: Session, file_id: UUID) -> File:
    f = db.query(File).filter(File.id == file_id).first()
    if not f:
        raise NotFoundException("File not found")
    return f


def list_files(
    db: Session, tenant_id: UUID,
    context_type: str | None = None, context_id: UUID | None = None,
    category: str | None = None,
) -> list[File]:
    query = db.query(File).filter(File.tenant_id == tenant_id)
    if context_type:
        query = query.filter(File.context_type == context_type)
    if context_id:
        query = query.filter(File.context_id == context_id)
    if category:
        query = query.filter(File.category == category)
    return query.order_by(File.created_at.desc()).all()


def get_category_counts(db: Session, tenant_id: UUID) -> list[dict]:
    from sqlalchemy import func
    rows = (
        db.query(File.category, func.count(File.id).label("count"))
        .filter(File.tenant_id == tenant_id)
        .group_by(File.category)
        .all()
    )
    return [{"category": row.category or "general", "count": row.count} for row in rows]


def remove_file(db: Session, file_id: UUID) -> None:
    f = db.query(File).filter(File.id == file_id).first()
    if not f:
        raise NotFoundException("File not found")
    delete_file(f.storage_key)
    db.delete(f)
    db.commit()
