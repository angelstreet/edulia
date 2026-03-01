"""Messaging tests (7 tests including tenant isolation)."""
from app.tests.conftest import get_auth_header


def test_create_thread(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.post("/api/v1/threads", headers=headers, json={
        "type": "direct",
        "subject": "Welcome",
        "participant_ids": [str(teacher_user.id)],
        "body": "Hello teacher!",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["subject"] == "Welcome"
    assert data["type"] == "direct"


def test_list_threads(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    client.post("/api/v1/threads", headers=headers, json={
        "participant_ids": [str(teacher_user.id)],
        "body": "Test message",
    })
    resp = client.get("/api/v1/threads", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_get_thread_detail(client, admin_user, teacher_user):
    headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/threads", headers=headers, json={
        "subject": "Details test",
        "participant_ids": [str(teacher_user.id)],
        "body": "Check details",
    })
    thread_id = create_resp.json()["id"]
    resp = client.get(f"/api/v1/threads/{thread_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["messages"]) == 1
    assert len(data["participants"]) == 2


def test_reply_to_thread(client, admin_user, teacher_user):
    admin_headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/threads", headers=admin_headers, json={
        "participant_ids": [str(teacher_user.id)],
        "body": "Initial message",
    })
    thread_id = create_resp.json()["id"]

    teacher_headers = get_auth_header(client, "teacher@test.com", "teacher123")
    resp = client.post(f"/api/v1/threads/{thread_id}/messages", headers=teacher_headers, json={
        "body": "Reply from teacher",
    })
    assert resp.status_code == 201
    assert resp.json()["body"] == "Reply from teacher"


def test_mark_thread_read(client, admin_user, teacher_user):
    admin_headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/threads", headers=admin_headers, json={
        "participant_ids": [str(teacher_user.id)],
        "body": "Read test",
    })
    thread_id = create_resp.json()["id"]

    teacher_headers = get_auth_header(client, "teacher@test.com", "teacher123")
    resp = client.patch(f"/api/v1/threads/{thread_id}/read", headers=teacher_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "read"


def test_non_participant_cannot_view(client, admin_user, teacher_user, student_user):
    admin_headers = get_auth_header(client, "admin@test.com", "admin123")
    create_resp = client.post("/api/v1/threads", headers=admin_headers, json={
        "participant_ids": [str(teacher_user.id)],
        "body": "Private conversation",
    })
    thread_id = create_resp.json()["id"]

    student_headers = get_auth_header(client, "student@test.com", "student123")
    resp = client.get(f"/api/v1/threads/{thread_id}", headers=student_headers)
    assert resp.status_code == 403


def test_thread_only_visible_to_participants(client, admin_user, teacher_user, student_user):
    admin_headers = get_auth_header(client, "admin@test.com", "admin123")
    client.post("/api/v1/threads", headers=admin_headers, json={
        "participant_ids": [str(teacher_user.id)],
        "body": "Admin-teacher only",
    })

    student_headers = get_auth_header(client, "student@test.com", "student123")
    resp = client.get("/api/v1/threads", headers=student_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0
