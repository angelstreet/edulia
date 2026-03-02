"""Group/class management tests — 6 cases."""

def test_list_groups(api, admin):
    r = api.get("/api/v1/groups", token=admin["token"])
    assert r.status_code == 200
    groups = r.json()
    assert isinstance(groups, list)
    assert len(groups) >= 1

def test_get_group(api, admin):
    groups = api.get("/api/v1/groups", token=admin["token"]).json()
    if groups:
        r = api.get(f"/api/v1/groups/{groups[0]['id']}", token=admin["token"])
        assert r.status_code == 200

def test_teacher_sees_groups(api, teacher):
    r = api.get("/api/v1/groups", token=teacher["token"])
    assert r.status_code == 200

def test_student_sees_groups(api, student):
    r = api.get("/api/v1/groups", token=student["token"])
    assert r.status_code == 200

def test_enterprise_groups(api, enterprise_hr):
    r = api.get("/api/v1/groups", token=enterprise_hr["token"])
    assert r.status_code == 200

def test_groups_no_auth(api):
    r = api.get("/api/v1/groups")
    assert r.status_code in (401, 403)
