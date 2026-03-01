"""Academic years tests (3 tests)."""
from app.tests.conftest import get_auth_header


def test_create_academic_year(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.post("/api/v1/academic-years", headers=headers, json={
        "name": "2025-2026",
        "start_date": "2025-09-01",
        "end_date": "2026-07-01",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "2025-2026"


def test_list_academic_years(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    # Create one first
    client.post("/api/v1/academic-years", headers=headers, json={
        "name": "2025-2026",
        "start_date": "2025-09-01",
        "end_date": "2026-07-01",
    })
    resp = client.get("/api/v1/academic-years", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_create_term(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    # Create academic year first
    year_resp = client.post("/api/v1/academic-years", headers=headers, json={
        "name": "2025-2026",
        "start_date": "2025-09-01",
        "end_date": "2026-07-01",
    })
    year_id = year_resp.json()["id"]
    resp = client.post(f"/api/v1/academic-years/{year_id}/terms", headers=headers, json={
        "name": "Trimestre 1",
        "start_date": "2025-09-01",
        "end_date": "2025-12-20",
        "order": 1,
    })
    assert resp.status_code == 201
    assert resp.json()["name"] == "Trimestre 1"
