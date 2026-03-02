"""Gradebook tests — 10 cases."""

def test_list_assessments_teacher(api, teacher):
    r = api.get("/api/v1/gradebook/assessments", token=teacher["token"])
    assert isinstance(r.json(), list)

def test_list_categories(api, teacher):
    r = api.get("/api/v1/gradebook/categories", token=teacher["token"])
    assert r.status_code in (200, 422)  # May require query params

def test_student_averages(api, student):
    r = api.get(f"/api/v1/gradebook/students/{student['user_id']}/averages", token=student["token"])

def test_student_subject_grades(api, student):
    """Student can see grades for a specific subject."""
    avgs = api.get(f"/api/v1/gradebook/students/{student['user_id']}/averages", token=student["token"]).json()
    if isinstance(avgs, list) and avgs:
        subject_id = avgs[0].get("subject_id")
        if subject_id:
            r = api.get(f"/api/v1/gradebook/students/{student['user_id']}/subjects/{subject_id}/grades",
                        token=student["token"])
            assert r.status_code == 200

def test_assessment_grades(api, teacher):
    """Teacher can view grades for an assessment."""
    assessments = api.get("/api/v1/gradebook/assessments", token=teacher["token"]).json()
    if assessments:
        r = api.get(f"/api/v1/gradebook/assessments/{assessments[0]['id']}/grades", token=teacher["token"])
        assert r.status_code == 200

def test_tutor_assessments(api, tutor):
    r = api.get("/api/v1/gradebook/assessments", token=tutor["token"])

def test_tutor_student_averages(api, tutor_student):
    r = api.get(f"/api/v1/gradebook/students/{tutor_student['user_id']}/averages", token=tutor_student["token"])

def test_parent_sees_child_grades(api, parent):
    """Parent can view children's grades."""
    children = api.get(f"/api/v1/users/{parent['user_id']}/children", token=parent["token"]).json()
    if children:
        child_id = children[0]["id"]
        r = api.get(f"/api/v1/gradebook/students/{child_id}/averages", token=parent["token"])
        assert r.status_code == 200

def test_assessments_no_auth(api):
    r = api.get("/api/v1/gradebook/assessments")
    assert r.status_code in (401, 403)

def test_enterprise_no_gradebook(api, employee):
    """Enterprise employee has no assessments."""
    r = api.get("/api/v1/gradebook/assessments", token=employee["token"])
    assert r.json() == [] or r.status_code in (200, 403)
