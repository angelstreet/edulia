"""Live QCM Real-Time tests (Feature 5) — HTTP integration tests.

Tests run against the live demo instance with seeded data.
Fixtures (api, admin, teacher, teacher_dubois, student, student_lucas) come from conftest.py.

Seeded assumptions (same as Feature 1–4 suites):
  - teacher       → prof.martin@demo.edulia.io  (role: teacher, tenant A)
  - teacher_dubois→ prof.dubois@demo.edulia.io  (role: teacher, may be different tenant)
  - student       → emma.leroy@demo.edulia.io   (role: student)
  - student_lucas → lucas.moreau@demo.edulia.io (role: student)

Each test that creates sessions also creates (and publishes) a fresh activity, then
cleans up both resources afterward. Timestamps are appended to titles so parallel
runs never collide.

WebSocket tests are all marked @pytest.mark.skip — WS testing requires a running
server with Redis pub/sub, which is not available in CI.

Acceptance criteria being verified (Feature 5):
  - Session starts in lobby state
  - GET session response has the expected shape (id, join_code, state, etc.)
  - Finished session has ended_at set
  - Students cannot finish sessions (403)
  - Unauthenticated users cannot look up sessions (401 or 403)
  - Draft/unpublished activities cannot spawn sessions (400 or 422)
  - Published activity with questions produces a valid 6-char join code
  - Join code uses only unambiguous characters
  - Students can look up sessions in lobby state
  - Multiple students can look up the same session simultaneously
  - Finishing a session sets ended_at on the GET response
  - Double-finishing a session does not crash the server
"""

import re
import uuid
import time
import pytest


# ---------------------------------------------------------------------------
# Helpers (mirrored from Feature 4 suite for isolation)
# ---------------------------------------------------------------------------

def _unique_title(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"


def _minimal_activity_with_questions(title: str | None = None) -> dict:
    """Return the smallest valid published-ready ActivityCreate payload with one question."""
    return {
        "title": title or _unique_title("QCMAct"),
        "type": "qcm",
        "questions": [
            {
                "text": "Which planet is closest to the Sun?",
                "type": "single",
                "choices": [
                    {"text": "Venus",   "is_correct": False},
                    {"text": "Mercury", "is_correct": True},
                    {"text": "Earth",   "is_correct": False},
                    {"text": "Mars",    "is_correct": False},
                ],
                "time_limit_s": 30,
                "points": 1,
            }
        ],
    }


def _create_and_publish(api, teacher: dict, title: str | None = None) -> dict:
    """Create and publish an activity; return the response JSON."""
    payload = _minimal_activity_with_questions(title=title or _unique_title("LiveQCMAct"))
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
    payload = _minimal_activity_with_questions(title=title or _unique_title("DraftQCMAct"))
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 201, f"Failed to create draft activity: {r.text}"
    data = r.json()
    assert data.get("status") == "draft", (
        f"Activity should default to draft, got status={data.get('status')}"
    )
    return data


def _create_session(api, teacher: dict, activity_id: str) -> str:
    """Create a session and return its join_code."""
    r = api.post(
        "/api/v1/sessions",
        token=teacher["token"],
        json={"activity_id": activity_id},
    )
    assert r.status_code == 201, f"Failed to create session: {r.text}"
    return r.json()["join_code"]


def _cleanup_activity(api, teacher: dict, activity_id: str) -> None:
    """Best-effort cleanup; ignore errors (published activities may reject delete)."""
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


def _cleanup_session(api, teacher: dict, join_code: str) -> None:
    """Best-effort session cleanup via finish endpoint; ignore errors."""
    api.post(f"/api/v1/sessions/{join_code}/finish", token=teacher["token"])


# Ambiguous chars excluded from join codes: O (letter oh), 0 (zero), I (letter i), 1 (one).
_JOIN_CODE_PATTERN = re.compile(r'^[A-Z2-9]{6}$')
_AMBIGUOUS_CHARS = set('O0I1')


# ---------------------------------------------------------------------------
# 1. Session starts in lobby state
# ---------------------------------------------------------------------------

def test_session_starts_in_lobby_state(api, teacher, student):
    """Create session → GET /api/v1/sessions/{code} as student → state is 'lobby'."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert r.status_code == 200, (
            f"Expected 200 when student fetches new session, got {r.status_code}: {r.text}"
        )
        state = r.json().get("state")
        assert state == "lobby", (
            f"Expected initial session state to be 'lobby', got: {state!r}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 2. Session state response shape
# ---------------------------------------------------------------------------

def test_session_state_response_shape(api, teacher, student):
    """GET session response must contain: id, join_code, state, current_question_index, activity_id."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert r.status_code == 200, (
            f"Expected 200 when fetching session shape, got {r.status_code}: {r.text}"
        )
        data = r.json()

        required_keys = {"id", "join_code", "state", "current_question_index", "activity_id"}
        missing = required_keys - set(data.keys())
        assert not missing, (
            f"Session response is missing required fields: {missing}. Got keys: {list(data.keys())}"
        )

        assert data["join_code"] == join_code.upper(), (
            f"join_code in response ({data['join_code']!r}) does not match created code ({join_code!r})"
        )
        assert data["activity_id"] == activity_id, (
            f"activity_id in response ({data['activity_id']!r}) does not match ({activity_id!r})"
        )
        assert isinstance(data["current_question_index"], int), (
            f"current_question_index must be an integer, got: {type(data['current_question_index'])}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 3. Finished session has ended_at set and state is 'finished'
# ---------------------------------------------------------------------------

def test_session_finished_state_has_ended_at(api, teacher, student):
    """Create session, finish it → GET → ended_at is not null, state is 'finished'."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        finish_r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=teacher["token"],
        )
        assert finish_r.status_code in (200, 204), (
            f"Expected 200 or 204 when finishing session, got {finish_r.status_code}: {finish_r.text}"
        )

        get_r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert get_r.status_code == 200, (
            f"Expected 200 when fetching finished session, got {get_r.status_code}: {get_r.text}"
        )
        data = get_r.json()

        assert data.get("state") == "finished", (
            f"Expected state='finished' after finishing session, got: {data.get('state')!r}"
        )
        assert data.get("ended_at") is not None, (
            "Expected 'ended_at' to be set after finish, got None"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 4. Student cannot finish a session
# ---------------------------------------------------------------------------

def test_student_cannot_finish_session(api, teacher, student):
    """POST /api/v1/sessions/{code}/finish as student → 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=student["token"],
        )
        assert r.status_code == 403, (
            f"Expected 403 when student tries to finish session, got {r.status_code}: {r.text}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 5. Unauthenticated cannot look up session
# ---------------------------------------------------------------------------

def test_unauthenticated_cannot_join_session_lookup(api, teacher):
    """GET /api/v1/sessions/{code} without token → 401 or 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        r = api.get(f"/api/v1/sessions/{join_code}")  # no token
        assert r.status_code in (401, 403), (
            f"Expected 401 or 403 for unauthenticated session lookup, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 6. Draft activity cannot spawn a session
# ---------------------------------------------------------------------------

def test_create_session_for_unpublished_activity_returns_error(api, teacher):
    """POST /api/v1/sessions with a draft activity → 400 or 422.

    The activity must have questions to isolate the 'not published' constraint
    from the 'no questions' constraint; both must block session creation.
    """
    draft = _create_draft_activity(api, teacher)
    activity_id = draft["id"]

    try:
        r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert r.status_code in (400, 422), (
            f"Expected 400 or 422 when creating session for draft activity, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 7. Teacher can create session for a published activity with questions
# ---------------------------------------------------------------------------

def test_teacher_can_create_session_for_published_activity_with_questions(api, teacher):
    """Published activity with questions → POST /api/v1/sessions → 201, join_code present."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert r.status_code == 201, (
            f"Expected 201 when teacher creates session for published activity with questions, "
            f"got {r.status_code}: {r.text}"
        )
        data = r.json()
        assert "join_code" in data, (
            f"Response must contain 'join_code', got keys: {list(data.keys())}"
        )
        join_code = data["join_code"]
        assert join_code, "join_code must not be empty"
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 8. Join code is 6 chars with no ambiguous characters
# ---------------------------------------------------------------------------

def test_join_code_has_six_chars_and_no_ambiguous(api, teacher):
    """join_code is exactly 6 chars, uppercase alphanumeric, no ambiguous chars (O, 0, I, 1)."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert r.status_code == 201, r.text
        join_code = r.json()["join_code"]

        assert len(join_code) == 6, (
            f"join_code must be exactly 6 characters, got {len(join_code)}: {join_code!r}"
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
        assert _JOIN_CODE_PATTERN.match(join_code), (
            f"join_code must match pattern [A-Z2-9]{{6}}, got: {join_code!r}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 9. Student can look up session in lobby state
# ---------------------------------------------------------------------------

def test_student_can_lookup_session_in_lobby(api, teacher, student):
    """Teacher creates session → GET as student → 200, state='lobby'."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert r.status_code == 200, (
            f"Expected 200 when student looks up session in lobby, "
            f"got {r.status_code}: {r.text}"
        )
        data = r.json()
        assert data.get("state") == "lobby", (
            f"Expected state='lobby' for a freshly created session, got: {data.get('state')!r}"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 10. Multiple students can look up the same session
# ---------------------------------------------------------------------------

def test_multiple_students_can_lookup_same_session(api, teacher, student, student_lucas):
    """Two students GET the same session join_code → both receive 200."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        r_emma = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        r_lucas = api.get(f"/api/v1/sessions/{join_code}", token=student_lucas["token"])

        assert r_emma.status_code == 200, (
            f"Expected 200 for student emma, got {r_emma.status_code}: {r_emma.text}"
        )
        assert r_lucas.status_code == 200, (
            f"Expected 200 for student lucas, got {r_lucas.status_code}: {r_lucas.text}"
        )

        # Both should see the same session state
        assert r_emma.json().get("join_code", "").upper() == join_code.upper(), (
            "Student emma received a different join_code than expected"
        )
        assert r_lucas.json().get("join_code", "").upper() == join_code.upper(), (
            "Student lucas received a different join_code than expected"
        )
    finally:
        if join_code:
            _cleanup_session(api, teacher, join_code)
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 11. Finish session sets ended_at on subsequent GET
# ---------------------------------------------------------------------------

def test_finish_session_sets_ended_at(api, teacher, student):
    """POST /finish → GET session → ended_at is present and not null."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        # Confirm ended_at is absent (or null) before finish
        before_r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert before_r.status_code == 200, before_r.text
        before_data = before_r.json()
        assert before_data.get("ended_at") is None, (
            f"Expected ended_at to be null before finishing, got: {before_data.get('ended_at')!r}"
        )

        finish_r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=teacher["token"],
        )
        assert finish_r.status_code in (200, 204), (
            f"Expected 200 or 204 from finish endpoint, got {finish_r.status_code}: {finish_r.text}"
        )

        after_r = api.get(f"/api/v1/sessions/{join_code}", token=student["token"])
        assert after_r.status_code == 200, (
            f"Expected 200 when fetching finished session, got {after_r.status_code}: {after_r.text}"
        )
        after_data = after_r.json()
        assert after_data.get("ended_at") is not None, (
            "Expected ended_at to be set after finishing session, got None"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 12. Cannot finish already-finished session (no crash)
# ---------------------------------------------------------------------------

def test_cannot_finish_already_finished_session(api, teacher):
    """Finish session twice → second request returns 400 or 200 (no 500 crash)."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        join_code = _create_session(api, teacher, activity_id)

        first_r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=teacher["token"],
        )
        assert first_r.status_code in (200, 204), (
            f"Expected 200 or 204 for first finish, got {first_r.status_code}: {first_r.text}"
        )

        second_r = api.post(
            f"/api/v1/sessions/{join_code}/finish",
            token=teacher["token"],
        )
        # Accept 200 (idempotent) or 400 (already finished), but never a 5xx
        assert second_r.status_code in (200, 204, 400, 409), (
            f"Expected 200, 204, 400, or 409 for duplicate finish, "
            f"got {second_r.status_code}: {second_r.text}"
        )
        assert second_r.status_code < 500, (
            f"Server must not crash on duplicate finish, got {second_r.status_code}: {second_r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# WebSocket tests — skipped (require running server + Redis)
# ---------------------------------------------------------------------------

@pytest.mark.skip(reason="Requires running server with Redis — run manually")
def test_ws_teacher_next_question_broadcasts_question_start():
    """Teacher sends next_question over WS → all connected clients receive question_start."""
    # Connect teacher and one or more students to /ws/session/{code}?token=...
    # Teacher sends: {"type": "next_question"}
    # All clients receive: {"type": "question_start", "question_index": 0, "question": {...}}
    pass


@pytest.mark.skip(reason="Requires running server with Redis — run manually")
def test_ws_student_answer_triggers_answer_update_for_teacher():
    """Student sends answer over WS → teacher receives answer_update broadcast."""
    # Teacher and student connect to /ws/session/{code}?token=...
    # Teacher sends next_question, student receives question_start
    # Student sends: {"type": "answer", "question_index": 0, "selected_ids": [<correct_id>]}
    # Teacher receives: {"type": "answer_update", "question_index": 0, "counts": {...}}
    pass


@pytest.mark.skip(reason="Requires running server with Redis — run manually")
def test_ws_reveal_broadcasts_correct_answers():
    """Teacher sends reveal_question over WS → all clients receive question_reveal with correct answers."""
    # Teacher and students connect to /ws/session/{code}?token=...
    # Teacher sends: {"type": "reveal_question"}
    # All clients receive: {"type": "question_reveal", "question_index": 0, "correct_ids": [...]}
    pass
