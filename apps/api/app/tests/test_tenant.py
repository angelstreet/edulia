"""Tenant settings tests (4 tests)."""
from app.tests.conftest import get_auth_header


def test_get_tenant_info(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get("/api/v1/tenant", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test School"
    assert data["slug"] == "test-school"


def test_update_tenant(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.patch("/api/v1/tenant", headers=headers, json={"name": "Updated School"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated School"


def test_get_tenant_settings(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get("/api/v1/tenant/settings", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "settings" in data


def test_update_tenant_settings_forbidden(client, teacher_user):
    headers = get_auth_header(client, "teacher@test.com", "teacher123")
    resp = client.patch("/api/v1/tenant/settings", headers=headers, json={"settings": {"locale": "en"}})
    assert resp.status_code == 403
