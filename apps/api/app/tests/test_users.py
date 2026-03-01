"""User CRUD tests (8 tests)."""
from app.tests.conftest import get_auth_header


def test_list_users(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get("/api/v1/users", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2


def test_create_user_as_admin(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "newuser@test.com",
            "first_name": "New",
            "last_name": "User",
            "password": "newpass123",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newuser@test.com"
    assert data["status"] == "active"


def test_get_user_by_id(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get(f"/api/v1/users/{teacher_user.id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "teacher@test.com"


def test_update_user(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.patch(
        f"/api/v1/users/{teacher_user.id}",
        headers=headers,
        json={"first_name": "Jean-Pierre"},
    )
    assert resp.status_code == 200
    assert resp.json()["first_name"] == "Jean-Pierre"


def test_soft_delete_user(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.delete(f"/api/v1/users/{teacher_user.id}", headers=headers)
    assert resp.status_code == 204


def test_filter_by_role(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get("/api/v1/users?role=teacher", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    for item in data["items"]:
        assert "teacher" in item["roles"]


def test_search_users(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get("/api/v1/users?q=dupont", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


def test_create_user_as_non_admin_returns_403(client, teacher_user):
    headers = get_auth_header(client, "teacher@test.com", "teacher123")
    resp = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "unauthorized@test.com",
            "first_name": "No",
            "last_name": "Access",
        },
    )
    assert resp.status_code == 403
