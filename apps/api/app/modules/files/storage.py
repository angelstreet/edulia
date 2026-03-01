"""S3/MinIO storage abstraction."""

import logging
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".json",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".mp3", ".mp4", ".wav", ".webm",
    ".zip", ".tar", ".gz",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
    )


def upload_file(file_data: bytes, filename: str, mime_type: str, folder: str | None = None) -> str:
    """Upload file to S3/MinIO and return the storage key."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    key = f"{folder}/{uuid4()}{ext}" if folder else f"uploads/{uuid4()}{ext}"

    client = get_s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=file_data,
        ContentType=mime_type,
    )
    return key


def get_presigned_url(storage_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned download URL."""
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": storage_key},
        ExpiresIn=expires_in,
    )


def delete_file(storage_key: str) -> None:
    """Delete file from S3/MinIO."""
    client = get_s3_client()
    client.delete_object(Bucket=settings.S3_BUCKET, Key=storage_key)
