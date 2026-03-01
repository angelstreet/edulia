"""Subject CRUD tests (4 tests)."""
from app.tests.conftest import get_auth_header


def test_create_subject(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.post("/api/v1/subjects", headers=headers, json={
        "code": "MATH",
        "name": "Mathematics",
        "color": "#3B82F6",
        "coefficient": 4.0,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["code"] == "MATH"
    assert data["name"] == "Mathematics"


def test_list_subjects(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    client.post("/api/v1/subjects", headers=headers, json={
        "code": "FR", "name": "French",
    })
    resp = client.get("/api/v1/subjects", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_update_subject(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/subjects", headers=headers, json={
        "code": "ENG", "name": "English",
    })
    subject_id = create_resp.json()["id"]
    resp = client.patch(f"/api/v1/subjects/{subject_id}", headers=headers, json={
        "name": "English Language",
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == "English Language"


def test_delete_subject(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/subjects", headers=headers, json={
        "code": "HIST", "name": "History",
    })
    subject_id = create_resp.json()["id"]
    resp = client.delete(f"/api/v1/subjects/{subject_id}", headers=headers)
    assert resp.status_code == 204
