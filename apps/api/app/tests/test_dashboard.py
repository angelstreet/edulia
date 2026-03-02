"""Tests for dashboard endpoints."""
import pytest
from fastapi.testclient import TestClient


def test_dashboard_stats_admin(client, admin_token):
    """Admin sees school-wide stats."""
    r = client.get("/api/v1/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "stats" in data
    assert isinstance(data["stats"], list)
    assert any(s["key"] == "students" for s in data["stats"])


def test_dashboard_stats_teacher(client, teacher_token):
    """Teacher sees personal stats."""
    r = client.get("/api/v1/dashboard/stats", headers={"Authorization": f"Bearer {teacher_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "stats" in data


def test_dashboard_stats_student(client, student_token):
    """Student sees personal stats."""
    r = client.get("/api/v1/dashboard/stats", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200


def test_dashboard_stats_unauthenticated(client):
    """Unauthenticated request fails."""
    r = client.get("/api/v1/dashboard/stats")
    assert r.status_code in (401, 403)
