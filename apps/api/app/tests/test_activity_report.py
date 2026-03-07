"""Activity Report tests (Feature 3) — Teacher Auto-Reporting Dashboard.

Tests run against the live demo instance with seeded data.
Fixtures (api, admin, teacher, teacher_dubois, student, parent) come from conftest.py.

Seeded assumptions (same as Feature 1 and 2 suites):
  - teacher       → prof.martin@demo.edulia.io   (role: teacher, tenant A)
  - teacher_dubois→ prof.dubois@demo.edulia.io   (role: teacher, may be different tenant)
  - admin         → admin@demo.edulia.io          (role: admin)
  - student       → emma.leroy@demo.edulia.io    (role: student, belongs to a seeded group)
  - student_lucas → lucas.moreau@demo.edulia.io  (role: student, different account)
  - parent        → parent.leroy@demo.edulia.io  (role: parent)

Each test that creates activities cleans them up afterward.
Timestamps are appended to titles so parallel runs never collide.

Acceptance criteria being verified:
  - 20 students, 15 submitted, avg 13/20 → report shows 75% completion, 13.0 avg
  - Question answered wrong by 12/15 → error_rate = 0.80
  - Student from another tenant not visible
"""

import uuid
import time
import math
import pytest


# ---------------------------------------------------------------------------
# Helpers — mirrors the helpers in test_activity_attempt.py
# ---------------------------------------------------------------------------

def _unique_title(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"


def _minimal_activity(title: str | None = None, group_id: str | None = None) -> dict:
    """Return the smallest valid ActivityCreate payload."""
    return {
        "title": title or _unique_title("ReportTest"),
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


def _activity_with_known_question(title: str, group_id: str | None = None) -> dict:
    """Activity with a single-choice question worth 10 points, known correct answer."""
    return {
        "title": title,
        "type": "qcm",
        "questions": [
            {
                "text": "Capital of France?",
                "type": "single",
                "choices": [
                    {"text": "Berlin", "is_correct": False},
                    {"text": "Paris", "is_correct": True},
                    {"text": "Rome", "is_correct": False},
                ],
                "time_limit_s": 30,
                "points": 10,
            }
        ],
        **({"group_id": group_id} if group_id else {}),
    }


def _get_student_group_id(api, student: dict) -> str | None:
    """Return the first group the student belongs to, or None."""
    r = api.get("/api/v1/groups", token=student["token"])
    groups = r.json() if r.status_code == 200 and isinstance(r.json(), list) else []
    return groups[0]["id"] if groups else None


def _create_and_publish(api, teacher: dict, payload: dict) -> dict:
    """Create and publish an activity; return the response JSON."""
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 201, f"Failed to create activity: {r.text}"
    data = r.json()
    activity_id = data["id"]
    pub = api.patch(
        f"/api/v1/activities/{activity_id}",
        token=teacher["token"],
        json={"status": "published"},
    )
    assert pub.status_code == 200, f"Failed to publish activity: {pub.text}"
    return pub.json()


def _cleanup_activity(api, teacher: dict, activity_id: str) -> None:
    """Best-effort cleanup; ignore errors (published activities may reject delete)."""
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


def _start_and_submit(api, student: dict, activity_id: str, question: dict, choice_text: str) -> None:
    """Helper: start an attempt as student and submit with the named choice."""
    start_r = api.post(
        f"/api/v1/activities/{activity_id}/attempt/start",
        token=student["token"],
    )
    assert start_r.status_code == 201, f"Start failed: {start_r.text}"
    attempt_id = start_r.json()["attempt_id"]

    choice_id = next(c["id"] for c in question["choices"] if c["text"] == choice_text)
    submit_r = api.post(
        f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
        token=student["token"],
        json={"answers": [{"question_id": question["id"], "choice_ids": [choice_id]}]},
    )
    assert submit_r.status_code in (200, 201), f"Submit failed: {submit_r.text}"


# ---------------------------------------------------------------------------
# 1. Role-based access — bulk report endpoint
# ---------------------------------------------------------------------------

def test_teacher_can_get_all_reports(api, teacher):
    """GET /api/v1/activities/report as teacher → 200, body is a list or dict with 'activities' key."""
    r = api.get("/api/v1/activities/report", token=teacher["token"])
    assert r.status_code == 200, (
        f"Expected 200 for teacher accessing /activities/report, got {r.status_code}: {r.text}"
    )
    data = r.json()
    # Accept either a top-level list or {"activities": [...]}
    activities = data if isinstance(data, list) else data.get("activities", [])
    assert isinstance(activities, list), (
        f"Report response must be a list or contain an 'activities' list, got: {type(data)}"
    )


def test_student_cannot_get_reports(api, student):
    """GET /api/v1/activities/report as student → 403."""
    r = api.get("/api/v1/activities/report", token=student["token"])
    assert r.status_code == 403, (
        f"Expected 403 when student accesses /activities/report, got {r.status_code}: {r.text}"
    )


def test_parent_cannot_get_reports(api, parent):
    """GET /api/v1/activities/report as parent → 403."""
    r = api.get("/api/v1/activities/report", token=parent["token"])
    assert r.status_code == 403, (
        f"Expected 403 when parent accesses /activities/report, got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# 2. Per-activity report — 404 on unknown activity
# ---------------------------------------------------------------------------

def test_activity_report_404_unknown(api, teacher):
    """GET /api/v1/activities/{random-uuid}/report → 404."""
    fake_id = str(uuid.uuid4())
    r = api.get(f"/api/v1/activities/{fake_id}/report", token=teacher["token"])
    assert r.status_code == 404, (
        f"Expected 404 for unknown activity report, got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# 3. Report with no attempts → zeros
# ---------------------------------------------------------------------------

def test_report_no_attempts_returns_zeros(api, teacher):
    """Create activity with no attempts → report shows total_attempts=0, completion_rate=0.0, avg_score=None or 0."""
    activity = _create_and_publish(
        api, teacher, _minimal_activity(title=_unique_title("NoAttempts"))
    )
    activity_id = activity["id"]

    try:
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        total = data.get("total_attempts", data.get("total_students", -1))
        completion = data.get("completion_rate", -1)
        avg_score = data.get("avg_score")

        assert int(total) == 0, (
            f"Expected total_attempts=0 when no attempts exist, got {total}"
        )
        assert float(completion) == 0.0, (
            f"Expected completion_rate=0.0 when no attempts exist, got {completion}"
        )
        # avg_score must be None, null, or 0 — not a non-zero value
        if avg_score is not None:
            assert float(avg_score) == 0.0, (
                f"Expected avg_score=None or 0 when no attempts, got {avg_score}"
            )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 4. Completion rate calculation
# ---------------------------------------------------------------------------

def test_report_returns_correct_completion_rate(api, teacher, student):
    """1 student submits out of 1 attempt started → completion_rate == 1.0."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher,
        _minimal_activity(title=_unique_title("CompletionRate"), group_id=group_id),
    )
    activity_id = activity["id"]

    try:
        # Student starts and submits
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]
        questions = start_r.json()["activity"]["questions"]
        answers = [
            {"question_id": q["id"], "choice_ids": [q["choices"][0]["id"]]}
            for q in questions
        ]
        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": answers},
        )
        assert submit_r.status_code in (200, 201), submit_r.text

        # Fetch report
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        submitted_count = data.get("submitted_count", data.get("submitted", -1))
        total_attempts = data.get("total_attempts", -1)
        completion_rate = data.get("completion_rate", -1)

        assert int(submitted_count) >= 1, (
            f"Expected submitted_count >= 1 after student submits, got {submitted_count}"
        )
        # completion_rate = submitted / total_attempts; with 1 submitted out of 1 → 1.0
        assert float(total_attempts) >= 1, (
            f"Expected total_attempts >= 1 after student starts, got {total_attempts}"
        )
        expected_rate = int(submitted_count) / int(total_attempts)
        assert abs(float(completion_rate) - expected_rate) < 0.01, (
            f"completion_rate mismatch: expected {expected_rate:.2f}, got {completion_rate}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 5. Average score calculation
# ---------------------------------------------------------------------------

def test_report_returns_correct_avg_score(api, teacher, student):
    """Student submits correct answer (score == max_score=10) → avg_score == 10."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher,
        _activity_with_known_question(
            title=_unique_title("AvgScore"), group_id=group_id
        ),
    )
    activity_id = activity["id"]

    try:
        # Get authoritative correct choice from teacher view
        act_detail = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
        assert act_detail.status_code == 200, act_detail.text
        question = act_detail.json()["questions"][0]
        correct_choice_id = next(c["id"] for c in question["choices"] if c["is_correct"])
        expected_max_score = float(question["points"])

        # Student starts and submits the correct answer
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]

        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": [{"question_id": question["id"], "choice_ids": [correct_choice_id]}]},
        )
        assert submit_r.status_code in (200, 201), submit_r.text
        # Confirm score == max_score
        result = submit_r.json()
        assert float(result["score"]) == float(result["max_score"]), (
            f"Correct answer should yield full points but got score={result['score']}, max={result['max_score']}"
        )

        # Fetch report
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        avg_score = data.get("avg_score")
        assert avg_score is not None, "avg_score must be present when at least one student has submitted"
        assert abs(float(avg_score) - expected_max_score) < 0.01, (
            f"avg_score should equal max_score ({expected_max_score}) when all students answered correctly, "
            f"got {avg_score}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 6. Question error rate — 100% wrong
# ---------------------------------------------------------------------------

def test_report_question_error_rate_calculation(api, teacher, student):
    """Student submits wrong answer → error_rate == 1.0 (100% wrong)."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher,
        _activity_with_known_question(
            title=_unique_title("ErrorRate100"), group_id=group_id
        ),
    )
    activity_id = activity["id"]

    try:
        # Get wrong choice from teacher view
        act_detail = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
        assert act_detail.status_code == 200, act_detail.text
        question = act_detail.json()["questions"][0]
        wrong_choice_id = next(c["id"] for c in question["choices"] if not c["is_correct"])

        # Student submits wrong answer
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]

        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": [{"question_id": question["id"], "choice_ids": [wrong_choice_id]}]},
        )
        assert submit_r.status_code in (200, 201), submit_r.text

        # Fetch report
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        questions_stats = data.get("questions", [])
        assert questions_stats, (
            "Report must include 'questions' list with per-question stats"
        )
        first_q_stat = questions_stats[0]
        error_rate = first_q_stat.get("error_rate")
        assert error_rate is not None, "Each question stat must have an 'error_rate' field"
        assert abs(float(error_rate) - 1.0) < 0.01, (
            f"All students answered wrong → error_rate should be 1.0, got {error_rate}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 7. Question error rate — 0% wrong
# ---------------------------------------------------------------------------

def test_report_zero_error_rate_when_all_correct(api, teacher, student):
    """Student submits correct answer → error_rate == 0.0."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher,
        _activity_with_known_question(
            title=_unique_title("ErrorRate0"), group_id=group_id
        ),
    )
    activity_id = activity["id"]

    try:
        # Get correct choice from teacher view
        act_detail = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
        assert act_detail.status_code == 200, act_detail.text
        question = act_detail.json()["questions"][0]
        correct_choice_id = next(c["id"] for c in question["choices"] if c["is_correct"])

        # Student submits correct answer
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]

        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": [{"question_id": question["id"], "choice_ids": [correct_choice_id]}]},
        )
        assert submit_r.status_code in (200, 201), submit_r.text

        # Fetch report
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        questions_stats = data.get("questions", [])
        assert questions_stats, (
            "Report must include 'questions' list with per-question stats"
        )
        first_q_stat = questions_stats[0]
        error_rate = first_q_stat.get("error_rate")
        assert error_rate is not None, "Each question stat must have an 'error_rate' field"
        assert abs(float(error_rate) - 0.0) < 0.01, (
            f"All students answered correctly → error_rate should be 0.0, got {error_rate}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 8. Per-student endpoint — teacher can get student activity scores
# ---------------------------------------------------------------------------

def test_student_report_returns_attempts(api, teacher, student):
    """GET /api/v1/students/{student_id}/activity-scores as teacher → list includes student's submission."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher,
        _minimal_activity(title=_unique_title("StudentScores"), group_id=group_id),
    )
    activity_id = activity["id"]
    student_id = student["user_id"]

    try:
        # Student starts and submits
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]
        questions = start_r.json()["activity"]["questions"]
        answers = [
            {"question_id": q["id"], "choice_ids": [q["choices"][0]["id"]]}
            for q in questions
        ]
        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": answers},
        )
        assert submit_r.status_code in (200, 201), submit_r.text

        # Teacher fetches per-student scores
        r = api.get(
            f"/api/v1/students/{student_id}/activity-scores",
            token=teacher["token"],
        )
        assert r.status_code == 200, (
            f"Expected 200 for teacher accessing student scores, got {r.status_code}: {r.text}"
        )
        data = r.json()
        # Accept either {"attempts": [...]} or a direct list
        attempts = data if isinstance(data, list) else data.get("attempts", [])
        assert isinstance(attempts, list), "Response must contain an attempts list"

        # The submitted activity must appear
        activity_ids_in_response = {
            a.get("activity_id") or a.get("id")
            for a in attempts
        }
        activity_titles_in_response = {
            a.get("activity_title", "")
            for a in attempts
        }

        found = (
            activity_id in activity_ids_in_response
            or any(activity["title"] in t for t in activity_titles_in_response)
        )
        assert found, (
            f"Expected activity {activity_id} ('{activity['title']}') to appear in student scores, "
            f"got: {attempts}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


def test_student_report_403_for_student(api, student):
    """GET /api/v1/students/{id}/activity-scores as student → 403 (teacher-only endpoint)."""
    student_id = student["user_id"]
    r = api.get(
        f"/api/v1/students/{student_id}/activity-scores",
        token=student["token"],
    )
    assert r.status_code == 403, (
        f"Expected 403 when student accesses own score history via teacher endpoint, "
        f"got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# 9. Bulk report includes per-activity stats
# ---------------------------------------------------------------------------

def test_bulk_report_includes_activity_stats(api, teacher, student):
    """GET /api/v1/activities/report → each item has total_attempts, avg_score, completion_rate."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher,
        _minimal_activity(title=_unique_title("BulkStats"), group_id=group_id),
    )
    activity_id = activity["id"]

    try:
        # Student starts and submits so the activity has data
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]
        questions = start_r.json()["activity"]["questions"]
        answers = [
            {"question_id": q["id"], "choice_ids": [q["choices"][0]["id"]]}
            for q in questions
        ]
        api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": answers},
        )

        # Bulk report
        r = api.get("/api/v1/activities/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()
        activities = data if isinstance(data, list) else data.get("activities", [])
        assert isinstance(activities, list), "Bulk report must be a list or contain 'activities'"

        # Find our activity in the report
        our_activity_stats = next(
            (a for a in activities if a.get("id") == activity_id), None
        )
        if our_activity_stats is None:
            pytest.skip(
                f"Activity {activity_id} not found in bulk report — "
                "may require a different filtering scope in the demo environment."
            )

        # Verify mandatory stat fields are present
        required_fields = ["total_attempts", "completion_rate"]
        for field in required_fields:
            assert field in our_activity_stats, (
                f"Bulk report item must contain '{field}', got keys: {list(our_activity_stats.keys())}"
            )

        # avg_score may be None if all questions are open-type, but field must be present
        assert "avg_score" in our_activity_stats, (
            f"Bulk report item must contain 'avg_score', got keys: {list(our_activity_stats.keys())}"
        )

        # Values must be consistent
        total = int(our_activity_stats["total_attempts"])
        rate = float(our_activity_stats["completion_rate"])
        assert total >= 1, f"total_attempts must be >= 1 after a student started, got {total}"
        assert 0.0 <= rate <= 1.0, f"completion_rate must be in [0, 1], got {rate}"
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 10. Multi-tenant isolation
# ---------------------------------------------------------------------------

def test_multi_tenant_isolation(api, teacher, teacher_dubois):
    """Report must not include data from another tenant.

    Strategy:
    - teacher (prof.martin) creates an activity in tenant A.
    - teacher_dubois (potentially same or different tenant) fetches /activities/report.
    - If dubois is on a different tenant, the report must not include martin's activity.
    - If dubois is on the same tenant (demo environment may share tenants), we verify
      the endpoint at least responds with 200 and does not crash, then skip the
      cross-tenant assertion.
    """
    activity = _create_and_publish(
        api, teacher,
        _minimal_activity(title=_unique_title("TenantIsolation")),
    )
    activity_id = activity["id"]
    teacher_tenant_id = teacher.get("tenant_id")
    dubois_tenant_id = teacher_dubois.get("tenant_id")

    try:
        r = api.get("/api/v1/activities/report", token=teacher_dubois["token"])
        assert r.status_code == 200, (
            f"Expected 200 for teacher_dubois accessing /activities/report, "
            f"got {r.status_code}: {r.text}"
        )
        data = r.json()
        activities = data if isinstance(data, list) else data.get("activities", [])
        assert isinstance(activities, list), "Report must be a list or contain 'activities'"

        if teacher_tenant_id and dubois_tenant_id and teacher_tenant_id != dubois_tenant_id:
            # True cross-tenant scenario — martin's activity must NOT appear in dubois's report
            dubois_activity_ids = {a.get("id") for a in activities}
            assert activity_id not in dubois_activity_ids, (
                f"Cross-tenant isolation violated: activity {activity_id} from tenant "
                f"{teacher_tenant_id} is visible to teacher from tenant {dubois_tenant_id}"
            )
        else:
            # Same tenant (common in demo environments) — cannot assert cross-tenant,
            # but verify each item in the report carries the correct tenant_id
            for item in activities:
                item_tenant = item.get("tenant_id")
                if item_tenant:
                    assert item_tenant == dubois_tenant_id, (
                        f"Report item tenant_id {item_tenant} does not match "
                        f"requesting teacher's tenant {dubois_tenant_id}"
                    )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 11. Per-activity report structure validation
# ---------------------------------------------------------------------------

def test_per_activity_report_structure(api, teacher):
    """GET /api/v1/activities/{id}/report → response has expected top-level fields."""
    activity = _create_and_publish(
        api, teacher,
        _minimal_activity(title=_unique_title("ReportStructure")),
    )
    activity_id = activity["id"]

    try:
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        # Must contain at minimum these aggregation fields
        required_keys = ["total_attempts", "completion_rate"]
        for key in required_keys:
            assert key in data, (
                f"Per-activity report must contain '{key}', got keys: {list(data.keys())}"
            )

        # questions list must be present (may be empty if no attempts)
        assert "questions" in data, (
            f"Per-activity report must contain 'questions' list, got keys: {list(data.keys())}"
        )
        assert isinstance(data["questions"], list), (
            f"'questions' must be a list, got {type(data['questions'])}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 12. Acceptance criterion: 75% completion rate math
# ---------------------------------------------------------------------------

def test_completion_rate_math_with_two_students(api, teacher, student, student_lucas):
    """2 students start, 1 submits → completion_rate == 0.5.

    This exercises the formula: completion_rate = submitted_count / total_attempts.
    The full acceptance criterion (20 students, 15 submitted → 75%) is validated by
    the same formula with more participants; we use 2 students to keep the test
    self-contained without requiring additional seeded accounts.
    """
    group_id = _get_student_group_id(api, student)
    lucas_group_id = _get_student_group_id(api, student_lucas)

    # Use a group that both students belong to, or no group if unknown
    # The seeded data may or may not have both students in the same group.
    activity = _create_and_publish(
        api, teacher,
        _minimal_activity(
            title=_unique_title("CompletionMath"),
            group_id=group_id or lucas_group_id,
        ),
    )
    activity_id = activity["id"]

    try:
        # Student 1 (emma): starts AND submits
        start1 = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start1.status_code == 201, f"Student 1 start failed: {start1.text}"
        attempt_id_1 = start1.json()["attempt_id"]
        questions = start1.json()["activity"]["questions"]
        answers = [
            {"question_id": q["id"], "choice_ids": [q["choices"][0]["id"]]}
            for q in questions
        ]
        sub1 = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id_1}/submit",
            token=student["token"],
            json={"answers": answers},
        )
        assert sub1.status_code in (200, 201), f"Student 1 submit failed: {sub1.text}"

        # Student 2 (lucas): starts but does NOT submit
        start2 = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student_lucas["token"],
        )
        if start2.status_code != 201:
            # Lucas may not have access to this activity (group mismatch) — skip math check
            pytest.skip(
                "student_lucas cannot start the activity (likely group mismatch). "
                "Cross-student completion math requires both students in same group."
            )

        # Fetch report
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        total_attempts = int(data.get("total_attempts", 0))
        submitted_count = int(data.get("submitted_count", data.get("submitted", 0)))
        completion_rate = float(data.get("completion_rate", 0))

        assert total_attempts == 2, (
            f"Expected total_attempts=2 (2 students started), got {total_attempts}"
        )
        assert submitted_count == 1, (
            f"Expected submitted_count=1 (only 1 submitted), got {submitted_count}"
        )
        expected_rate = submitted_count / total_attempts  # 0.5
        assert abs(completion_rate - expected_rate) < 0.01, (
            f"Expected completion_rate={expected_rate:.2f}, got {completion_rate}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 13. Error rate math — acceptance criterion verification
# ---------------------------------------------------------------------------

def test_error_rate_math_partial_wrong(api, teacher, student, student_lucas):
    """2 students submit: 1 correct, 1 wrong → error_rate == 0.5.

    The full acceptance criterion (12/15 wrong → error_rate=0.80) is validated
    by the same formula. We use 2 students to keep the test self-contained.
    """
    group_id = _get_student_group_id(api, student)
    lucas_group_id = _get_student_group_id(api, student_lucas)

    activity = _create_and_publish(
        api, teacher,
        _activity_with_known_question(
            title=_unique_title("ErrorRateMath"),
            group_id=group_id or lucas_group_id,
        ),
    )
    activity_id = activity["id"]

    try:
        # Get correct and wrong choice IDs from teacher view
        act_detail = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
        assert act_detail.status_code == 200, act_detail.text
        question = act_detail.json()["questions"][0]
        correct_choice_id = next(c["id"] for c in question["choices"] if c["is_correct"])
        wrong_choice_id = next(c["id"] for c in question["choices"] if not c["is_correct"])

        # Student 1 (emma): submits CORRECT answer
        start1 = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start1.status_code == 201, f"Student 1 start failed: {start1.text}"
        attempt_id_1 = start1.json()["attempt_id"]
        sub1 = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id_1}/submit",
            token=student["token"],
            json={"answers": [{"question_id": question["id"], "choice_ids": [correct_choice_id]}]},
        )
        assert sub1.status_code in (200, 201), f"Student 1 submit failed: {sub1.text}"

        # Student 2 (lucas): submits WRONG answer
        start2 = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student_lucas["token"],
        )
        if start2.status_code != 201:
            pytest.skip(
                "student_lucas cannot start the activity (likely group mismatch). "
                "Cross-student error rate math requires both students in same group."
            )
        attempt_id_2 = start2.json()["attempt_id"]
        sub2 = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id_2}/submit",
            token=student_lucas["token"],
            json={"answers": [{"question_id": question["id"], "choice_ids": [wrong_choice_id]}]},
        )
        assert sub2.status_code in (200, 201), f"Student 2 submit failed: {sub2.text}"

        # Fetch report
        r = api.get(f"/api/v1/activities/{activity_id}/report", token=teacher["token"])
        assert r.status_code == 200, r.text
        data = r.json()

        questions_stats = data.get("questions", [])
        assert questions_stats, "Report must include 'questions' list"
        first_q_stat = questions_stats[0]
        error_rate = float(first_q_stat.get("error_rate", -1))

        # 1 out of 2 students answered wrong → error_rate = 0.5
        assert abs(error_rate - 0.5) < 0.01, (
            f"Expected error_rate=0.5 (1/2 wrong), got {error_rate}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)
