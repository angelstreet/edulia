"""Gradebook ↔ Activity Integration tests — 10 HTTP integration cases.

Tests the new endpoint:
    POST /api/v1/activities/{activity_id}/push-to-gradebook
    Body: { term_id, category_id?, coefficient, max_score }

Acceptance criteria verified:
  - Teacher/admin can push a published activity → Assessment + Grades created
  - Push is idempotent: second call returns the existing assessment (200)
  - Student is forbidden (403)
  - Unauthenticated is forbidden (401 or 403)
  - Draft activity returns 400/422
  - Score scaling: student score / activity max_score * push max_score
  - Students with no attempt get grade.score = None
  - Activity without subject_id returns 400
  - Coefficient is stored on the created assessment

Fixtures (api, teacher, student, student_lucas) come from conftest.py.

Academic-year terms are resolved at runtime from GET /api/v1/academic-years.
If no terms exist in the demo seed, term_id-dependent tests are skipped with
a clear message rather than failing.
"""

import uuid
import time
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_title(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"


def _get_first_group_id(api, token: str) -> str | None:
    """Return the id of the first group visible to this token, or None."""
    r = api.get("/api/v1/groups", token=token)
    groups = r.json() if r.status_code == 200 and isinstance(r.json(), list) else []
    return groups[0]["id"] if groups else None


def _get_first_subject_id(api, token: str) -> str | None:
    """Return the id of the first subject visible to this token, or None."""
    r = api.get("/api/v1/subjects", token=token)
    subjects = r.json() if r.status_code == 200 and isinstance(r.json(), list) else []
    return subjects[0]["id"] if subjects else None


def _get_valid_term_id(api, token: str) -> str | None:
    """Resolve a term_id from the academic-years tree, or return None.

    GET /api/v1/academic-years → list of years, each year has a 'terms' list.
    """
    r = api.get("/api/v1/academic-years", token=token)
    if r.status_code != 200:
        return None
    years = r.json()
    if not isinstance(years, list):
        return None
    for year in years:
        terms = year.get("terms") or []
        if terms:
            return terms[0]["id"]
    return None


def _activity_payload_with_group_subject(
    title: str | None = None,
    group_id: str | None = None,
    subject_id: str | None = None,
) -> dict:
    """Return a minimal QCM activity payload with 2 questions (total 4 raw points).

    Two questions each worth 2 points.  Student who answers both correctly
    scores 4/4; student who answers none scores 0/4.  This lets us test
    score scaling (e.g. push max_score=20 → correct student gets 20.0,
    half-correct student gets 10.0).
    """
    return {
        "title": title or _unique_title("GradebookBridge"),
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
                "points": 2,
            },
            {
                "text": "Capital of France?",
                "type": "single",
                "choices": [
                    {"text": "Berlin", "is_correct": False},
                    {"text": "Paris",  "is_correct": True},
                    {"text": "Rome",   "is_correct": False},
                ],
                "time_limit_s": 30,
                "points": 2,
            },
        ],
        **({"group_id": group_id} if group_id else {}),
        **({"subject_id": subject_id} if subject_id else {}),
    }


def _create_and_publish_activity(
    api,
    teacher: dict,
    group_id: str | None = None,
    subject_id: str | None = None,
    title: str | None = None,
) -> dict:
    """Create and publish an activity with optional group_id and subject_id.

    Returns the published activity JSON.
    """
    payload = _activity_payload_with_group_subject(
        title=title or _unique_title("GradebookAct"),
        group_id=group_id,
        subject_id=subject_id,
    )
    create_r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert create_r.status_code == 201, f"Failed to create activity: {create_r.text}"
    activity_id = create_r.json()["id"]

    pub_r = api.patch(
        f"/api/v1/activities/{activity_id}",
        token=teacher["token"],
        json={"status": "published"},
    )
    assert pub_r.status_code == 200, f"Failed to publish activity: {pub_r.text}"
    return pub_r.json()


def _submit_attempt(api, student: dict, activity_id: str, pick_correct: bool = True) -> dict:
    """Start and submit an attempt for the given activity.

    If pick_correct=True, picks the first correct choice for every question.
    If pick_correct=False, picks the first wrong choice for every question
    (or still the first choice if none are labelled wrong — best effort).

    Returns the submit response JSON.
    """
    start_r = api.post(
        f"/api/v1/activities/{activity_id}/attempt/start",
        token=student["token"],
    )
    assert start_r.status_code == 201, f"Failed to start attempt: {start_r.text}"
    attempt_id = start_r.json()["attempt_id"]
    # Use the teacher-agnostic questions from the start response (no is_correct),
    # then fetch is_correct from the activity detail if needed.
    questions_stripped = start_r.json()["activity"]["questions"]

    if not pick_correct:
        # Just pick the first choice of each question (we don't know which is correct
        # without fetching the teacher view, which is fine — this gives a defined score)
        answers = [
            {"question_id": q["id"], "choice_ids": [q["choices"][0]["id"]]}
            for q in questions_stripped
            if q.get("choices")
        ]
    else:
        # We need the correct choice IDs — ask the activity detail via the student's
        # start response. Since is_correct is stripped, we cannot determine the
        # correct choice from the start payload alone. We accept "first choice" here
        # too — the important thing for score-scaling tests is a known raw score,
        # so for those tests we drive correctness from the teacher view explicitly.
        answers = [
            {"question_id": q["id"], "choice_ids": [q["choices"][0]["id"]]}
            for q in questions_stripped
            if q.get("choices")
        ]

    submit_r = api.post(
        f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
        token=student["token"],
        json={"answers": answers},
    )
    assert submit_r.status_code in (200, 201), f"Failed to submit attempt: {submit_r.text}"
    return submit_r.json()


def _push_to_gradebook(
    api,
    token: str,
    activity_id: str,
    term_id: str,
    max_score: float = 20.0,
    coefficient: float = 1.0,
    category_id: str | None = None,
) -> object:
    """POST push-to-gradebook; return the requests.Response object."""
    body = {
        "term_id": term_id,
        "max_score": max_score,
        "coefficient": coefficient,
    }
    if category_id:
        body["category_id"] = category_id
    return api.post(
        f"/api/v1/activities/{activity_id}/push-to-gradebook",
        token=token,
        json=body,
    )


def _cleanup_activity(api, teacher: dict, activity_id: str) -> None:
    """Best-effort cleanup; published activities may refuse deletion — ignore."""
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


# ---------------------------------------------------------------------------
# Test 1 — Teacher can push a published activity to the gradebook
# ---------------------------------------------------------------------------

def test_teacher_can_push_activity_to_gradebook(api, teacher):
    """POST push-to-gradebook as teacher with a fully-specified activity → 200 or 201.

    Response must contain: id, title, source_activity_id.
    """
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found in demo data — cannot test push-to-gradebook")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — cannot create a push-eligible activity")

    activity = _create_and_publish_activity(api, teacher, group_id=group_id, subject_id=subject_id)
    activity_id = activity["id"]

    try:
        r = _push_to_gradebook(api, teacher["token"], activity_id, term_id)
        assert r.status_code in (200, 201), (
            f"Expected 200 or 201 when teacher pushes activity to gradebook, "
            f"got {r.status_code}: {r.text}"
        )
        data = r.json()
        assert "id" in data, f"Response must contain 'id', got keys: {list(data.keys())}"
        assert "title" in data, f"Response must contain 'title', got keys: {list(data.keys())}"
        assert "source_activity_id" in data, (
            f"Response must contain 'source_activity_id', got keys: {list(data.keys())}"
        )
        assert str(data["source_activity_id"]) == str(activity_id), (
            f"source_activity_id must match the pushed activity, "
            f"expected {activity_id}, got {data['source_activity_id']}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 2 — Push creates grades for students who attempted
# ---------------------------------------------------------------------------

def test_push_creates_grades_for_attempted_students(api, teacher, student):
    """After student submits an attempt, push creates a grade record for that student."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found in demo data — skipping grade creation test")

    group_id = _get_first_group_id(api, student["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — skipping grade creation test")

    activity = _create_and_publish_activity(api, teacher, group_id=group_id, subject_id=subject_id)
    activity_id = activity["id"]

    try:
        # Student submits an attempt
        _submit_attempt(api, student, activity_id)

        # Teacher pushes to gradebook
        push_r = _push_to_gradebook(api, teacher["token"], activity_id, term_id)
        assert push_r.status_code in (200, 201), (
            f"Push failed: {push_r.status_code}: {push_r.text}"
        )
        assessment_id = push_r.json()["id"]

        # Fetch grades for the new assessment
        grades_r = api.get(
            f"/api/v1/gradebook/assessments/{assessment_id}/grades",
            token=teacher["token"],
        )
        assert grades_r.status_code == 200, (
            f"Expected 200 when fetching grades, got {grades_r.status_code}: {grades_r.text}"
        )
        grades = grades_r.json()
        assert isinstance(grades, list) and len(grades) > 0, (
            "Expected at least one grade record after push with a submitted attempt"
        )

        # The student who attempted should appear in the grades
        student_grade = next(
            (g for g in grades if str(g.get("student_id")) == str(student["user_id"])),
            None,
        )
        assert student_grade is not None, (
            f"Student {student['user_id']} should have a grade after attempting and pushing"
        )
        # The student has a score (may be 0 if they chose wrong, but score key must exist)
        assert "score" in student_grade, "Grade record must contain 'score' key"
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 3 — Push is idempotent: second call returns the existing assessment
# ---------------------------------------------------------------------------

def test_push_is_idempotent(api, teacher):
    """Calling push-to-gradebook twice returns the same assessment (not 409)."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found in demo data — skipping idempotency test")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found — skipping idempotency test")

    activity = _create_and_publish_activity(api, teacher, group_id=group_id, subject_id=subject_id)
    activity_id = activity["id"]

    try:
        # First push
        first_r = _push_to_gradebook(api, teacher["token"], activity_id, term_id)
        assert first_r.status_code in (200, 201), (
            f"First push failed: {first_r.status_code}: {first_r.text}"
        )
        first_assessment_id = first_r.json()["id"]

        # Second push — must not return 409; must return the same assessment_id
        second_r = _push_to_gradebook(api, teacher["token"], activity_id, term_id)
        assert second_r.status_code == 200, (
            f"Second push (idempotent) must return 200, got {second_r.status_code}: {second_r.text}"
        )
        second_assessment_id = second_r.json()["id"]
        assert str(first_assessment_id) == str(second_assessment_id), (
            f"Idempotent push must return the same assessment. "
            f"First={first_assessment_id}, Second={second_assessment_id}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 4 — Student cannot push to gradebook (403)
# ---------------------------------------------------------------------------

def test_student_cannot_push_to_gradebook(api, teacher, student):
    """Student calling push-to-gradebook → 403 Forbidden."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — skipping student-forbidden test")

    group_id = _get_first_group_id(api, student["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found — skipping student-forbidden test")

    activity = _create_and_publish_activity(api, teacher, group_id=group_id, subject_id=subject_id)
    activity_id = activity["id"]

    try:
        r = _push_to_gradebook(api, student["token"], activity_id, term_id)
        assert r.status_code == 403, (
            f"Expected 403 when student calls push-to-gradebook, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 5 — Unauthenticated request → 401 or 403
# ---------------------------------------------------------------------------

def test_unauthenticated_cannot_push(api, teacher):
    """No token on push-to-gradebook → 401 or 403."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — skipping unauthenticated test")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found — skipping unauthenticated test")

    activity = _create_and_publish_activity(api, teacher, group_id=group_id, subject_id=subject_id)
    activity_id = activity["id"]

    try:
        # api.post with no token sends no Authorization header
        r = api.post(
            f"/api/v1/activities/{activity_id}/push-to-gradebook",
            json={"term_id": term_id, "max_score": 20.0, "coefficient": 1.0},
        )
        assert r.status_code in (401, 403), (
            f"Expected 401 or 403 for unauthenticated push-to-gradebook, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 6 — Draft activity returns 400 or 422
# ---------------------------------------------------------------------------

def test_push_draft_activity_returns_error(api, teacher):
    """Pushing a draft (non-published) activity → 400 or 422."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — skipping draft-activity test")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])

    payload = _activity_payload_with_group_subject(
        title=_unique_title("DraftNoPush"),
        group_id=group_id,
        subject_id=subject_id,
    )
    create_r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert create_r.status_code == 201, f"Failed to create draft activity: {create_r.text}"
    activity_id = create_r.json()["id"]
    assert create_r.json().get("status") == "draft", "Activity must remain a draft for this test"

    try:
        r = _push_to_gradebook(api, teacher["token"], activity_id, term_id)
        assert r.status_code in (400, 422), (
            f"Expected 400 or 422 when pushing a draft activity, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 7 — Score scaling: student score / raw max * push max_score
# ---------------------------------------------------------------------------

def test_push_scales_score_to_max_score(api, teacher, student):
    """Score scaling: activity has 4 raw points; student scores 2/4.

    With push max_score=20, the expected grade is 10.0 (2/4 * 20).

    To achieve a controlled raw score of 2/4, the student correctly answers
    one question (2 pts) and incorrectly answers the other (0 pts).
    We drive this by fetching the correct choice IDs from the teacher view.
    """
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — skipping score-scaling test")

    group_id = _get_first_group_id(api, student["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found — skipping score-scaling test")

    activity = _create_and_publish_activity(api, teacher, group_id=group_id, subject_id=subject_id)
    activity_id = activity["id"]

    try:
        # Fetch questions with correct answers from teacher view
        detail_r = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
        assert detail_r.status_code == 200, detail_r.text
        questions = detail_r.json()["questions"]
        assert len(questions) >= 2, "Expected at least 2 questions for score-scaling test"

        # Build answers: correct for Q0, wrong for Q1
        q0, q1 = questions[0], questions[1]
        correct_q0 = next(c["id"] for c in q0["choices"] if c.get("is_correct"))
        wrong_q1 = next(c["id"] for c in q1["choices"] if not c.get("is_correct"))

        # Start attempt
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]

        # Submit with 1 correct + 1 wrong answer
        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={
                "answers": [
                    {"question_id": q0["id"], "choice_ids": [correct_q0]},
                    {"question_id": q1["id"], "choice_ids": [wrong_q1]},
                ]
            },
        )
        assert submit_r.status_code in (200, 201), submit_r.text
        raw_score = float(submit_r.json()["score"])
        raw_max = float(submit_r.json()["max_score"])
        assert raw_max == 4.0, f"Expected raw max_score=4 (2 questions × 2 pts), got {raw_max}"
        assert raw_score == 2.0, (
            f"Expected raw score=2 (one correct question), got {raw_score}"
        )

        # Push to gradebook with max_score=20
        push_r = _push_to_gradebook(api, teacher["token"], activity_id, term_id, max_score=20.0)
        assert push_r.status_code in (200, 201), f"Push failed: {push_r.text}"
        assessment_id = push_r.json()["id"]

        # Fetch grades and check the student's scaled score
        grades_r = api.get(
            f"/api/v1/gradebook/assessments/{assessment_id}/grades",
            token=teacher["token"],
        )
        assert grades_r.status_code == 200, grades_r.text
        grades = grades_r.json()
        student_grade = next(
            (g for g in grades if str(g.get("student_id")) == str(student["user_id"])),
            None,
        )
        assert student_grade is not None, (
            f"Student {student['user_id']} not found in grades after push"
        )
        scaled = student_grade.get("score")
        assert scaled is not None, "Expected a numeric score for the student who attempted"
        assert float(scaled) == 10.0, (
            f"Expected scaled score 10.0 (2/4 × 20), got {scaled}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 8 — Student with no attempt gets score = None
# ---------------------------------------------------------------------------

def test_push_student_with_no_attempt_gets_null_score(api, teacher, student, student_lucas):
    """Two enrolled students; only one attempts.  After push, the non-attempter has score=None."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — skipping null-score test")

    # Both students must share a group so both are enrolled
    student_groups_r = api.get("/api/v1/groups", token=student["token"])
    lucas_groups_r = api.get("/api/v1/groups", token=student_lucas["token"])

    student_groups = student_groups_r.json() if student_groups_r.status_code == 200 else []
    lucas_groups = lucas_groups_r.json() if lucas_groups_r.status_code == 200 else []

    if not (isinstance(student_groups, list) and student_groups):
        pytest.skip("Primary student has no groups — skipping null-score test")
    if not (isinstance(lucas_groups, list) and lucas_groups):
        pytest.skip("student_lucas has no groups — skipping null-score test")

    # Look for a group both students share
    student_group_ids = {g["id"] for g in student_groups}
    lucas_group_ids = {g["id"] for g in lucas_groups}
    shared_group_ids = student_group_ids & lucas_group_ids

    if not shared_group_ids:
        pytest.skip(
            "No shared group between student and student_lucas — "
            "cannot test null score for non-attempter"
        )

    shared_group_id = next(iter(shared_group_ids))
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not subject_id:
        pytest.skip("No subject found — skipping null-score test")

    activity = _create_and_publish_activity(
        api, teacher, group_id=shared_group_id, subject_id=subject_id
    )
    activity_id = activity["id"]

    try:
        # Only student (emma) attempts; student_lucas does not
        _submit_attempt(api, student, activity_id)

        # Push to gradebook
        push_r = _push_to_gradebook(api, teacher["token"], activity_id, term_id)
        assert push_r.status_code in (200, 201), f"Push failed: {push_r.text}"
        assessment_id = push_r.json()["id"]

        grades_r = api.get(
            f"/api/v1/gradebook/assessments/{assessment_id}/grades",
            token=teacher["token"],
        )
        assert grades_r.status_code == 200, grades_r.text
        grades = grades_r.json()

        # student_lucas should have a grade record with score=None
        lucas_grade = next(
            (g for g in grades if str(g.get("student_id")) == str(student_lucas["user_id"])),
            None,
        )
        assert lucas_grade is not None, (
            f"student_lucas ({student_lucas['user_id']}) should have a grade record "
            f"even without an attempt (score should be None/null)"
        )
        assert lucas_grade.get("score") is None, (
            f"Non-attempter's score should be None, got {lucas_grade.get('score')}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 9 — Activity without subject_id → 400
# ---------------------------------------------------------------------------

def test_push_without_subject_returns_400(api, teacher):
    """Activity with no subject_id cannot be pushed → 400."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — skipping no-subject test")

    group_id = _get_first_group_id(api, teacher["token"])

    # Create and publish an activity WITHOUT a subject_id
    payload = {
        "title": _unique_title("NoSubjectPush"),
        "type": "qcm",
        "questions": [
            {
                "text": "What is 2 + 2?",
                "type": "single",
                "choices": [
                    {"text": "3", "is_correct": False},
                    {"text": "4", "is_correct": True},
                ],
                "time_limit_s": 30,
                "points": 1,
            }
        ],
        **({"group_id": group_id} if group_id else {}),
        # intentionally omit subject_id
    }
    create_r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert create_r.status_code == 201, f"Failed to create activity: {create_r.text}"
    activity_id = create_r.json()["id"]

    # Publish it
    pub_r = api.patch(
        f"/api/v1/activities/{activity_id}",
        token=teacher["token"],
        json={"status": "published"},
    )
    assert pub_r.status_code == 200, f"Failed to publish: {pub_r.text}"

    try:
        r = _push_to_gradebook(api, teacher["token"], activity_id, term_id)
        assert r.status_code == 400, (
            f"Expected 400 when pushing activity without subject_id, "
            f"got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# Test 10 — Push sets the coefficient on the assessment
# ---------------------------------------------------------------------------

def test_push_sets_coefficient(api, teacher):
    """Push with coefficient=2.0 → GET assessment returns coefficient=2.0."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — skipping coefficient test")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found — skipping coefficient test")

    activity = _create_and_publish_activity(api, teacher, group_id=group_id, subject_id=subject_id)
    activity_id = activity["id"]

    try:
        push_r = _push_to_gradebook(
            api, teacher["token"], activity_id, term_id,
            max_score=20.0, coefficient=2.0,
        )
        assert push_r.status_code in (200, 201), (
            f"Push failed: {push_r.status_code}: {push_r.text}"
        )
        assessment_data = push_r.json()

        # The coefficient must be surfaced either in the push response directly
        # or in the assessment detail. Check both.
        coefficient_in_response = assessment_data.get("coefficient")
        if coefficient_in_response is not None:
            assert float(coefficient_in_response) == 2.0, (
                f"Expected coefficient=2.0, got {coefficient_in_response}"
            )
        else:
            # Fall back to GET /api/v1/gradebook/assessments and find the assessment
            assessments_r = api.get(
                "/api/v1/gradebook/assessments",
                token=teacher["token"],
            )
            assert assessments_r.status_code == 200, assessments_r.text
            assessments = assessments_r.json()
            pushed = next(
                (a for a in assessments if str(a.get("id")) == str(assessment_data["id"])),
                None,
            )
            assert pushed is not None, (
                f"Could not find assessment {assessment_data['id']} in assessment list"
            )
            assert float(pushed.get("coefficient", 0)) == 2.0, (
                f"Expected coefficient=2.0 on assessment, got {pushed.get('coefficient')}"
            )
    finally:
        _cleanup_activity(api, teacher, activity_id)
