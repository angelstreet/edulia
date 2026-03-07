"""Replay Mode tests (Feature 6) — HTTP integration tests.

Tests run against the live demo instance with seeded data.
Fixtures (api, admin, teacher, teacher_dubois, student, student_lucas) come from conftest.py.

Seeded assumptions (same as Feature 1–5 suites):
  - teacher       → prof.martin@demo.edulia.io  (role: teacher, tenant A)
  - teacher_dubois→ prof.dubois@demo.edulia.io  (role: teacher, may be different tenant)
  - student       → emma.leroy@demo.edulia.io   (role: student)

Each test that creates sessions also creates (and publishes) a fresh activity, then
cleans up both resources afterward. Timestamps are appended to titles so parallel
runs never collide.

Acceptance criteria being verified (Feature 6):
  - Teacher can enable replay mode on a finished session
  - Enabling replay accepts an optional deadline
  - Replay cannot be enabled on a lobby (non-finished) session
  - Only the owning teacher can enable replay (student/unauthenticated are rejected)
  - Student can submit replay answers and receives a score
  - Student cannot replay when replay is not enabled
  - Student cannot replay after the deadline has passed
  - Student can fetch their own replay result
  - Teacher cannot submit replay answers (403)
  - Submitting replay a second time is idempotent (returns existing result)
"""

import uuid
import time
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_title(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"


def _minimal_activity(title: str | None = None) -> dict:
    """Return the smallest valid ActivityCreate payload with one QCM question."""
    return {
        "title": title or _unique_title("ReplayActivity"),
        "type": "qcm",
        "questions": [
            {
                "text": "What is 2 + 2?",
                "type": "single",
                "choices": [
                    {"text": "3", "is_correct": False},
                    {"text": "4", "is_correct": True},
                    {"text": "5", "is_correct": False},
                    {"text": "6", "is_correct": False},
                ],
                "time_limit_s": 30,
                "points": 1,
            }
        ],
    }


def _create_and_publish(api, teacher: dict, title: str | None = None) -> dict:
    """Create and publish an activity; return the response JSON."""
    payload = _minimal_activity(title=title or _unique_title("ReplayAct"))
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


def _create_session_and_finish(api, teacher: dict, activity_id: str) -> str:
    """Create a session, finish it immediately, and return the join_code."""
    create_r = api.post(
        "/api/v1/sessions",
        token=teacher["token"],
        json={"activity_id": activity_id},
    )
    assert create_r.status_code == 201, f"Failed to create session: {create_r.text}"
    join_code = create_r.json()["join_code"]

    finish_r = api.post(
        f"/api/v1/sessions/{join_code}/finish",
        token=teacher["token"],
    )
    assert finish_r.status_code in (200, 204), (
        f"Failed to finish session: {finish_r.status_code}: {finish_r.text}"
    )
    return join_code


def _cleanup_activity(api, teacher: dict, activity_id: str) -> None:
    """Best-effort cleanup; ignore errors (published activities may reject delete)."""
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


# ---------------------------------------------------------------------------
# 1. Teacher can enable replay
# ---------------------------------------------------------------------------

def test_teacher_can_enable_replay(api, teacher):
    """Create finished session → PATCH /replay as teacher → 200, replay_open=True."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True},
        )
        assert r.status_code == 200, (
            f"Expected 200 when teacher enables replay, got {r.status_code}: {r.text}"
        )
        data = r.json()
        assert data.get("replay_open") is True, (
            f"Expected replay_open=True in response, got: {data.get('replay_open')!r}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 2. Enable replay sets deadline
# ---------------------------------------------------------------------------

def test_enable_replay_sets_deadline(api, teacher):
    """PATCH /replay with replay_deadline → response (or GET) shows replay_deadline not null."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        deadline = "2030-12-31T23:59:59"
        r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True, "replay_deadline": deadline},
        )
        assert r.status_code == 200, (
            f"Expected 200 when enabling replay with deadline, got {r.status_code}: {r.text}"
        )

        # Check deadline in PATCH response, or fall back to GET
        data = r.json()
        if "replay_deadline" in data:
            assert data["replay_deadline"] is not None, (
                "Expected replay_deadline to be set in PATCH response, got None"
            )
        else:
            get_r = api.get(f"/api/v1/sessions/{join_code}", token=teacher["token"])
            assert get_r.status_code == 200, (
                f"Expected 200 from GET session, got {get_r.status_code}: {get_r.text}"
            )
            get_data = get_r.json()
            assert get_data.get("replay_deadline") is not None, (
                f"Expected replay_deadline to be set after PATCH, got: {get_data.get('replay_deadline')!r}"
            )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 3. Cannot enable replay on lobby session
# ---------------------------------------------------------------------------

def test_cannot_enable_replay_on_lobby_session(api, teacher):
    """Create session (do NOT finish) → PATCH /replay → 400."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]
    join_code = None

    try:
        create_r = api.post(
            "/api/v1/sessions",
            token=teacher["token"],
            json={"activity_id": activity_id},
        )
        assert create_r.status_code == 201, f"Failed to create session: {create_r.text}"
        join_code = create_r.json()["join_code"]

        r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True},
        )
        assert r.status_code == 400, (
            f"Expected 400 when enabling replay on a lobby session, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        if join_code:
            api.post(f"/api/v1/sessions/{join_code}/finish", token=teacher["token"])
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 4. Student cannot enable replay
# ---------------------------------------------------------------------------

def test_student_cannot_enable_replay(api, teacher, student):
    """Finish session → PATCH /replay as student → 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=student["token"],
            json={"replay_open": True},
        )
        assert r.status_code == 403, (
            f"Expected 403 when student tries to enable replay, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 5. Unauthenticated cannot enable replay
# ---------------------------------------------------------------------------

def test_unauthenticated_cannot_enable_replay(api, teacher):
    """Finish session → PATCH /replay without token → 401 or 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            json={"replay_open": True},
        )  # no token
        assert r.status_code in (401, 403), (
            f"Expected 401 or 403 for unauthenticated replay enable, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 6. Student can submit replay
# ---------------------------------------------------------------------------

def test_student_can_submit_replay(api, teacher, student):
    """Finish session, enable replay, student POST /replay/attempt → 200 or 201 with score."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        enable_r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True},
        )
        assert enable_r.status_code == 200, (
            f"Failed to enable replay: {enable_r.status_code}: {enable_r.text}"
        )

        r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
            json={"answers": [{"question_index": 0, "selected_ids": []}]},
        )
        assert r.status_code in (200, 201), (
            f"Expected 200 or 201 when student submits replay attempt, "
            f"got {r.status_code}: {r.text}"
        )
        data = r.json()
        assert "score" in data, (
            f"Expected 'score' field in replay attempt response, got keys: {list(data.keys())}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 7. Replay attempt response has score and max_score
# ---------------------------------------------------------------------------

def test_replay_attempt_response_has_score(api, teacher, student):
    """Replay attempt response must include a non-None score and max_score."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        enable_r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True},
        )
        assert enable_r.status_code == 200, (
            f"Failed to enable replay: {enable_r.status_code}: {enable_r.text}"
        )

        r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
            json={"answers": [{"question_index": 0, "selected_ids": []}]},
        )
        assert r.status_code in (200, 201), (
            f"Expected 200 or 201 for replay attempt, got {r.status_code}: {r.text}"
        )
        data = r.json()

        assert "score" in data, (
            f"Expected 'score' in replay attempt response, got keys: {list(data.keys())}"
        )
        assert data["score"] is not None, (
            f"Expected score to be not None, got: {data['score']!r}"
        )
        assert "max_score" in data, (
            f"Expected 'max_score' in replay attempt response, got keys: {list(data.keys())}"
        )
        assert data["max_score"] is not None, (
            f"Expected max_score to be not None, got: {data['max_score']!r}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 8. Student cannot replay when closed
# ---------------------------------------------------------------------------

def test_student_cannot_replay_when_closed(api, teacher, student):
    """Finish session, do NOT enable replay → student POST /replay/attempt → 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        # Replay is NOT enabled — attempt should be rejected
        r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
            json={"answers": [{"question_index": 0, "selected_ids": []}]},
        )
        assert r.status_code == 403, (
            f"Expected 403 when student submits replay on a non-enabled session, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 9. Student cannot replay after deadline
# ---------------------------------------------------------------------------

def test_student_cannot_replay_after_deadline(api, teacher, student):
    """Enable replay with past deadline → student POST /replay/attempt → 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        # Set a deadline far in the past
        past_deadline = "2020-01-01T00:00:00"
        enable_r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True, "replay_deadline": past_deadline},
        )
        assert enable_r.status_code == 200, (
            f"Failed to enable replay with past deadline: {enable_r.status_code}: {enable_r.text}"
        )

        r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
            json={"answers": [{"question_index": 0, "selected_ids": []}]},
        )
        assert r.status_code == 403, (
            f"Expected 403 when student submits replay after deadline, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 10. Student can get replay result
# ---------------------------------------------------------------------------

def test_student_can_get_replay_result(api, teacher, student):
    """Submit replay → GET /replay/attempt → 200 with score."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        enable_r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True},
        )
        assert enable_r.status_code == 200, (
            f"Failed to enable replay: {enable_r.status_code}: {enable_r.text}"
        )

        post_r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
            json={"answers": [{"question_index": 0, "selected_ids": []}]},
        )
        assert post_r.status_code in (200, 201), (
            f"Expected 200 or 201 for replay submit, got {post_r.status_code}: {post_r.text}"
        )

        get_r = api.get(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
        )
        assert get_r.status_code == 200, (
            f"Expected 200 when fetching replay result, got {get_r.status_code}: {get_r.text}"
        )
        data = get_r.json()
        assert "score" in data, (
            f"Expected 'score' in GET replay/attempt response, got keys: {list(data.keys())}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 11. Teacher cannot submit replay
# ---------------------------------------------------------------------------

def test_teacher_cannot_submit_replay(api, teacher):
    """Finish session, enable replay → teacher POST /replay/attempt → 403."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        enable_r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True},
        )
        assert enable_r.status_code == 200, (
            f"Failed to enable replay: {enable_r.status_code}: {enable_r.text}"
        )

        r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=teacher["token"],
            json={"answers": [{"question_index": 0, "selected_ids": []}]},
        )
        assert r.status_code == 403, (
            f"Expected 403 when teacher tries to submit a replay attempt, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 12. Second replay submission returns existing result (idempotent)
# ---------------------------------------------------------------------------

def test_second_replay_returns_existing_result(api, teacher, student):
    """Submit replay once, submit again → 200 (not 409), same score returned."""
    activity = _create_and_publish(api, teacher)
    activity_id = activity["id"]

    try:
        join_code = _create_session_and_finish(api, teacher, activity_id)

        enable_r = api.patch(
            f"/api/v1/sessions/{join_code}/replay",
            token=teacher["token"],
            json={"replay_open": True},
        )
        assert enable_r.status_code == 200, (
            f"Failed to enable replay: {enable_r.status_code}: {enable_r.text}"
        )

        payload = {"answers": [{"question_index": 0, "selected_ids": []}]}

        first_r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
            json=payload,
        )
        assert first_r.status_code in (200, 201), (
            f"Expected 200 or 201 on first replay submit, got {first_r.status_code}: {first_r.text}"
        )
        first_score = first_r.json().get("score")

        second_r = api.post(
            f"/api/v1/sessions/{join_code}/replay/attempt",
            token=student["token"],
            json=payload,
        )
        assert second_r.status_code == 200, (
            f"Expected 200 (idempotent) on second replay submit, "
            f"got {second_r.status_code}: {second_r.text}"
        )
        second_score = second_r.json().get("score")

        assert first_score == second_score, (
            f"Expected the same score on duplicate replay submission, "
            f"got first={first_score!r}, second={second_score!r}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Skipped stubs — require seeded live session flow
# ---------------------------------------------------------------------------

@pytest.mark.skip(reason="Requires seeded live session flow — run manually")
def test_replay_page_accessible_after_live_session(): pass


@pytest.mark.skip(reason="Requires seeded live session flow — run manually")
def test_replay_scores_match_live_session_questions(): pass
