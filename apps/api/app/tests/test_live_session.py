"""Live Session Infrastructure tests (Feature 4) — HTTP integration tests.

Tests run against the live demo instance with seeded data.
Fixtures (api, admin, teacher, teacher_dubois, student) come from conftest.py.

Seeded assumptions (same as Feature 1–3 suites):
  - teacher       → prof.martin@demo.edulia.io  (role: teacher, tenant A)
  - teacher_dubois→ prof.dubois@demo.edulia.io  (role: teacher, may be different tenant)
  - student       → emma.leroy@demo.edulia.io   (role: student)

Each test that creates sessions also creates (and publishes) a fresh activity, then
cleans up both resources afterward. Timestamps are appended to titles so parallel
runs never collide.

WebSocket tests are all marked @pytest.mark.skip — WS testing requires a running
server with Redis pub/sub, which is not available in CI.

Acceptance criteria being verified (Feature 4):
  - Teacher creates session → 6-char join code generated
  - Student can look up session state via join code
  - State starts as 'lobby'
  - Only the owning teacher can finish a session
  - Draft activities cannot spawn sessions
"""

import re
import uuid
import time
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_title(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"


def _minimal_activity(title: str | None = None, group_id: str | None = None) -> dict:
    """Return the smallest valid ActivityCreate payload."""
    return {
        "title": title or _unique_title("SessionActivity"),
        "type": "qcm",
        "questions": [
            {
                "text": "What is 1 + 1?",
                "type": "single",
                "choices": [
                    {"text": "1", "is_correct": False},
                    {"text": "2", "is_correct": True},
                    {"text": "3", "is_correct": False},
                    {"text": "4", "is_correct": False},
                ],
                "time_limit_s": 30,
                "points": 1,
            }
        ],
        **({"group_id": group_id} if group_id else {}),
    }


def _create_and_publish(api, teacher: dict, title: str | None = None) -> dict:
    """Create and publish an activity; return the response JSON."""
    payload = _minimal_activity(title=title or _unique_title("LiveAct"))
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 201, f"Failed to create activity: {r.text}"
    activity_id = r.json()["id"]
    pub = api.patch(
        f"/api/v1/activities/{activity_id}",
        token=teacher["token"],
        json={"status": "published"},
    )
    assert pub.status_code == 200, f"Failed to publish activity: {pub.text}"
    return pub.json()


def _create_draft_activity(api, teacher: dict, title: str | None = None) -> dict:
    """Create a draft activity (not published); return the response JSON."""
    payload = _minimal_activity(title=title or _unique_title("DraftAct"))
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 201, f"Failed to create draft activity: {r.text}"
    data = r.json()
    assert data.get("status") == "draft", (
        f"Activity should default to draft, got status={data.get('status')}"
    )
    return data


def _cleanup_activity(api, teacher: dict, activity_id: str) -> None:
    """Best-effort cleanup; ignore errors (published activities may reject delete)."""
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


def _cleanup_session(api, teacher: dict, join_code: str) -> None:
    """Best-effort session cleanup via finish endpoint; ignore errors."""
    api.post(f"/api/v1/sessions/{join_code}/finish", token=teacher["token"])


_JOIN_CODE_PATTERN = re.compile(r'^[A-Z2-9]{6}$')
# Ambiguous chars excluded: O (letter oh), 0 (zero), I (letter i), 1 (one).
_AMBIGUOUS_CHARS = set('O0I1')


# ---------------------------------------------------------------------------
# 1. Create session — happy path
# ---------------------------------------------------------------------------

def test_teacher_can_create_session(api, teacher):
    """POST /api/v1/sessions as teacher → 201, join_code (6 chars), state='lobby'."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert r.status_code == 201, (
            f"Expected 201 when teacher creates session, got {r.status_code}: {r.text}"
        )
        data = r.json()
        assert "join_code" in data, f"Response must contain 'join_code', got keys: {list(data.keys())}"
        join_code = data["join_code"]
        assert isinstance(join_code, str) and len(join_code) == 6, (
            f"join_code must be a 6-char string, got: {join_code!r}"
        )
        state = data.get("state")
        assert state == "lobby", (
            f"Initial session state must be 'lobby', got: {state!r}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 2. Join code uniqueness
# ---------------------------------------------------------------------------

def test_create_session_generates_unique_join_code(api, teacher):
    """Create 3 sessions for different activities → all join_codes are different."""
    activities = [_create_and_publish(api, teacher) for _ in range(3)]
    activity_ids = [a["id"] for a in activities]
    join_codes = []

    try:
        for activity_id in activity_ids:
            r = api.post(
                "/api/v1/sessions",
                token=teacher["token"],
                json={"activity_id": activity_id},
            )
            assert r.status_code == 201, (
                f"Expected 201 when creating session, got {r.status_code}: {r.text}"
            )
            code = r.json()["join_code"]
            join_codes.append(code)

        # All codes must be exactly 6 characters
        for code in join_codes:
            assert len(code) == 6, f"Expected 6-char join_code, got {code!r}"

        # All codes must be unique
        assert len(set(join_codes)) == 3, (
            f"Expected 3 unique join_codes, got: {join_codes}"
        )
    finally:
        for activity_id in activity_ids:
            _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 3. Join code format
# ---------------------------------------------------------------------------

def test_join_code_format(api, teacher):
    """join_code is 6 chars, uppercase alphanumeric, no ambiguous chars (O, 0, I, 1)."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert r.status_code == 201, r.text
        join_code = r.json()["join_code"]

        assert len(join_code) == 6, (
            f"join_code must be exactly 6 characters, got {len(join_code)!r}: {join_code!r}"
        )
        assert join_code == join_code.upper(), (
            f"join_code must be uppercase, got: {join_code!r}"
        )
        assert join_code.isalnum(), (
            f"join_code must be alphanumeric, got: {join_code!r}"
        )
        for ch in join_code:
            assert ch not in _AMBIGUOUS_CHARS, (
                f"join_code must not contain ambiguous char {ch!r}, got: {join_code!r}"
            )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 4. Student can look up session by join code
# ---------------------------------------------------------------------------

def test_student_can_look_up_session(api, teacher, student):
    """Teacher creates session → GET /api/v1/sessions/{join_code} as student → 200."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        create_r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert create_r.status_code == 201, create_r.text
        join_code = create_r.json()["join_code"]

        r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert r.status_code == 200, (
            f"Expected 200 when student looks up session by join_code, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 5. Case-insensitive join code lookup
# ---------------------------------------------------------------------------

def test_get_session_case_insensitive(api, teacher, student):
    """GET /api/v1/sessions/{lowercase_code} → 200 (lookup is case-insensitive)."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        create_r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert create_r.status_code == 201, create_r.text
        join_code = create_r.json()["join_code"]

        lowercase_code = join_code.lower()
        r = api.get(f"/api/v1/sessions/{lowercase_code}", token=student["token"])
        assert r.status_code == 200, (
            f"Expected 200 for lowercase join_code lookup, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 6. Non-existent join code → 404
# ---------------------------------------------------------------------------

def test_get_session_not_found(api, student):
    """GET /api/v1/sessions/ZZZZZZ → 404."""
    r = api.get("/api/v1/sessions/ZZZZZZ", token=student["token"])
    assert r.status_code == 404, (
        f"Expected 404 for non-existent join code, got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# 7. Auth — unauthenticated cannot create session
# ---------------------------------------------------------------------------

def test_unauthenticated_cannot_create_session(api, teacher):
    """POST /api/v1/sessions without auth → 401 or 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        r = api.post("/api/v1/sessions", json={"activity_id": activity_id})
        assert r.status_code in (401, 403), (
            f"Expected 401 or 403 for unauthenticated session creation, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 8. Auth — student cannot create session
# ---------------------------------------------------------------------------

def test_student_cannot_create_session(api, teacher, student):
    """POST /api/v1/sessions as student → 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        r = api.post(
            "/api/v1/sessions",
            token=student["token"],
            json={"activity_id": activity_id},
        )
        assert r.status_code == 403, (
            f"Expected 403 when student tries to create session, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 9. Teacher can finish a session
# ---------------------------------------------------------------------------

def test_teacher_can_finish_session(api, teacher):
    """POST /api/v1/sessions/{code}/finish as owning teacher → state='finished', ended_at set."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        create_r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert create_r.status_code == 201, create_r.text
        join_code = create_r.json()["join_code"]

        finish_r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=teacher["token"],
        )
        assert finish_r.status_code in (200, 204), (
            f"Expected 200 or 204 when teacher finishes session, "
            f"got {finish_r.status_code}: {finish_r.text}"
        )

        if finish_r.status_code == 200:
            data = finish_r.json()
            assert data.get("state") == "finished", (
                f"Expected state='finished' after finish, got: {data.get('state')!r}"
            )
            assert data.get("ended_at") is not None, (
                "Expected 'ended_at' to be set after finish, got None"
            )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 10. Only the owning teacher can finish a session
# ---------------------------------------------------------------------------

def test_only_teacher_can_finish_session(api, teacher, teacher_dubois):
    """A different teacher cannot finish another teacher's session → 403 or 404."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        create_r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert create_r.status_code == 201, create_r.text
        join_code = create_r.json()["join_code"]

        # teacher_dubois is a different teacher — should be denied
        finish_r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=teacher_dubois["token"],
        )
        assert finish_r.status_code in (403, 404), (
            f"Expected 403 or 404 when a different teacher tries to finish session, "
            f"got {finish_r.status_code}: {finish_r.text}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 11. State after finish
# ---------------------------------------------------------------------------

def test_finished_session_state(api, teacher, student):
    """After finish: GET /api/v1/sessions/{code} → state == 'finished'."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        create_r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert create_r.status_code == 201, create_r.text
        join_code = create_r.json()["join_code"]

        finish_r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=teacher["token"],
        )
        assert finish_r.status_code in (200, 204), (
            f"Expected 200 or 204 from finish endpoint, got {finish_r.status_code}: {finish_r.text}"
        )

        # GET the session and confirm state
        get_r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert get_r.status_code == 200, (
            f"Expected 200 when fetching finished session, got {get_r.status_code}: {get_r.text}"
        )
        assert get_r.json().get("state") == "finished", (
            f"Expected state='finished' after finishing session, got: {get_r.json().get('state')!r}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 12. Draft activity cannot spawn a session
# ---------------------------------------------------------------------------

def test_session_requires_published_activity(api, teacher):
    """POST /api/v1/sessions with a draft (non-published) activity_id → 400 or 422."""
    draft = _create_draft_activity(api, teacher)
    activity_id = draft["id"]

    try:
        r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert r.status_code in (400, 422), (
            f"Expected 400 or 422 when creating session for a draft activity, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 13. Multiple sessions for the same activity
# ---------------------------------------------------------------------------

def test_multiple_sessions_same_activity(api, teacher):
    """Teacher can create multiple sessions for the same activity; each has a unique join_code."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_codes = []

    try:
        for _ in range(2):
            r = api.post(
                "/api/v1/sessions",
                token=teacher["token"],
                json={"activity_id": activity_id},
            )
            assert r.status_code == 201, (
                f"Expected 201 when creating session, got {r.status_code}: {r.text}"
            )
            join_codes.append(r.json()["join_code"])

        assert len(set(join_codes)) == 2, (
            f"Expected 2 unique join_codes for multiple sessions, got: {join_codes}"
        )
    finally:
        for code in join_codes:
            _cleanup_session(api, teacher, code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# WebSocket tests — skipped (require running server + Redis)
# ---------------------------------------------------------------------------

@pytest.mark.skip(reason="Requires running server with Redis — run manually")
def test_ws_student_can_connect():
    """Student connects to /ws/session/{code}?token=... and receives session_state message."""
    # websocket connect to /ws/session/{code}?token=...
    # receive session_state message
    pass


@pytest.mark.skip(reason="Requires running server with Redis — run manually")
def test_ws_teacher_receives_student_joined():
    """Teacher connects to WS, student connects, teacher receives student_joined event."""
    # Teacher connects, student connects
    # Teacher receives student_joined event within 500ms
    pass


@pytest.mark.skip(reason="Requires running server with Redis — run manually")
def test_ws_rejects_invalid_token():
    """Connecting with a bad token causes the server to close the WS connection with code 4001."""
    # Connect with bad token → connection closed with code 4001
    pass
