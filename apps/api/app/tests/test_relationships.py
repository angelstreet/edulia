"""Relationship tests (3 tests)."""
from app.tests.conftest import get_auth_header


def test_create_relationship(client, parent_user, student_user):
    headers = get_auth_header(client, "parent@test.com", "parent123")
    resp = client.post(
        f"/api/v1/users/{parent_user.id}/relationships",
        headers=headers,
        json={
            "to_user_id": str(student_user.id),
            "type": "guardian",
            "is_primary": True,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "guardian"
    assert data["is_primary"] is True


def test_list_relationships(client, db_session, parent_user, student_user):
    # Create relationship first
    headers = get_auth_header(client, "parent@test.com", "parent123")
    client.post(
        f"/api/v1/users/{parent_user.id}/relationships",
        headers=headers,
        json={
            "to_user_id": str(student_user.id),
            "type": "guardian",
        },
    )

    resp = client.get(f"/api/v1/users/{parent_user.id}/relationships", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_children(client, db_session, parent_user, student_user):
    # Create guardian relationship
    headers = get_auth_header(client, "parent@test.com", "parent123")
    client.post(
        f"/api/v1/users/{parent_user.id}/relationships",
        headers=headers,
        json={
            "to_user_id": str(student_user.id),
            "type": "guardian",
        },
    )

    resp = client.get(f"/api/v1/users/{parent_user.id}/children", headers=headers)
    assert resp.status_code == 200
    children = resp.json()
    assert len(children) >= 1
    assert any(c["email"] == "student@test.com" for c in children)
