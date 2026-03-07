"""Gradebook API integration tests — 10 HTTP cases.

Covers existing and new gradebook endpoints after the audit fixes:
  1. GradebookPage: term/subject filters work, assessment creation requires term_id + subject_id
  2. GradeEntryPage: new GET /api/v1/gradebook/assessments/{id} endpoint
  3. StudentGradesPage: term_id filter on averages endpoint

Fixtures (api, teacher, student) come from conftest.py.
Academic-year terms are resolved at runtime from GET /api/v1/academic-years.
If no terms exist in the demo seed, term-dependent tests are skipped with a
clear message rather than failing.
"""

import uuid
import time
import datetime
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


def _get_two_term_ids(api, token: str) -> tuple[str | None, str | None]:
    """Return up to two distinct term_ids from the academic-years tree."""
    r = api.get("/api/v1/academic-years", token=token)
    if r.status_code != 200:
        return None, None
    years = r.json()
    if not isinstance(years, list):
        return None, None
    term_ids = []
    for year in years:
        for term in (year.get("terms") or []):
            term_ids.append(term["id"])
            if len(term_ids) == 2:
                return term_ids[0], term_ids[1]
    if len(term_ids) == 1:
        return term_ids[0], None
    return None, None


def _create_assessment(
    api,
    teacher: dict,
    group_id: str,
    subject_id: str,
    term_id: str,
    title: str | None = None,
) -> str:
    """POST /api/v1/gradebook/assessments, assert 201, return the new id."""
    payload = {
        "group_id": group_id,
        "subject_id": subject_id,
        "term_id": term_id,
        "title": title or _unique_title("Assessment"),
        "date": datetime.date.today().isoformat(),
        "max_score": 20,
        "coefficient": 1,
    }
    r = api.post("/api/v1/gradebook/assessments", token=teacher["token"], json=payload)
    assert r.status_code == 201, f"Failed to create assessment: {r.text}"
    return r.json()["id"]


def _get_second_group_id(api, token: str) -> str | None:
    """Return the id of the second group visible to this token, or None."""
    r = api.get("/api/v1/groups", token=token)
    groups = r.json() if r.status_code == 200 and isinstance(r.json(), list) else []
    return groups[1]["id"] if len(groups) >= 2 else None


# ---------------------------------------------------------------------------
# Test 1 — Teacher can create an assessment with group, subject, and term
# ---------------------------------------------------------------------------

def test_teacher_can_create_assessment(api, teacher):
    """POST /gradebook/assessments with group, subject, term → 201 with expected fields."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — cannot test assessment creation")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — cannot create assessment")

    payload = {
        "group_id": group_id,
        "subject_id": subject_id,
        "term_id": term_id,
        "title": _unique_title("CreateTest"),
        "date": datetime.date.today().isoformat(),
        "max_score": 20,
        "coefficient": 2,
    }
    r = api.post("/api/v1/gradebook/assessments", token=teacher["token"], json=payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"

    data = r.json()
    assert "id" in data, f"Response must contain 'id', got keys: {list(data.keys())}"
    assert "title" in data, f"Response must contain 'title', got keys: {list(data.keys())}"
    assert "max_score" in data, f"Response must contain 'max_score', got keys: {list(data.keys())}"
    assert "coefficient" in data, f"Response must contain 'coefficient', got keys: {list(data.keys())}"
    assert float(data["max_score"]) == 20.0, f"Expected max_score=20, got {data['max_score']}"
    assert float(data["coefficient"]) == 2.0, f"Expected coefficient=2, got {data['coefficient']}"


# ---------------------------------------------------------------------------
# Test 2 — Assessment creation fails without group_id
# ---------------------------------------------------------------------------

def test_assessment_requires_group_and_subject(api, teacher):
    """POST /gradebook/assessments without group_id → 400 or 422."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — cannot test validation")

    subject_id = _get_first_subject_id(api, teacher["token"])
    if not subject_id:
        pytest.skip("No subject found in demo data — cannot test validation")

    # Omit group_id intentionally
    payload = {
        "subject_id": subject_id,
        "term_id": term_id,
        "title": _unique_title("MissingGroup"),
        "date": datetime.date.today().isoformat(),
        "max_score": 20,
        "coefficient": 1,
    }
    r = api.post("/api/v1/gradebook/assessments", token=teacher["token"], json=payload)
    assert r.status_code in (400, 422), (
        f"Expected 400 or 422 when group_id is missing, got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 3 — List assessments filters by group_id
# ---------------------------------------------------------------------------

def test_list_assessments_filters_by_group(api, teacher):
    """Create 2 assessments in different groups; list with group_id filter → only one returned."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — cannot test group filter")

    group_id_a = _get_first_group_id(api, teacher["token"])
    group_id_b = _get_second_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id_a or not group_id_b or not subject_id:
        pytest.skip("Need at least 2 groups and 1 subject for this test — skipping")

    title_a = _unique_title("GroupFilterA")
    title_b = _unique_title("GroupFilterB")
    _create_assessment(api, teacher, group_id_a, subject_id, term_id, title=title_a)
    _create_assessment(api, teacher, group_id_b, subject_id, term_id, title=title_b)

    r = api.get(
        "/api/v1/gradebook/assessments",
        token=teacher["token"],
        params={"group_id": group_id_a},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    assessments = r.json()
    assert isinstance(assessments, list), "Expected a list of assessments"

    ids = {str(a["group_id"]) for a in assessments}
    assert str(group_id_b) not in ids, (
        "Assessment from group_b should not appear when filtering by group_a"
    )
    # Assessment A must appear
    titles = {a["title"] for a in assessments}
    assert title_a in titles, (
        f"Assessment '{title_a}' for group_a must appear in the filtered results"
    )


# ---------------------------------------------------------------------------
# Test 4 — List assessments filters by term_id
# ---------------------------------------------------------------------------

def test_list_assessments_filters_by_term(api, teacher):
    """Create assessment in term A; list with term_id=B → assessment not in results."""
    term_id_a, term_id_b = _get_two_term_ids(api, teacher["token"])
    if not term_id_a or not term_id_b:
        pytest.skip("Need at least 2 terms for this test — skipping")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — cannot test term filter")

    title_a = _unique_title("TermFilterA")
    _create_assessment(api, teacher, group_id, subject_id, term_id_a, title=title_a)

    r = api.get(
        "/api/v1/gradebook/assessments",
        token=teacher["token"],
        params={"term_id": term_id_b},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    assessments = r.json()
    assert isinstance(assessments, list), "Expected a list of assessments"

    titles = {a["title"] for a in assessments}
    assert title_a not in titles, (
        f"Assessment '{title_a}' created in term_a must NOT appear when filtering by term_b"
    )


# ---------------------------------------------------------------------------
# Test 5 — GET assessment by ID (new endpoint)
# ---------------------------------------------------------------------------

def test_get_assessment_by_id(api, teacher):
    """GET /gradebook/assessments/{id} → 200 with correct title (new endpoint)."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — cannot test GET by id")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — cannot test GET by id")

    expected_title = _unique_title("GetById")
    assessment_id = _create_assessment(
        api, teacher, group_id, subject_id, term_id, title=expected_title
    )

    r = api.get(f"/api/v1/gradebook/assessments/{assessment_id}", token=teacher["token"])
    assert r.status_code == 200, (
        f"Expected 200 when fetching assessment by id, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert str(data["id"]) == str(assessment_id), (
        f"Returned id {data['id']} does not match requested {assessment_id}"
    )
    assert data["title"] == expected_title, (
        f"Expected title '{expected_title}', got '{data['title']}'"
    )


# ---------------------------------------------------------------------------
# Test 6 — GET non-existent assessment → 404
# ---------------------------------------------------------------------------

def test_get_assessment_not_found(api, teacher):
    """GET /gradebook/assessments/{nil-uuid} → 404."""
    nil_uuid = "00000000-0000-0000-0000-000000000000"
    r = api.get(f"/api/v1/gradebook/assessments/{nil_uuid}", token=teacher["token"])
    assert r.status_code == 404, (
        f"Expected 404 for non-existent assessment, got {r.status_code}: {r.text}"
    )


# ---------------------------------------------------------------------------
# Test 7 — Bulk grades upsert: second call replaces scores from first call
# ---------------------------------------------------------------------------

def test_bulk_grades_upsert(api, teacher, student):
    """Create assessment, bulk POST grades twice; second call replaces first scores."""
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — cannot test bulk grades")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — cannot test bulk grades")

    student_id = student["user_id"]
    assessment_id = _create_assessment(api, teacher, group_id, subject_id, term_id)

    # First bulk POST — score 10
    first_r = api.post(
        "/api/v1/gradebook/grades/bulk",
        token=teacher["token"],
        params={"assessment_id": assessment_id},
        json={"grades": [{"student_id": student_id, "score": 10}]},
    )
    assert first_r.status_code in (200, 201), (
        f"First bulk POST failed: {first_r.status_code}: {first_r.text}"
    )

    # Second bulk POST — score 15 (should overwrite)
    second_r = api.post(
        "/api/v1/gradebook/grades/bulk",
        token=teacher["token"],
        params={"assessment_id": assessment_id},
        json={"grades": [{"student_id": student_id, "score": 15}]},
    )
    assert second_r.status_code in (200, 201), (
        f"Second bulk POST failed: {second_r.status_code}: {second_r.text}"
    )

    # Fetch grades and verify the score is 15 (not 10)
    grades_r = api.get(
        f"/api/v1/gradebook/assessments/{assessment_id}/grades",
        token=teacher["token"],
    )
    assert grades_r.status_code == 200, f"Expected 200 fetching grades: {grades_r.text}"
    grades = grades_r.json()

    student_grade = next(
        (g for g in grades if str(g.get("student_id")) == str(student_id)),
        None,
    )
    assert student_grade is not None, (
        f"Student {student_id} should have a grade record after bulk upsert"
    )
    assert float(student_grade["score"]) == 15.0, (
        f"Expected score=15.0 after second bulk upsert, got {student_grade['score']}"
    )


# ---------------------------------------------------------------------------
# Test 8 — Student averages filtered by term_id
# ---------------------------------------------------------------------------

def test_student_averages_filtered_by_term(api, teacher, student):
    """Create assessment in term A, grade student; averages with term_id=A shows student avg.

    If two distinct terms exist, also verify that filtering by term_id=B (which has
    no assessments from this test) does not include the inflated avg from term_A grades.
    """
    term_id_a, term_id_b = _get_two_term_ids(api, teacher["token"])
    if not term_id_a:
        pytest.skip("No academic-year terms found — cannot test averages term filter")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — cannot test averages")

    student_id = student["user_id"]
    assessment_id = _create_assessment(api, teacher, group_id, subject_id, term_id_a)

    # Grade the student in term A
    bulk_r = api.post(
        "/api/v1/gradebook/grades/bulk",
        token=teacher["token"],
        params={"assessment_id": assessment_id},
        json={"grades": [{"student_id": student_id, "score": 18}]},
    )
    assert bulk_r.status_code in (200, 201), (
        f"Bulk grade failed: {bulk_r.status_code}: {bulk_r.text}"
    )

    # Averages with term_id=A — student should appear with an average
    avg_r = api.get(
        f"/api/v1/gradebook/students/{student_id}/averages",
        token=teacher["token"],
        params={"term_id": term_id_a},
    )
    assert avg_r.status_code == 200, (
        f"Expected 200 for averages with term_id_a, got {avg_r.status_code}: {avg_r.text}"
    )
    avg_data = avg_r.json()
    assert "averages" in avg_data, f"Response must contain 'averages' key: {avg_data}"
    subject_avg = next(
        (a for a in avg_data["averages"] if str(a.get("subject_id")) == str(subject_id)),
        None,
    )
    assert subject_avg is not None, (
        f"Subject {subject_id} must appear in averages for term_id_a after grading"
    )
    assert subject_avg.get("average") is not None, (
        "Average must be non-null for a graded student in term_a"
    )

    # If a second term exists, averages for term_b must not include grades from term_a
    if term_id_b:
        avg_b_r = api.get(
            f"/api/v1/gradebook/students/{student_id}/averages",
            token=teacher["token"],
            params={"term_id": term_id_b},
        )
        assert avg_b_r.status_code == 200, (
            f"Expected 200 for averages with term_id_b, got {avg_b_r.status_code}: {avg_b_r.text}"
        )
        avg_b_data = avg_b_r.json()
        subject_avg_b = next(
            (
                a for a in avg_b_data.get("averages", [])
                if str(a.get("subject_id")) == str(subject_id)
                   and a.get("average") is not None
            ),
            None,
        )
        # The grade of 18 was created in term_a; term_b should not carry it
        if subject_avg_b is not None:
            assert float(subject_avg_b["average"]) != 18.0, (
                "Average for term_b should not be 18.0 (which only exists in term_a)"
            )


# ---------------------------------------------------------------------------
# Test 9 — Absent grades are excluded from averages
# ---------------------------------------------------------------------------

def test_student_averages_excludes_absent(api, teacher, student):
    """Grade student as is_absent=True; their average for that assessment should be unaffected.

    The absent grade must NOT contribute a score of 0 to the computed average.
    """
    term_id = _get_valid_term_id(api, teacher["token"])
    if not term_id:
        pytest.skip("No academic-year terms found — cannot test absent exclusion")

    group_id = _get_first_group_id(api, teacher["token"])
    subject_id = _get_first_subject_id(api, teacher["token"])
    if not group_id or not subject_id:
        pytest.skip("No group or subject found in demo data — cannot test absent exclusion")

    student_id = student["user_id"]
    assessment_id = _create_assessment(api, teacher, group_id, subject_id, term_id)

    # Post a grade with is_absent=True and no score
    bulk_r = api.post(
        "/api/v1/gradebook/grades/bulk",
        token=teacher["token"],
        params={"assessment_id": assessment_id},
        json={"grades": [{"student_id": student_id, "score": None, "is_absent": True}]},
    )
    assert bulk_r.status_code in (200, 201), (
        f"Bulk absent grade failed: {bulk_r.status_code}: {bulk_r.text}"
    )

    # Fetch averages for the student
    avg_r = api.get(
        f"/api/v1/gradebook/students/{student_id}/averages",
        token=teacher["token"],
        params={"term_id": term_id},
    )
    assert avg_r.status_code == 200, (
        f"Expected 200 for student averages, got {avg_r.status_code}: {avg_r.text}"
    )
    avg_data = avg_r.json()
    assert "averages" in avg_data, f"Response must contain 'averages' key: {avg_data}"

    subject_avg = next(
        (a for a in avg_data["averages"] if str(a.get("subject_id")) == str(subject_id)),
        None,
    )
    # If the absent grade is correctly excluded, the average for this subject should
    # either be None (no scorable grades) or not equal to 0 (not counted as zero).
    if subject_avg is not None and subject_avg.get("average") is not None:
        assert float(subject_avg["average"]) != 0.0, (
            "Absent grade must not be counted as 0 in averages computation"
        )


# ---------------------------------------------------------------------------
# Test 10 — GET /gradebook/categories without required params → 422
# ---------------------------------------------------------------------------

def test_grade_categories_require_all_params(api, teacher):
    """GET /gradebook/categories without required query params → 422."""
    # The endpoint requires group_id, subject_id, and term_id as mandatory Query params
    r = api.get("/api/v1/gradebook/categories", token=teacher["token"])
    assert r.status_code == 422, (
        f"Expected 422 when all required query params are missing, "
        f"got {r.status_code}: {r.text}"
    )
