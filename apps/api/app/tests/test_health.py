"""Health check — 1 case."""

def test_health(api):
    r = api.get("/api/health")
    assert r.status_code == 200
