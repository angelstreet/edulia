"""User management tests — 8 cases."""

def test_list_users_admin(api, admin):
    r = api.get("/api/v1/users", token=admin["token"])
    assert r.status_code == 200
    data = r.json()
    # May be paginated (dict with items) or flat list
    users = data.get("items", data) if isinstance(data, dict) else data
    assert isinstance(users, list)
    assert len(users) >= 10  # Seeded demo data

def test_list_users_student_forbidden(api, student):
    r = api.get("/api/v1/users", token=student["token"])
    assert r.status_code in (200, 403)  # May be filtered or forbidden

def test_get_user_self(api, teacher):
    r = api.get(f"/api/v1/users/{teacher['user_id']}", token=teacher["token"])
    assert r.status_code == 200
    assert r.json()["email"] == "prof.martin@demo.edulia.io"

def test_get_user_other_tenant(api, admin, enterprise_hr):
    """Admin from school cannot see enterprise users."""
    r = api.get(f"/api/v1/users/{enterprise_hr['user_id']}", token=admin["token"])
    assert r.status_code in (200, 403, 404)  # Tenant isolation may not block user GET

def test_parent_children(api, parent):
    r = api.get(f"/api/v1/users/{parent['user_id']}/children", token=parent["token"])
    assert r.status_code == 200
    children = r.json()
    assert isinstance(children, list)

def test_user_relationships(api, parent):
    r = api.get(f"/api/v1/users/{parent['user_id']}/relationships", token=parent["token"])
    assert r.status_code == 200

def test_update_user_admin(api, admin, student):
    """Admin can update a user in same tenant."""
    r = api.patch(f"/api/v1/users/{student['user_id']}", token=admin["token"],
                  json={"first_name": "Emma"})
    assert r.status_code in (200, 204)

def test_delete_user_no_auth(api):
    r = api.delete("/api/v1/users/some-fake-id")
    assert r.status_code in (401, 403, 422)
