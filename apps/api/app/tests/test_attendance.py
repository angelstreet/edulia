"""Tests for attendance endpoints."""
import pytest


def test_list_attendance(client, admin_token):
    """Admin can list attendance."""
    r = client.get("/api/v1/attendance", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200


def test_attendance_unauthenticated(client):
    """Unauthenticated request fails."""
    r = client.get("/api/v1/attendance")
    assert r.status_code in (401, 403)
