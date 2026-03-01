"""Notification tests (4 tests)."""
from app.db.models.notification import Notification
from app.tests.conftest import get_auth_header


def test_list_notifications(client, admin_user, db_session):
    # Create a notification directly in DB
    n = Notification(
        tenant_id=admin_user.tenant_id,
        user_id=admin_user.id,
        type="info",
        channel="in_app",
        title="Test notification",
        body="Hello world",
    )
    db_session.add(n)
    db_session.flush()

    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.get("/api/v1/notifications", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
    assert resp.json()[0]["title"] == "Test notification"


def test_mark_notification_read(client, admin_user, db_session):
    n = Notification(
        tenant_id=admin_user.tenant_id,
        user_id=admin_user.id,
        type="info",
        channel="in_app",
        title="Unread notification",
    )
    db_session.add(n)
    db_session.flush()

    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.patch(f"/api/v1/notifications/{n.id}/read", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["read_at"] is not None


def test_mark_all_read(client, admin_user, db_session):
    for i in range(3):
        db_session.add(Notification(
            tenant_id=admin_user.tenant_id,
            user_id=admin_user.id,
            type="info",
            channel="in_app",
            title=f"Notification {i}",
        ))
    db_session.flush()

    headers = get_auth_header(client, "admin@test.com", "admin123")
    resp = client.post("/api/v1/notifications/read-all", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["marked_read"] == 3


def test_notification_not_visible_to_other_user(client, admin_user, teacher_user, db_session):
    n = Notification(
        tenant_id=admin_user.tenant_id,
        user_id=admin_user.id,
        type="info",
        channel="in_app",
        title="Admin only",
    )
    db_session.add(n)
    db_session.flush()

    teacher_headers = get_auth_header(client, "teacher@test.com", "teacher123")
    resp = client.get("/api/v1/notifications", headers=teacher_headers)
    assert resp.status_code == 200
    titles = [n["title"] for n in resp.json()]
    assert "Admin only" not in titles
