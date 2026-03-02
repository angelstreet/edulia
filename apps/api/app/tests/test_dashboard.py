"""Dashboard tests — 8 cases."""

def test_admin_dashboard(api, admin):
    r = api.get("/api/v1/dashboard/stats", token=admin["token"])
    assert r.status_code == 200
    data = r.json()
    assert "stats" in data
    assert any(s["key"] == "students" for s in data["stats"])
    assert any(s["key"] == "teachers" for s in data["stats"])

def test_teacher_dashboard(api, teacher):
    r = api.get("/api/v1/dashboard/stats", token=teacher["token"])
    assert r.status_code == 200
    assert "stats" in r.json()

def test_student_dashboard(api, student):
    r = api.get("/api/v1/dashboard/stats", token=student["token"])
    assert r.status_code == 200

def test_parent_dashboard(api, parent):
    r = api.get("/api/v1/dashboard/stats", token=parent["token"])
    assert r.status_code == 200

def test_tutor_dashboard(api, tutor):
    r = api.get("/api/v1/dashboard/stats", token=tutor["token"])
    assert r.status_code == 200

def test_enterprise_hr_dashboard(api, enterprise_hr):
    r = api.get("/api/v1/dashboard/stats", token=enterprise_hr["token"])
    assert r.status_code == 200

def test_employee_dashboard(api, employee):
    r = api.get("/api/v1/dashboard/stats", token=employee["token"])
    assert r.status_code == 200

def test_dashboard_no_auth(api):
    r = api.get("/api/v1/dashboard/stats")
    assert r.status_code in (401, 403)
