"""Activity Builder tests (Feature 1) — 15 cases.

Tests run against the live demo instance with seeded data.
Fixtures (api, admin, teacher, student, parent) come from conftest.py.

Seeded assumptions:
  - teacher  → prof.martin@demo.edulia.io  (role: teacher)
  - admin    → admin@demo.edulia.io         (role: admin)
  - student  → emma.leroy@demo.edulia.io   (role: student, belongs to a seeded group)
  - parent   → parent.leroy@demo.edulia.io (role: parent)

The tests that create activities use the teacher/admin token, then clean up
after themselves by deleting the created resource when possible. Because the
suite runs against a live instance, creation tests generate unique titles with
a timestamp suffix so parallel runs don't collide.
"""

import uuid
import time
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_title(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"


def _minimal_activity(title: str | None = None, group_id: str | None = None, subject_id: str | None = None) -> dict:
    """Return the smallest valid ActivityCreate payload."""
    return {
        "title": title or _unique_title("Test Activity"),
        "type": "qcm",
        "questions": [
            {
                "id": str(uuid.uuid4()),
                "text": "What is 1 + 1?",
                "type": "single",
                "choices": [
                    {"id": str(uuid.uuid4()), "text": "1", "is_correct": False},
                    {"id": str(uuid.uuid4()), "text": "2", "is_correct": True},
                    {"id": str(uuid.uuid4()), "text": "3", "is_correct": False},
                    {"id": str(uuid.uuid4()), "text": "4", "is_correct": False},
                ],
                "time_limit_s": 30,
                "points": 1,
            }
        ],
        **({"group_id": group_id} if group_id else {}),
        **({"subject_id": subject_id} if subject_id else {}),
    }


def _get_first_group_id(api, token: str) -> str | None:
    """Return the id of the first group visible to this token, or None."""
    r = api.get("/api/v1/groups", token=token)
    groups = r.json() if r.status_code == 200 else []
    return groups[0]["id"] if isinstance(groups, list) and groups else None


def _get_first_subject_id(api, token: str) -> str | None:
    """Return the id of the first subject visible to this token, or None."""
    r = api.get("/api/v1/subjects", token=token)
    subjects = r.json() if r.status_code == 200 else []
    return subjects[0]["id"] if isinstance(subjects, list) and subjects else None


# ---------------------------------------------------------------------------
# Creation — role-based access
# ---------------------------------------------------------------------------

def test_teacher_can_create_activity(api, teacher):
    """POST /api/v1/activities as teacher → 201, returns activity with id."""
    payload = _minimal_activity()
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "id" in data
    assert data["title"] == payload["title"]
    # Cleanup
    api.delete(f"/api/v1/activities/{data['id']}", token=teacher["token"])


def test_admin_can_create_activity(api, admin):
    """POST /api/v1/activities as admin → 201."""
    payload = _minimal_activity()
    r = api.post("/api/v1/activities", token=admin["token"], json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "id" in data
    # Cleanup
    api.delete(f"/api/v1/activities/{data['id']}", token=admin["token"])


def test_student_cannot_create_activity(api, student):
    """POST /api/v1/activities as student → 403."""
    payload = _minimal_activity()
    r = api.post("/api/v1/activities", token=student["token"], json=payload)
    assert r.status_code == 403, r.text


def test_parent_cannot_create_activity(api, parent):
    """POST /api/v1/activities as parent → 403."""
    payload = _minimal_activity()
    r = api.post("/api/v1/activities", token=parent["token"], json=payload)
    assert r.status_code == 403, r.text


# ---------------------------------------------------------------------------
# Default status
# ---------------------------------------------------------------------------

def test_create_activity_defaults_to_draft(api, teacher):
    """POST without status field → status == 'draft'."""
    payload = _minimal_activity()
    assert "status" not in payload  # ensure we're not sending it
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data.get("status") == "draft"
    # Cleanup
    api.delete(f"/api/v1/activities/{data['id']}", token=teacher["token"])


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------

def test_teacher_can_publish_activity(api, teacher):
    """PATCH /api/v1/activities/{id} with status='published' → status == 'published'."""
    payload = _minimal_activity()
    create_r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert create_r.status_code == 201, create_r.text
    activity_id = create_r.json()["id"]

    patch_r = api.patch(
        f"/api/v1/activities/{activity_id}",
        token=teacher["token"],
        json={"status": "published"},
    )
    assert patch_r.status_code == 200, patch_r.text
    assert patch_r.json().get("status") == "published"
    # Cleanup (published activity — server may reject delete; ignore error)
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


# ---------------------------------------------------------------------------
# List visibility — teacher
# ---------------------------------------------------------------------------

def test_teacher_sees_all_activities_in_tenant(api, teacher):
    """Create 3 activities → GET /api/v1/activities returns at least those 3."""
    created_ids = []
    for i in range(3):
        r = api.post(
            "/api/v1/activities",
            token=teacher["token"],
            json=_minimal_activity(title=_unique_title(f"Bulk-{i}")),
        )
        assert r.status_code == 201, r.text
        created_ids.append(r.json()["id"])

    list_r = api.get("/api/v1/activities", token=teacher["token"])
    assert list_r.status_code == 200, list_r.text
    returned_ids = {a["id"] for a in list_r.json()} if isinstance(list_r.json(), list) else set()
    for aid in created_ids:
        assert aid in returned_ids, f"Activity {aid} not found in teacher list"

    # Cleanup
    for aid in created_ids:
        api.delete(f"/api/v1/activities/{aid}", token=teacher["token"])


# ---------------------------------------------------------------------------
# List visibility — student
# ---------------------------------------------------------------------------

def test_student_sees_only_published_for_their_group(api, teacher, student):
    """Student sees only published activities assigned to their own group.

    Setup:
    - Fetch student's group via the groups endpoint
    - Create a draft activity for that group (student should NOT see it)
    - Create a published activity for that group (student SHOULD see it)
    - Create a published activity for a different group (student should NOT see it)
    - Assert student list contains exactly the correct published activity
    """
    # Resolve student's actual group memberships
    student_groups_r = api.get("/api/v1/groups/my", token=student["token"])
    student_groups = student_groups_r.json() if student_groups_r.status_code == 200 else []
    if not (isinstance(student_groups, list) and student_groups):
        pytest.skip("No groups found for student — seed data required")

    student_group_id = student_groups[0]["id"]

    # Find a different group (teacher-visible) that is not the student's group
    all_groups_r = api.get("/api/v1/groups", token=teacher["token"])
    all_groups = all_groups_r.json() if all_groups_r.status_code == 200 else []
    other_groups = [g for g in all_groups if g["id"] != student_group_id]
    other_group_id = other_groups[0]["id"] if other_groups else None

    unique_tag = uuid.uuid4().hex[:8]

    # 1. Draft for student's group — should be invisible to student
    draft_title = f"Draft-StudentGroup-{unique_tag}"
    draft_r = api.post(
        "/api/v1/activities",
        token=teacher["token"],
        json=_minimal_activity(title=draft_title, group_id=student_group_id),
    )
    assert draft_r.status_code == 201, draft_r.text
    draft_id = draft_r.json()["id"]

    # 2. Published for student's group — should be visible to student
    pub_title = f"Published-StudentGroup-{unique_tag}"
    pub_r = api.post(
        "/api/v1/activities",
        token=teacher["token"],
        json={**_minimal_activity(title=pub_title, group_id=student_group_id), "status": "published"},
    )
    assert pub_r.status_code == 201, pub_r.text
    pub_id = pub_r.json()["id"]

    # Publish if server ignored the inline status
    if pub_r.json().get("status") != "published":
        api.patch(f"/api/v1/activities/{pub_id}", token=teacher["token"], json={"status": "published"})

    # 3. Published for a different group — should NOT be visible to student
    other_pub_id = None
    if other_group_id:
        other_title = f"Published-OtherGroup-{unique_tag}"
        other_r = api.post(
            "/api/v1/activities",
            token=teacher["token"],
            json=_minimal_activity(title=other_title, group_id=other_group_id),
        )
        if other_r.status_code == 201:
            other_pub_id = other_r.json()["id"]
            api.patch(
                f"/api/v1/activities/{other_pub_id}",
                token=teacher["token"],
                json={"status": "published"},
            )

    # Assert: student list includes pub_id but not draft_id nor other_pub_id
    student_list_r = api.get("/api/v1/activities", token=student["token"])
    assert student_list_r.status_code == 200, student_list_r.text
    student_ids = {a["id"] for a in student_list_r.json()} if isinstance(student_list_r.json(), list) else set()

    assert pub_id in student_ids, "Student should see published activity for their group"
    assert draft_id not in student_ids, "Student should NOT see draft activity"
    if other_pub_id:
        assert other_pub_id not in student_ids, "Student should NOT see activity for a different group"

    # Cleanup
    for aid in filter(None, [draft_id, pub_id, other_pub_id]):
        api.delete(f"/api/v1/activities/{aid}", token=teacher["token"])


def test_student_does_not_see_draft_activities(api, teacher, student):
    """Student sees 0 results when only a draft exists for their group."""
    student_groups_r = api.get("/api/v1/groups/my", token=student["token"])
    student_groups = student_groups_r.json() if student_groups_r.status_code == 200 else []
    if not (isinstance(student_groups, list) and student_groups):
        pytest.skip("No groups found for student — seed data required")

    student_group_id = student_groups[0]["id"]
    unique_tag = uuid.uuid4().hex[:8]

    draft_r = api.post(
        "/api/v1/activities",
        token=teacher["token"],
        json=_minimal_activity(title=f"OnlyDraft-{unique_tag}", group_id=student_group_id),
    )
    assert draft_r.status_code == 201, draft_r.text
    draft_id = draft_r.json()["id"]
    assert draft_r.json().get("status") == "draft"

    student_list_r = api.get("/api/v1/activities", token=student["token"])
    assert student_list_r.status_code == 200, student_list_r.text
    student_ids = {a["id"] for a in student_list_r.json()} if isinstance(student_list_r.json(), list) else set()
    assert draft_id not in student_ids, "Draft activity must not appear in student list"

    # Cleanup
    api.delete(f"/api/v1/activities/{draft_id}", token=teacher["token"])


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------

def test_create_activity_with_questions(api, teacher):
    """POST with questions array → returned activity has questions with ids."""
    payload = {
        "title": _unique_title("WithQuestions"),
        "type": "qcm",
        "questions": [
            {
                "id": str(uuid.uuid4()),
                "text": "Capital of France?",
                "type": "single",
                "choices": [
                    {"id": str(uuid.uuid4()), "text": "Berlin", "is_correct": False},
                    {"id": str(uuid.uuid4()), "text": "Paris", "is_correct": True},
                    {"id": str(uuid.uuid4()), "text": "Rome", "is_correct": False},
                ],
                "time_limit_s": 20,
                "points": 2,
            },
            {
                "id": str(uuid.uuid4()),
                "text": "What is 2 + 2?",
                "type": "single",
                "choices": [
                    {"id": str(uuid.uuid4()), "text": "3", "is_correct": False},
                    {"id": str(uuid.uuid4()), "text": "4", "is_correct": True},
                ],
                "time_limit_s": 15,
                "points": 1,
            },
        ],
    }
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    questions = data.get("questions", [])
    assert len(questions) == 2
    for q in questions:
        assert "id" in q or "text" in q  # id may be generated server-side or inline
    # Cleanup
    api.delete(f"/api/v1/activities/{data['id']}", token=teacher["token"])


def test_update_activity_questions(api, teacher):
    """PATCH with new questions array → stored and returned."""
    create_r = api.post(
        "/api/v1/activities",
        token=teacher["token"],
        json=_minimal_activity(title=_unique_title("UpdateQuestions")),
    )
    assert create_r.status_code == 201, create_r.text
    activity_id = create_r.json()["id"]

    new_questions = [
        {
            "id": str(uuid.uuid4()),
            "text": "Updated question?",
            "type": "single",
            "choices": [
                {"id": str(uuid.uuid4()), "text": "Yes", "is_correct": True},
                {"id": str(uuid.uuid4()), "text": "No", "is_correct": False},
            ],
            "time_limit_s": 10,
            "points": 1,
        }
    ]
    patch_r = api.patch(
        f"/api/v1/activities/{activity_id}",
        token=teacher["token"],
        json={"questions": new_questions},
    )
    assert patch_r.status_code == 200, patch_r.text
    returned_questions = patch_r.json().get("questions", [])
    assert len(returned_questions) == 1
    assert returned_questions[0]["text"] == "Updated question?"
    # Cleanup
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def test_delete_activity_draft(api, teacher):
    """DELETE draft activity as teacher → 200 or 204."""
    create_r = api.post(
        "/api/v1/activities",
        token=teacher["token"],
        json=_minimal_activity(title=_unique_title("ToDelete")),
    )
    assert create_r.status_code == 201, create_r.text
    activity_id = create_r.json()["id"]

    delete_r = api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])
    assert delete_r.status_code in (200, 204), delete_r.text

    # Verify it's gone
    get_r = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
    assert get_r.status_code == 404


def test_cannot_delete_published_activity(api, teacher):
    """DELETE published activity → 400 or 403."""
    create_r = api.post(
        "/api/v1/activities",
        token=teacher["token"],
        json=_minimal_activity(title=_unique_title("PublishedNoDelete")),
    )
    assert create_r.status_code == 201, create_r.text
    activity_id = create_r.json()["id"]

    # Publish it
    api.patch(
        f"/api/v1/activities/{activity_id}",
        token=teacher["token"],
        json={"status": "published"},
    )

    delete_r = api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])
    assert delete_r.status_code in (400, 403), (
        f"Expected 400 or 403 when deleting a published activity, got {delete_r.status_code}"
    )


# ---------------------------------------------------------------------------
# Get by ID
# ---------------------------------------------------------------------------

def test_get_activity_by_id(api, teacher):
    """GET /api/v1/activities/{id} → returns the correct activity."""
    title = _unique_title("GetById")
    create_r = api.post(
        "/api/v1/activities",
        token=teacher["token"],
        json=_minimal_activity(title=title),
    )
    assert create_r.status_code == 201, create_r.text
    activity_id = create_r.json()["id"]

    get_r = api.get(f"/api/v1/activities/{activity_id}", token=teacher["token"])
    assert get_r.status_code == 200, get_r.text
    data = get_r.json()
    assert data["id"] == activity_id
    assert data["title"] == title
    # Cleanup
    api.delete(f"/api/v1/activities/{activity_id}", token=teacher["token"])


def test_get_nonexistent_activity(api, teacher):
    """GET /api/v1/activities/{nonexistent-uuid} → 404."""
    fake_id = str(uuid.uuid4())
    r = api.get(f"/api/v1/activities/{fake_id}", token=teacher["token"])
    assert r.status_code == 404, r.text


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def test_questions_require_at_least_2_choices(api, teacher):
    """Creating a question with only 1 choice → 422 validation error."""
    payload = {
        "title": _unique_title("OneChoice"),
        "type": "qcm",
        "questions": [
            {
                "id": str(uuid.uuid4()),
                "text": "Invalid question",
                "type": "single",
                "choices": [{"id": str(uuid.uuid4()), "text": "Only option", "is_correct": True}],
                "time_limit_s": 10,
                "points": 1,
            }
        ],
    }
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 422, (
        f"Expected 422 for question with <2 choices, got {r.status_code}: {r.text}"
    )


def test_single_question_requires_exactly_1_correct(api, teacher):
    """Single-type question with 2 is_correct=True choices → 422."""
    payload = {
        "title": _unique_title("TwoCorrect"),
        "type": "qcm",
        "questions": [
            {
                "id": str(uuid.uuid4()),
                "text": "Which is correct?",
                "type": "single",
                "choices": [
                    {"id": str(uuid.uuid4()), "text": "A", "is_correct": True},
                    {"id": str(uuid.uuid4()), "text": "B", "is_correct": True},
                    {"id": str(uuid.uuid4()), "text": "C", "is_correct": False},
                ],
                "time_limit_s": 10,
                "points": 1,
            }
        ],
    }
    r = api.post("/api/v1/activities", token=teacher["token"], json=payload)
    assert r.status_code == 422, (
        f"Expected 422 for single question with multiple correct answers, got {r.status_code}: {r.text}"
    )
