"""Portfolio tests — 3 cases."""

def test_my_portfolio(api, student):
    r = api.get("/api/v1/portfolio/me", token=student["token"])
    assert r.status_code in (200, 404)  # May not have portfolio yet

def test_public_portfolio_not_found(api):
    r = api.get("/api/v1/portfolio/public/nonexistent-slug-12345")
    assert r.status_code == 404

def test_portfolio_no_auth(api):
    r = api.get("/api/v1/portfolio/me")
    assert r.status_code in (401, 403)
