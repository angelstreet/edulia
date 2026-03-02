"""Subject tests — 4 cases."""

def test_list_subjects(api, admin):
    r = api.get("/api/v1/subjects", token=admin["token"])
    assert r.status_code == 200
    subjects = r.json()
    assert isinstance(subjects, list)
    assert len(subjects) >= 2  # Maths + French at minimum

def test_subjects_teacher(api, teacher):
    r = api.get("/api/v1/subjects", token=teacher["token"])
    assert r.status_code == 200

def test_subjects_no_auth(api):
    r = api.get("/api/v1/subjects")
    assert r.status_code in (401, 403)

def test_subjects_cross_tenant(api, admin, enterprise_hr):
    s1 = api.get("/api/v1/subjects", token=admin["token"]).json()
    s2 = api.get("/api/v1/subjects", token=enterprise_hr["token"]).json()
    if isinstance(s1, list) and isinstance(s2, list):
        ids1 = {s.get("id") for s in s1}
        ids2 = {s.get("id") for s in s2}
        assert ids1.isdisjoint(ids2)
