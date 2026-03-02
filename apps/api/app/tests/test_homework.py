"""Homework tests — 4 cases."""

def test_list_homework_student(api, student):
    r = api.get("/api/v1/homework", token=student["token"])
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_list_homework_teacher(api, teacher):
    r = api.get("/api/v1/homework", token=teacher["token"])
    assert r.status_code == 200

def test_homework_no_auth(api):
    r = api.get("/api/v1/homework")
    assert r.status_code in (401, 403)

def test_homework_has_seeded_data(api, student):
    hw = api.get("/api/v1/homework", token=student["token"]).json()
    assert len(hw) >= 1  # Seeded 4 assignments
