"""File upload/download tests (5 tests with mocked S3)."""
import io
from unittest.mock import MagicMock, patch

from app.tests.conftest import get_auth_header


@patch("app.modules.files.storage.get_s3_client")
def test_upload_file(mock_s3, client, admin_user):
    mock_client = MagicMock()
    mock_s3.return_value = mock_client

    headers = get_auth_header(client, "admin@test.com", "admin123")
    file_content = b"Hello world PDF content"
    resp = client.post(
        "/api/v1/files/upload",
        headers=headers,
        files={"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test.pdf"
    assert data["mime_type"] == "application/pdf"
    assert data["size_bytes"] == len(file_content)


@patch("app.modules.files.storage.get_s3_client")
def test_get_file_metadata(mock_s3, client, admin_user):
    mock_s3.return_value = MagicMock()

    headers = get_auth_header(client, "admin@test.com", "admin123")
    upload_resp = client.post(
        "/api/v1/files/upload",
        headers=headers,
        files={"file": ("doc.pdf", io.BytesIO(b"content"), "application/pdf")},
    )
    file_id = upload_resp.json()["id"]

    resp = client.get(f"/api/v1/files/{file_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "doc.pdf"


@patch("app.modules.files.storage.get_s3_client")
def test_delete_file(mock_s3, client, admin_user):
    mock_s3.return_value = MagicMock()

    headers = get_auth_header(client, "admin@test.com", "admin123")
    upload_resp = client.post(
        "/api/v1/files/upload",
        headers=headers,
        files={"file": ("todelete.pdf", io.BytesIO(b"content"), "application/pdf")},
    )
    file_id = upload_resp.json()["id"]

    resp = client.delete(f"/api/v1/files/{file_id}", headers=headers)
    assert resp.status_code == 204


@patch("app.modules.files.storage.get_s3_client")
def test_upload_blocked_extension(mock_s3, client, admin_user):
    mock_s3.return_value = MagicMock()

    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.post(
        "/api/v1/files/upload",
        headers=headers,
        files={"file": ("malware.exe", io.BytesIO(b"bad content"), "application/octet-stream")},
    )
    assert resp.status_code == 400


@patch("app.modules.files.storage.get_s3_client")
def test_upload_too_large(mock_s3, client, admin_user):
    mock_s3.return_value = MagicMock()

    headers = get_auth_header(client, "admin@test.com", "admin123")
    # Create content larger than 50MB
    large_content = b"x" * (51 * 1024 * 1024)
    resp = client.post(
        "/api/v1/files/upload",
        headers=headers,
        files={"file": ("huge.pdf", io.BytesIO(large_content), "application/pdf")},
    )
    assert resp.status_code == 413
