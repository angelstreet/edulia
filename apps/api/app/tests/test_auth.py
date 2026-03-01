"""Auth tests: login, refresh, /me with/without token (5 tests)."""
from app.tests.conftest import get_auth_header


def test_login_success(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_refresh_token(client, admin_user):
    # Login first
    login_resp = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    refresh_token = login_resp.json()["refresh_token"]

    # Refresh
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_get_me_with_token(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get("/api/v1/users/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"
    assert data["first_name"] == "Admin"
    assert "admin" in data["roles"]


def test_get_me_without_token(client):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 401
