"""Tests for gradebook (assessments + grades)."""
import pytest


def test_list_assessments(client, teacher_token):
    """Teacher can list assessments."""
    r = client.get("/api/v1/gradebook/assessments", headers={"Authorization": f"Bearer {teacher_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_student_grades(client, student_token):
    """Student can view own grades."""
    r = client.get("/api/v1/gradebook/student-grades", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))


def test_student_grades_unauthenticated(client):
    """Unauthenticated request fails."""
    r = client.get("/api/v1/gradebook/student-grades")
    assert r.status_code in (401, 403)


def test_create_assessment_as_student_fails(client, student_token):
    """Students cannot create assessments."""
    r = client.post("/api/v1/gradebook/assessments",
                    json={"title": "Test", "subject_id": "fake", "group_id": "fake", "max_score": 20},
                    headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code in (403, 422)
