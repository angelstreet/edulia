"""Timetable tests — 8 cases."""

def test_list_sessions_admin(api, admin):
    r = api.get("/api/v1/timetable/sessions", token=admin["token"])
    assert r.status_code == 200
    sessions = r.json()
    assert isinstance(sessions, list)
    assert len(sessions) >= 1  # Seeded data

def test_list_sessions_teacher(api, teacher):
    r = api.get("/api/v1/timetable/sessions", token=teacher["token"])
    assert r.status_code == 200

def test_list_sessions_student(api, student):
    r = api.get("/api/v1/timetable/sessions", token=student["token"])
    assert r.status_code == 200

def test_list_rooms(api, admin):
    r = api.get("/api/v1/timetable/rooms", token=admin["token"])
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_conflict_detection_no_conflict(api, admin):
    r = api.post("/api/v1/timetable/check-conflicts", token=admin["token"],
                 json={"day_of_week": 6, "start_time": "23:00", "end_time": "23:59"})
    assert r.status_code == 200
    assert r.json()["has_conflicts"] == False

def test_tutor_sessions(api, tutor):
    r = api.get("/api/v1/timetable/sessions", token=tutor["token"])
    assert r.status_code == 200

def test_timetable_no_auth(api):
    r = api.get("/api/v1/timetable/sessions")
    assert r.status_code in (401, 403)

def test_sessions_cross_tenant_isolation(api, admin, enterprise_hr):
    """Admin sees only own tenant sessions."""
    admin_sessions = api.get("/api/v1/timetable/sessions", token=admin["token"]).json()
    hr_sessions = api.get("/api/v1/timetable/sessions", token=enterprise_hr["token"]).json()
    admin_ids = {s["id"] for s in admin_sessions}
    hr_ids = {s["id"] for s in hr_sessions}
    assert admin_ids.isdisjoint(hr_ids)  # No overlap
