"""Tests for catalog (EduliaHub) endpoints."""
import pytest


def test_list_courses(client):
    """Anyone can browse courses (no auth required for catalog)."""
    r = client.get("/api/v1/catalog/courses")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_list_platforms(client):
    """Anyone can list platforms."""
    r = client.get("/api/v1/catalog/platforms")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_course_detail(client, course_id):
    """Get course detail."""
    r = client.get(f"/api/v1/catalog/courses/{course_id}")
    assert r.status_code == 200
    data = r.json()
    assert "title" in data


def test_course_ratings(client, course_id):
    """Get course ratings."""
    r = client.get(f"/api/v1/catalog/courses/{course_id}/ratings")
    assert r.status_code == 200
    data = r.json()
    assert "average_rating" in data
    assert "total_ratings" in data


def test_subscribe_unsubscribe(client, hub_token, course_id):
    """Subscribe and unsubscribe from a course."""
    headers = {"Authorization": f"Bearer {hub_token}"}
    r = client.post(f"/api/v1/catalog/courses/{course_id}/subscribe", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] in ("subscribed", "already_subscribed")

    r = client.delete(f"/api/v1/catalog/courses/{course_id}/subscribe", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "unsubscribed"


def test_rate_course(client, hub_token, course_id):
    """Rate a course."""
    headers = {"Authorization": f"Bearer {hub_token}"}
    r = client.post(f"/api/v1/catalog/courses/{course_id}/rate",
                    json={"rating": 4, "review": "Excellent course"},
                    headers=headers)
    assert r.status_code == 200


def test_rate_invalid(client, hub_token, course_id):
    """Invalid rating rejected."""
    headers = {"Authorization": f"Bearer {hub_token}"}
    r = client.post(f"/api/v1/catalog/courses/{course_id}/rate",
                    json={"rating": 6},
                    headers=headers)
    assert r.status_code == 400
