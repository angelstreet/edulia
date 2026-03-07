"""Activity Attempt tests (Feature 2) — Async Attempt + Auto-Scoring.

Tests run against the live demo instance with seeded data.
Fixtures (api, admin, teacher, student, student_lucas) come from conftest.py.

Seeded assumptions (same as Feature 1 suite):
  - teacher       → prof.martin@demo.edulia.io   (role: teacher)
  - admin         → admin@demo.edulia.io          (role: admin)
  - student       → emma.leroy@demo.edulia.io    (role: student, belongs to a seeded group)
  - student_lucas → lucas.moreau@demo.edulia.io  (role: student, different account)

Each test that creates an activity publishes it (students can only attempt published
activities) and cleans up the activity at the end. Because attempt state is tied
to the created activity, deleting the activity cascades or at least isolates state.

Timestamps are appended to titles so parallel runs never collide.
"""

import uuid
import time
import pytest


# ---------------------------------------------------------------------------
# Helpers — mirrors the helpers in test_activity.py
# ---------------------------------------------------------------------------

def _unique_title(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"


def _minimal_activity(title: str | None = None, group_id: str | None = None) -> dict:
    """Return the smallest valid ActivityCreate payload."""
    return {
        "title": title or _unique_title("AttemptTest"),
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


def _activity_with_single_question(title: str, group_id: str | None = None) -> dict:
    """Activity with one single-choice question worth 1 point."""
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
                "points": 2,
            }
        ],
        **({"group_id": group_id} if group_id else {}),
    }


def _activity_with_multi_question(title: str, group_id: str | None = None) -> dict:
    """Activity with one multi-choice question (2 correct out of 4 choices) worth 2 points."""
    return {
        "title": title,
        "type": "qcm",
        "questions": [
            {
                "text": "Which are primary colours?",
                "type": "multi",
                "choices": [
                    {"text": "Red",    "is_correct": True},
                    {"text": "Green",  "is_correct": False},
                    {"text": "Blue",   "is_correct": True},
                    {"text": "Purple", "is_correct": False},
                ],
                "time_limit_s": 30,
                "points": 2,
            }
        ],
        **({"group_id": group_id} if group_id else {}),
    }


def _activity_with_open_question(title: str, group_id: str | None = None) -> dict:
    """Activity with one open (free-text) question worth 3 points."""
    return {
        "title": title,
        "type": "qcm",
        "questions": [
            {
                "text": "Describe the water cycle.",
                "type": "open",
                "choices": [],
                "time_limit_s": 120,
                "points": 3,
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
    # Publish
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


# ---------------------------------------------------------------------------
# 1. Start attempt
# ---------------------------------------------------------------------------

def test_student_can_start_attempt(api, teacher, student):
    """POST /api/v1/activities/{id}/attempt/start as student → 201, returns attempt_id and activity."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(api, teacher, _minimal_activity(group_id=group_id))
    activity_id = activity["id"]

    try:
        r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert r.status_code == 201, r.text
        data = r.json()
        assert "attempt_id" in data, "Response must contain attempt_id"
        assert "activity" in data, "Response must contain activity"
        assert data["activity"]["id"] == activity_id
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 2. Security — is_correct stripped from start response
# ---------------------------------------------------------------------------

def test_activity_response_strips_is_correct(api, teacher, student):
    """SECURITY CRITICAL: Start attempt as student — response must NOT contain is_correct on any choice.

    The server strips is_correct from every choice in the activity returned by
    /attempt/start. Leaking this field would allow a student to cheat by reading
    the API response directly without going through the UI.
    """
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(api, teacher, _minimal_activity(group_id=group_id))
    activity_id = activity["id"]

    try:
        r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert r.status_code == 201, r.text
        data = r.json()
        returned_activity = data.get("activity", {})
        questions = returned_activity.get("questions", [])
        assert questions, "Activity must have at least one question in the start response"

        for question in questions:
            for choice in question.get("choices", []):
                assert "is_correct" not in choice, (
                    f"SECURITY VIOLATION: is_correct found in choice {choice} "
                    f"of question '{question.get('text')}' in start response. "
                    "This field MUST be stripped before sending to the student."
                )
    finally:
        _cleanup_activity(api, teacher, activity_id)


def test_correct_answers_not_in_start_response(api, teacher, student):
    """Explicit restatement of the is_correct security test (acceptance criterion item 1).

    is_correct must not appear anywhere in the start response, even if the
    activity has multiple questions with multiple choices each.
    """
    group_id = _get_student_group_id(api, student)
    payload = {
        "title": _unique_title("SecurityMultiQ"),
        "type": "qcm",
        "questions": [
            {
                "text": f"Security question {i}",
                "type": "single",
                "choices": [
                    {"text": "A", "is_correct": True},
                    {"text": "B", "is_correct": False},
                    {"text": "C", "is_correct": False},
                ],
                "time_limit_s": 20,
                "points": 1,
            }
            for i in range(3)
        ],
        **({"group_id": group_id} if group_id else {}),
    }
    activity = _create_and_publish(api, teacher, payload)
    activity_id = activity["id"]

    try:
        r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert r.status_code == 201, r.text
        # Stringify the entire response body and search for is_correct.
        # This is intentionally broad — we want to catch it anywhere in the payload.
        assert "is_correct" not in r.text, (
            "SECURITY VIOLATION: The string 'is_correct' appears in the start "
            "response body. It must be completely absent."
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 3. Role restrictions on start
# ---------------------------------------------------------------------------

def test_teacher_cannot_start_attempt(api, teacher):
    """POST /attempt/start as teacher → 403."""
    activity = _create_and_publish(
        api, teacher, _minimal_activity(title=_unique_title("TeacherStart"))
    )
    activity_id = activity["id"]

    try:
        r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=teacher["token"],
        )
        assert r.status_code == 403, (
            f"Expected 403 when teacher tries to start an attempt, got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 4. Duplicate start
# ---------------------------------------------------------------------------

def test_student_cannot_start_attempt_twice(api, teacher, student):
    """Starting a second attempt on the same activity → 409 Conflict."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher, _minimal_activity(group_id=group_id)
    )
    activity_id = activity["id"]

    try:
        first = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert first.status_code == 201, f"First start failed: {first.text}"

        second = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert second.status_code == 409, (
            f"Expected 409 Conflict for second start attempt, got {second.status_code}: {second.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 5. Submit attempt
# ---------------------------------------------------------------------------

def test_student_can_submit_attempt(api, teacher, student):
    """Start attempt then submit with answers → 200 or 201, returns score and max_score."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(api, teacher, _minimal_activity(group_id=group_id))
    activity_id = activity["id"]

    try:
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]
        questions = start_r.json()["activity"]["questions"]

        # Build answers: pick the first choice for each question
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
        data = submit_r.json()
        assert "score" in data, "Submit response must contain score"
        assert "max_score" in data, "Submit response must contain max_score"
        # Both must be numeric (int or float/Decimal serialised as number or string)
        assert data["score"] is not None
        assert data["max_score"] is not None
        assert float(data["max_score"]) > 0, "max_score must be positive"
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 6. Scoring correctness — single-choice
# ---------------------------------------------------------------------------

def test_submit_scores_correctly_single_choice(api, teacher, student_lucas):
    """Correct answer → score == max_score; wrong answer → score == 0.

    Uses student_lucas so the attempt state is independent from other tests
    that use the primary student fixture.
    """
    group_id = _get_student_group_id(api, student_lucas)

    # ---- correct answer ----
    payload_correct = _activity_with_single_question(
        title=_unique_title("SingleCorrect"), group_id=group_id
    )
    activity_correct = _create_and_publish(api, teacher, payload_correct)
    act_id_correct = activity_correct["id"]

    try:
        start_r = api.post(
            f"/api/v1/activities/{act_id_correct}/attempt/start",
            token=student_lucas["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]
        # Retrieve choice IDs from the activity stored server-side (teacher view has is_correct)
        act_detail = api.get(f"/api/v1/activities/{act_id_correct}", token=teacher["token"])
        question = act_detail.json()["questions"][0]
        correct_choice_id = next(c["id"] for c in question["choices"] if c["is_correct"])

        submit_r = api.post(
            f"/api/v1/activities/{act_id_correct}/attempt/{attempt_id}/submit",
            token=student_lucas["token"],
            json={"answers": [{"question_id": question["id"], "choice_ids": [correct_choice_id]}]},
        )
        assert submit_r.status_code in (200, 201), submit_r.text
        result = submit_r.json()
        assert float(result["score"]) == float(result["max_score"]), (
            f"Correct answer should yield full points: score={result['score']} max={result['max_score']}"
        )
    finally:
        _cleanup_activity(api, teacher, act_id_correct)

    # ---- wrong answer ----
    payload_wrong = _activity_with_single_question(
        title=_unique_title("SingleWrong"), group_id=group_id
    )
    activity_wrong = _create_and_publish(api, teacher, payload_wrong)
    act_id_wrong = activity_wrong["id"]

    try:
        start_r2 = api.post(
            f"/api/v1/activities/{act_id_wrong}/attempt/start",
            token=student_lucas["token"],
        )
        assert start_r2.status_code == 201, start_r2.text
        attempt_id2 = start_r2.json()["attempt_id"]
        act_detail2 = api.get(f"/api/v1/activities/{act_id_wrong}", token=teacher["token"])
        question2 = act_detail2.json()["questions"][0]
        wrong_choice_id = next(c["id"] for c in question2["choices"] if not c["is_correct"])

        submit_r2 = api.post(
            f"/api/v1/activities/{act_id_wrong}/attempt/{attempt_id2}/submit",
            token=student_lucas["token"],
            json={"answers": [{"question_id": question2["id"], "choice_ids": [wrong_choice_id]}]},
        )
        assert submit_r2.status_code in (200, 201), submit_r2.text
        result2 = submit_r2.json()
        assert float(result2["score"]) == 0, (
            f"Wrong answer should yield 0 points, got score={result2['score']}"
        )
    finally:
        _cleanup_activity(api, teacher, act_id_wrong)


# ---------------------------------------------------------------------------
# 7. Scoring correctness — multi-choice
# ---------------------------------------------------------------------------

def test_submit_scores_correctly_multi_choice(api, teacher, student):
    """Multi-choice scoring: full / partial / zero points.

    Activity has 1 multi question with choices: Red(correct), Green(wrong),
    Blue(correct), Purple(wrong) — 2 correct out of 4.
    """
    group_id = _get_student_group_id(api, student)

    scenarios = [
        ("BothCorrect",  ["Red", "Blue"],          "full"),
        ("OneCorrectOnly",["Red"],                  "partial"),
        ("OneCorrectOnWrong", ["Red", "Green"],     "zero_or_partial"),  # 1 correct + 1 wrong → max(0, (1-1)/2)=0
        ("AllWrong",     ["Green", "Purple"],       "zero"),
    ]

    for label, picks, expectation in scenarios:
        activity = _create_and_publish(
            api, teacher,
            _activity_with_multi_question(
                title=_unique_title(f"Multi-{label}"), group_id=group_id
            ),
        )
        activity_id = activity["id"]
        try:
            start_r = api.post(
                f"/api/v1/activities/{activity_id}/attempt/start",
                token=student["token"],
            )
            assert start_r.status_code == 201, f"{label}: start failed {start_r.text}"
            attempt_id = start_r.json()["attempt_id"]

            # Get real choice IDs from teacher view
            act_detail = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
            question = act_detail.json()["questions"][0]
            choice_map = {c["text"]: c["id"] for c in question["choices"]}
            chosen_ids = [choice_map[p] for p in picks if p in choice_map]

            submit_r = api.post(
                f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
                token=student["token"],
                json={"answers": [{"question_id": question["id"], "choice_ids": chosen_ids}]},
            )
            assert submit_r.status_code in (200, 201), f"{label}: submit failed {submit_r.text}"
            result = submit_r.json()
            score = float(result["score"])
            max_score = float(result["max_score"])

            if expectation == "full":
                assert score == max_score, f"{label}: expected full points, got {score}/{max_score}"
            elif expectation == "partial":
                assert 0 < score < max_score, f"{label}: expected partial points, got {score}/{max_score}"
            elif expectation == "zero_or_partial":
                # 1 correct + 1 wrong → net = 0 correct effective → score = 0
                assert score == 0, f"{label}: expected 0 points (penalty cancels), got {score}/{max_score}"
            elif expectation == "zero":
                assert score == 0, f"{label}: expected 0 points, got {score}/{max_score}"
        finally:
            _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 8. Correct answers revealed after submit
# ---------------------------------------------------------------------------

def test_correct_answers_revealed_after_submit(api, teacher, student):
    """Submit response must include question_results with correct_choice_ids that match the activity."""
    group_id = _get_student_group_id(api, student)
    payload = _activity_with_single_question(
        title=_unique_title("RevealAfterSubmit"), group_id=group_id
    )
    activity = _create_and_publish(api, teacher, payload)
    activity_id = activity["id"]

    try:
        # Get authoritative correct choice IDs from teacher view
        act_detail = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
        question = act_detail.json()["questions"][0]
        expected_correct_ids = {c["id"] for c in question["choices"] if c["is_correct"]}

        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]

        # Submit any answer
        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": [{"question_id": question["id"], "choice_ids": [question["choices"][0]["id"]]}]},
        )
        assert submit_r.status_code in (200, 201), submit_r.text
        result = submit_r.json()

        assert "question_results" in result, "Submit response must include question_results"
        q_results = result["question_results"]
        assert q_results, "question_results must not be empty"

        for qr in q_results:
            assert "correct_choice_ids" in qr, "Each question result must have correct_choice_ids"
            revealed_ids = set(qr["correct_choice_ids"])
            assert revealed_ids == expected_correct_ids, (
                f"Revealed correct_choice_ids {revealed_ids} do not match "
                f"actual correct choices {expected_correct_ids}"
            )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 9. Duplicate submit
# ---------------------------------------------------------------------------

def test_student_cannot_submit_twice(api, teacher, student):
    """Start + submit, then submit again → 400 or 409."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(api, teacher, _minimal_activity(group_id=group_id))
    activity_id = activity["id"]

    try:
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

        first_submit = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": answers},
        )
        assert first_submit.status_code in (200, 201), f"First submit failed: {first_submit.text}"

        second_submit = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={"answers": answers},
        )
        assert second_submit.status_code in (400, 409), (
            f"Expected 400 or 409 for duplicate submit, got {second_submit.status_code}: {second_submit.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 10. Cross-student attempt security
# ---------------------------------------------------------------------------

def test_student_cannot_submit_others_attempt(api, teacher, student, student_lucas):
    """Student B cannot submit an attempt started by Student A → 403."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(api, teacher, _minimal_activity(group_id=group_id))
    activity_id = activity["id"]

    try:
        # Student A starts attempt
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

        # Student B (lucas) tries to submit Student A's attempt
        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student_lucas["token"],
            json={"answers": answers},
        )
        assert submit_r.status_code == 403, (
            f"Expected 403 when student B submits student A's attempt, "
            f"got {submit_r.status_code}: {submit_r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 11. Teacher sees all attempts
# ---------------------------------------------------------------------------

def test_teacher_sees_all_attempts(api, teacher, student):
    """GET /api/v1/activities/{id}/attempts as teacher → list containing the student's attempt."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(api, teacher, _minimal_activity(group_id=group_id))
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

        # Teacher fetches all attempts
        list_r = api.get(f"/api/v1/activities/{activity_id}/attempts", token=teacher["token"])
        assert list_r.status_code == 200, list_r.text
        attempts = list_r.json()
        assert isinstance(attempts, list), "Response must be a list"
        attempt_ids = {a.get("id") or a.get("attempt_id") for a in attempts}
        assert attempt_id in attempt_ids, (
            f"Teacher should see student's attempt {attempt_id} in the list"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 12. Student sees only own attempt
# ---------------------------------------------------------------------------

def test_student_sees_only_own_attempt(api, teacher, student):
    """GET /attempt/my returns student's own attempt; GET /attempts (teacher endpoint) → 403 for student."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(api, teacher, _minimal_activity(group_id=group_id))
    activity_id = activity["id"]

    try:
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

        # Student can fetch their own attempt
        my_r = api.get(f"/api/v1/activities/{activity_id}/attempt/my", token=student["token"])
        assert my_r.status_code == 200, f"Student should be able to GET /attempt/my: {my_r.text}"
        my_data = my_r.json()
        assert my_data.get("id") == attempt_id or my_data.get("attempt_id") == attempt_id, (
            "GET /attempt/my should return the student's own attempt"
        )

        # Student cannot fetch all attempts (teacher-only endpoint)
        all_r = api.get(f"/api/v1/activities/{activity_id}/attempts", token=student["token"])
        assert all_r.status_code == 403, (
            f"Expected 403 when student accesses teacher-only /attempts, got {all_r.status_code}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 13. No attempt → 404
# ---------------------------------------------------------------------------

def test_no_attempt_returns_404(api, teacher, student):
    """GET /attempt/my when no attempt has been started → 404."""
    group_id = _get_student_group_id(api, student)
    # Create a brand-new activity that this student has never touched
    activity = _create_and_publish(
        api, teacher,
        _minimal_activity(title=_unique_title("NoAttempt"), group_id=group_id),
    )
    activity_id = activity["id"]

    try:
        r = api.get(f"/api/v1/activities/{activity_id}/attempt/my", token=student["token"])
        assert r.status_code == 404, (
            f"Expected 404 when no attempt exists, got {r.status_code}: {r.text}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)


# ---------------------------------------------------------------------------
# 14. Open questions — auto-score zero, max_score includes their points
# ---------------------------------------------------------------------------

def test_open_questions_score_zero_auto(api, teacher, student):
    """Open-type question: text answer → auto-score = 0, but max_score still counts the question's points."""
    group_id = _get_student_group_id(api, student)
    activity = _create_and_publish(
        api, teacher,
        _activity_with_open_question(
            title=_unique_title("OpenQuestion"), group_id=group_id
        ),
    )
    activity_id = activity["id"]

    try:
        start_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/start",
            token=student["token"],
        )
        assert start_r.status_code == 201, start_r.text
        attempt_id = start_r.json()["attempt_id"]
        questions = start_r.json()["activity"]["questions"]
        question_id = questions[0]["id"]

        # Submit a free-text answer
        submit_r = api.post(
            f"/api/v1/activities/{activity_id}/attempt/{attempt_id}/submit",
            token=student["token"],
            json={
                "answers": [
                    {"question_id": question_id, "choice_ids": [], "text": "Water evaporates then precipitates."}
                ]
            },
        )
        assert submit_r.status_code in (200, 201), submit_r.text
        result = submit_r.json()

        assert float(result["score"]) == 0, (
            f"Open question must score 0 automatically, got {result['score']}"
        )
        assert float(result["max_score"]) == 3, (
            f"max_score must include the open question's 3 points, got {result['max_score']}"
        )
    finally:
        _cleanup_activity(api, teacher, activity_id)
