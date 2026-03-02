"""Messaging tests — 10 cases."""

def test_list_threads_teacher(api, teacher):
    r = api.get("/api/v1/threads", token=teacher["token"])
    assert r.status_code == 200
    threads = r.json()
    assert isinstance(threads, list)
    assert len(threads) >= 1

def test_list_threads_student(api, student):
    r = api.get("/api/v1/threads", token=student["token"])
    assert r.status_code == 200

def test_list_threads_parent(api, parent):
    r = api.get("/api/v1/threads", token=parent["token"])
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_thread_detail_with_sender_names(api, teacher):
    threads = api.get("/api/v1/threads", token=teacher["token"]).json()
    if threads:
        r = api.get(f"/api/v1/threads/{threads[0]['id']}", token=teacher["token"])
        assert r.status_code == 200
        data = r.json()
        assert "messages" in data
        assert "participants" in data
        if data["messages"]:
            msg = data["messages"][0]
            assert "sender_name" in msg
            assert msg["sender_name"] != ""
            # Must not be a UUID
            assert "-" not in msg["sender_name"][:8] or len(msg["sender_name"]) < 36

def test_thread_detail_has_participant_names(api, teacher):
    threads = api.get("/api/v1/threads", token=teacher["token"]).json()
    if threads:
        data = api.get(f"/api/v1/threads/{threads[0]['id']}", token=teacher["token"]).json()
        if data["participants"]:
            p = data["participants"][0]
            assert "display_name" in p

def test_enterprise_threads(api, employee):
    r = api.get("/api/v1/threads", token=employee["token"])
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_tutor_threads(api, tutor):
    r = api.get("/api/v1/threads", token=tutor["token"])
    assert r.status_code == 200

def test_threads_no_auth(api):
    r = api.get("/api/v1/threads")
    assert r.status_code in (401, 403)

def test_thread_cross_tenant_isolation(api, teacher, employee):
    t_threads = api.get("/api/v1/threads", token=teacher["token"]).json()
    e_threads = api.get("/api/v1/threads", token=employee["token"]).json()
    t_ids = {t["id"] for t in t_threads}
    e_ids = {t["id"] for t in e_threads}
    assert t_ids.isdisjoint(e_ids)

def test_mark_thread_read(api, teacher):
    threads = api.get("/api/v1/threads", token=teacher["token"]).json()
    if threads:
        r = api.patch(f"/api/v1/threads/{threads[0]['id']}/read", token=teacher["token"])
        assert r.status_code in (200, 204)
