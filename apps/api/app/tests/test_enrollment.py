"""Enrollment Module — 10 HTTP integration tests.

Tests the enrollment endpoints:
    POST   /api/v1/enrollment
    GET    /api/v1/enrollment/my
    GET    /api/v1/enrollment         (admin)
    GET    /api/v1/enrollment/{id}    (admin)
    PATCH  /api/v1/enrollment/{id}/review

Acceptance criteria verified:
  - Logged-in user can submit an enrollment → 201, id + status="pending" + child fields
  - Unauthenticated POST → 401 or 403
  - GET /my returns the list of the caller's enrollments
  - Admin can list all enrollment requests
  - Non-admin cannot list all requests → 403
  - Admin can set status to "reviewing"
  - Admin can approve → status="approved", student_user_id not null
  - Invalid status value → 400 or 422
  - Admin can GET a single request by id
  - Non-admin cannot GET a single admin-scoped request → 403

Fixtures (api, admin, student, parent) come from conftest.py.
Admin credentials are resolved via the `admin` fixture; tests that need admin
are skipped gracefully if the fixture login fails.
"""

import uuid
import time
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_suffix() -> str:
    """Return an 8-char unique suffix combining timestamp and uuid."""
    return f"{uuid.uuid4().hex[:8]}"


def _enrollment_payload(suffix: str | None = None) -> dict:
    """Return a minimal enrollment request payload with a unique child name."""
    s = suffix or _unique_suffix()
    return {
        "child_first_name": f"Enfant-{s}",
        "child_last_name": f"Test-{s}",
        "child_date_of_birth": "2015-06-15",
        "parent_first_name": "Parent",
        "parent_last_name": f"TestFamily-{s}",
        "parent_email": f"parent-{s}@test-enrollment.io",
        "parent_phone": "+33600000000",
        "desired_grade": "CP",
        "message": f"Integration test enrollment — suffix {s}",
    }


def _create_enrollment(api, token: str) -> dict:
    """POST a fresh enrollment and return the response JSON.

    Asserts 201; callers should use this for setup in admin-scoped tests.
    """
    payload = _enrollment_payload()
    r = api.post("/api/v1/enrollment", token=token, json=payload)
    assert r.status_code == 201, (
        f"Expected 201 creating enrollment, got {r.status_code}: {r.text}"
    )
    return r.json()


# ---------------------------------------------------------------------------
# Test 1 — Parent/user can submit an enrollment request
# ---------------------------------------------------------------------------

def test_parent_can_submit_enrollment(api, parent):
    """POST /api/v1/enrollment as logged-in user → 201.

    Response must have: id, status="pending", child first/last name fields.
    """
    payload = _enrollment_payload()
    r = api.post("/api/v1/enrollment", token=parent["token"], json=payload)
    assert r.status_code == 201, (
        f"Expected 201 when parent submits enrollment, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert "id" in data, f"Response must contain 'id', got keys: {list(data.keys())}"
    assert data.get("status") == "pending", (
        f"Expected status='pending' on new enrollment, got: {data.get('status')}"
    )
    # Child fields must be present
    assert data.get("child_first_name") or data.get("child", {}).get("first_name") or \
           "child_first_name" in data or "child" in data, (
        f"Response must contain child name fields, got keys: {list(data.keys())}"
    )


# ---------------------------------------------------------------------------
# Test 2 — Unauthenticated POST → 401 or 403
# ---------------------------------------------------------------------------

def test_enrollment_requires_auth(api):
    """POST /api/v1/enrollment without a token → 401 or 403."""
    payload = _enrollment_payload()
    r = api.post("/api/v1/enrollment", json=payload)
    assert r.status_code in (401, 403), (
        f"Expected 401 or 403 when posting enrollment without auth, "
        f"got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 3 — Authenticated user can GET their own enrollment list
# ---------------------------------------------------------------------------

def test_my_enrollments_returns_list(api, parent):
    """GET /api/v1/enrollment/my → 200, list that includes submitted enrollment."""
    # Ensure at least one enrollment exists for this user
    created = _create_enrollment(api, parent["token"])
    created_id = str(created["id"])

    r = api.get("/api/v1/enrollment/my", token=parent["token"])
    assert r.status_code == 200, (
        f"Expected 200 from GET /enrollment/my, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert isinstance(data, list), (
        f"Expected a list from GET /enrollment/my, got: {type(data)}"
    )
    ids = [str(item.get("id")) for item in data]
    assert created_id in ids, (
        f"Newly created enrollment {created_id} not found in /enrollment/my list. "
        f"IDs returned: {ids}"
    )


# ---------------------------------------------------------------------------
# Test 4 — Admin can list all enrollment requests
# ---------------------------------------------------------------------------

def test_admin_can_list_all_requests(api, admin):
    """GET /api/v1/enrollment as admin → 200, returns a list."""
    r = api.get("/api/v1/enrollment", token=admin["token"])
    assert r.status_code == 200, (
        f"Expected 200 when admin lists all enrollments, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert isinstance(data, list), (
        f"Expected a list from admin GET /enrollment, got: {type(data)}"
    )


# ---------------------------------------------------------------------------
# Test 5 — Non-admin cannot list all enrollment requests
# ---------------------------------------------------------------------------

def test_non_admin_cannot_list_all(api, student):
    """GET /api/v1/enrollment as non-admin student → 403."""
    r = api.get("/api/v1/enrollment", token=student["token"])
    assert r.status_code == 403, (
        f"Expected 403 when student lists all enrollments, got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 6 — Admin can set status to "reviewing"
# ---------------------------------------------------------------------------

def test_admin_can_set_reviewing(api, parent, admin):
    """PATCH /api/v1/enrollment/{id}/review with status="reviewing" → 200, status updated."""
    enrollment = _create_enrollment(api, parent["token"])
    enrollment_id = enrollment["id"]

    r = api.patch(
        f"/api/v1/enrollment/{enrollment_id}/review",
        token=admin["token"],
        json={"status": "reviewing"},
    )
    assert r.status_code == 200, (
        f"Expected 200 when admin sets enrollment to reviewing, "
        f"got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert data.get("status") == "reviewing", (
        f"Expected status='reviewing' after PATCH, got: {data.get('status')}"
    )


# ---------------------------------------------------------------------------
# Test 7 — Admin can approve an enrollment
# ---------------------------------------------------------------------------

def test_admin_can_approve(api, parent, admin):
    """PATCH /api/v1/enrollment/{id}/review with status="approved" → 200.

    After approval: status="approved" and student_user_id is not null.
    """
    enrollment = _create_enrollment(api, parent["token"])
    enrollment_id = enrollment["id"]

    r = api.patch(
        f"/api/v1/enrollment/{enrollment_id}/review",
        token=admin["token"],
        json={"status": "approved"},
    )
    assert r.status_code == 200, (
        f"Expected 200 when admin approves enrollment, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert data.get("status") == "approved", (
        f"Expected status='approved' after approval PATCH, got: {data.get('status')}"
    )
    # student_user_id must be populated after approval
    student_user_id = data.get("student_user_id") or data.get("student", {}).get("id")
    assert student_user_id is not None, (
        f"Expected student_user_id to be non-null after approval. "
        f"Response keys: {list(data.keys())}, full data: {data}"
    )


# ---------------------------------------------------------------------------
# Test 8 — Invalid status value → 400 or 422
# ---------------------------------------------------------------------------

def test_invalid_status_rejected(api, parent, admin):
    """PATCH /api/v1/enrollment/{id}/review with invalid status → 400 or 422."""
    enrollment = _create_enrollment(api, parent["token"])
    enrollment_id = enrollment["id"]

    r = api.patch(
        f"/api/v1/enrollment/{enrollment_id}/review",
        token=admin["token"],
        json={"status": "invalid_value"},
    )
    assert r.status_code in (400, 422), (
        f"Expected 400 or 422 for invalid status value, got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 9 — Admin can GET a single enrollment request by id
# ---------------------------------------------------------------------------

def test_get_single_request_admin(api, parent, admin):
    """GET /api/v1/enrollment/{id} as admin → 200, id matches."""
    enrollment = _create_enrollment(api, parent["token"])
    enrollment_id = str(enrollment["id"])

    r = api.get(f"/api/v1/enrollment/{enrollment_id}", token=admin["token"])
    assert r.status_code == 200, (
        f"Expected 200 when admin GETs single enrollment, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert str(data.get("id")) == enrollment_id, (
        f"Expected id={enrollment_id} in response, got id={data.get('id')}"
    )


# ---------------------------------------------------------------------------
# Test 10 — Non-admin cannot GET a single admin-scoped enrollment request
# ---------------------------------------------------------------------------

def test_non_admin_cannot_get_request(api, parent, admin, student):
    """GET /api/v1/enrollment/{id} as student → 403."""
    enrollment = _create_enrollment(api, parent["token"])
    enrollment_id = str(enrollment["id"])

    r = api.get(f"/api/v1/enrollment/{enrollment_id}", token=student["token"])
    assert r.status_code == 403, (
        f"Expected 403 when student GETs admin-scoped enrollment detail, "
        f"got {r.status_code}: {r.text}"
    )
