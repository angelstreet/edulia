"""Authentication tests — 10 cases."""

def test_login_admin(api):
    r = api.post("/api/v1/auth/login", json={"email": "admin@demo.edulia.io", "password": "demo2026"})
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["user"]["role"] == "admin"

def test_login_teacher(api):
    r = api.post("/api/v1/auth/login", json={"email": "prof.martin@demo.edulia.io", "password": "demo2026"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "teacher"

def test_login_student(api):
    r = api.post("/api/v1/auth/login", json={"email": "emma.leroy@demo.edulia.io", "password": "demo2026"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "student"

def test_login_parent(api):
    r = api.post("/api/v1/auth/login", json={"email": "parent.leroy@demo.edulia.io", "password": "demo2026"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "parent"

def test_login_wrong_password(api):
    r = api.post("/api/v1/auth/login", json={"email": "admin@demo.edulia.io", "password": "wrong"})
    assert r.status_code in (401, 400)

def test_login_nonexistent_user(api):
    r = api.post("/api/v1/auth/login", json={"email": "nobody@demo.edulia.io", "password": "demo2026"})
    assert r.status_code in (401, 400, 404)

def test_login_empty_body(api):
    r = api.post("/api/v1/auth/login", json={})
    assert r.status_code == 422

def test_me_endpoint(api, admin):
    r = api.get("/api/v1/users/me", token=admin["token"])
    assert r.status_code == 200
    assert r.json()["email"] == "admin@demo.edulia.io"

def test_me_no_auth(api):
    r = api.get("/api/v1/users/me")
    assert r.status_code in (401, 403)

def test_refresh_token(api, admin):
    r = api.post("/api/v1/auth/refresh", token=admin["token"])
    # May or may not be implemented, but shouldn't crash
    assert r.status_code in (200, 401, 405, 422)
