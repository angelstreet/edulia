"""Attendance tests — 4 cases."""

def test_list_attendance_admin(api, admin):
    r = api.get("/api/v1/attendance", token=admin["token"])
    assert r.status_code == 200

def test_list_attendance_teacher(api, teacher):
    r = api.get("/api/v1/attendance", token=teacher["token"])
    assert r.status_code == 200

def test_attendance_no_auth(api):
    r = api.get("/api/v1/attendance")
    assert r.status_code in (401, 403)

def test_attendance_cross_tenant(api, admin, enterprise_hr):
    a1 = api.get("/api/v1/attendance", token=admin["token"]).json()
    a2 = api.get("/api/v1/attendance", token=enterprise_hr["token"]).json()
    if isinstance(a1, list) and isinstance(a2, list):
        ids1 = {a.get("id") for a in a1}
        ids2 = {a.get("id") for a in a2}
        assert ids1.isdisjoint(ids2)
