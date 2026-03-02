"""Tenant tests — 4 cases."""

def test_get_tenant(api, admin):
    r = api.get("/api/v1/tenant", token=admin["token"])
    assert r.status_code == 200
    assert "name" in r.json()

def test_tenant_settings(api, admin):
    r = api.get("/api/v1/tenant/settings", token=admin["token"])
    assert r.status_code == 200

def test_tenant_no_auth(api):
    r = api.get("/api/v1/tenant")
    assert r.status_code in (401, 403)

def test_tenant_isolation(api, admin, enterprise_hr):
    t1 = api.get("/api/v1/tenant", token=admin["token"]).json()
    t2 = api.get("/api/v1/tenant", token=enterprise_hr["token"]).json()
    assert t1["id"] != t2["id"]
    assert t1["name"] != t2["name"]
