"""Tests for timetable endpoints."""
import pytest


def test_list_sessions(client, admin_token):
    """Admin can list timetable sessions."""
    r = client.get("/api/v1/timetable/sessions", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_conflict_detection(client, admin_token):
    """Conflict detection endpoint works."""
    r = client.post("/api/v1/timetable/check-conflicts",
                    json={"day_of_week": 1, "start_time": "08:00", "end_time": "09:00"},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "conflicts" in data
    assert "has_conflicts" in data


def test_sessions_unauthenticated(client):
    """Unauthenticated request fails."""
    r = client.get("/api/v1/timetable/sessions")
    assert r.status_code in (401, 403)
