"""Group + membership tests (5 tests)."""
from app.tests.conftest import get_auth_header


def test_create_group(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.post("/api/v1/groups", headers=headers, json={
        "type": "class",
        "name": "6ème A",
        "capacity": 30,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "6ème A"
    assert data["capacity"] == 30


def test_list_groups(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    client.post("/api/v1/groups", headers=headers, json={"name": "6ème B"})
    resp = client.get("/api/v1/groups", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_group_detail(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/groups", headers=headers, json={"name": "5ème A"})
    group_id = create_resp.json()["id"]
    resp = client.get(f"/api/v1/groups/{group_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "5ème A"
    assert "members" in resp.json()


def test_add_member(client, admin_user, student_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/groups", headers=headers, json={"name": "4ème A"})
    group_id = create_resp.json()["id"]
    resp = client.post(f"/api/v1/groups/{group_id}/members", headers=headers, json={
        "user_id": str(student_user.id),
        "role_in_group": "student",
    })
    assert resp.status_code == 201
    assert resp.json()["role_in_group"] == "student"


def test_remove_member(client, admin_user, student_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/groups", headers=headers, json={"name": "3ème A"})
    group_id = create_resp.json()["id"]
    client.post(f"/api/v1/groups/{group_id}/members", headers=headers, json={
        "user_id": str(student_user.id),
    })
    resp = client.delete(f"/api/v1/groups/{group_id}/members/{student_user.id}", headers=headers)
    assert resp.status_code == 204
