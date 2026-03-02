"""Notification tests — 4 cases."""

def test_list_notifications(api, student):
    r = api.get("/api/v1/notifications", token=student["token"])
    assert r.status_code == 200

def test_read_all_notifications(api, student):
    r = api.post("/api/v1/notifications/read-all", token=student["token"])
    assert r.status_code in (200, 204)

def test_notifications_no_auth(api):
    r = api.get("/api/v1/notifications")
    assert r.status_code in (401, 403)

def test_notifications_per_tenant(api, admin, employee):
    n1 = api.get("/api/v1/notifications", token=admin["token"]).json()
    n2 = api.get("/api/v1/notifications", token=employee["token"]).json()
    if isinstance(n1, list) and isinstance(n2, list):
        ids1 = {n.get("id") for n in n1}
        ids2 = {n.get("id") for n in n2}
        assert ids1.isdisjoint(ids2)
