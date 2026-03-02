"""Tests for homework endpoints."""
import pytest


def test_list_homework(client, student_token):
    """Student can list homework."""
    r = client.get("/api/v1/homework", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_homework_unauthenticated(client):
    """Unauthenticated request fails."""
    r = client.get("/api/v1/homework")
    assert r.status_code in (401, 403)
