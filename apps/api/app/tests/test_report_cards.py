"""Report card PDF tests — 4 cases."""

def test_student_download_own_report(api, student):
    r = api.get(f"/api/v1/report-cards/students/{student['user_id']}/pdf", token=student["token"])
    assert r.status_code == 200
    assert "application/pdf" in r.headers.get("content-type", "")
    assert len(r.content) > 100

def test_tutor_student_report(api, tutor_student):
    r = api.get(f"/api/v1/report-cards/students/{tutor_student['user_id']}/pdf", token=tutor_student["token"])
    assert r.status_code == 200
    assert len(r.content) > 100

def test_report_no_auth(api):
    r = api.get("/api/v1/report-cards/students/00000000-0000-0000-0000-000000000000/pdf")
    assert r.status_code in (401, 403)

def test_report_nonexistent_student(api, admin):
    r = api.get("/api/v1/report-cards/students/00000000-0000-0000-0000-000000000000/pdf", token=admin["token"])
    assert r.status_code in (404, 500)
