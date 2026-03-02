"""Catalog (EduliaHub) tests — 10 cases."""

def test_list_courses(api):
    r = api.get("/api/v1/catalog/courses")
    assert r.status_code == 200
    courses = r.json()
    assert isinstance(courses, list)
    assert len(courses) >= 10

def test_list_platforms(api):
    r = api.get("/api/v1/catalog/platforms")
    assert r.status_code == 200
    platforms = r.json()
    assert len(platforms) >= 10

def test_platform_detail(api):
    platforms = api.get("/api/v1/catalog/platforms").json()
    if platforms:
        slug = platforms[0].get("slug") or platforms[0].get("id")
        r = api.get(f"/api/v1/catalog/platforms/{slug}")
        assert r.status_code == 200

def test_course_detail(api):
    courses = api.get("/api/v1/catalog/courses").json()
    if courses:
        r = api.get(f"/api/v1/catalog/courses/{courses[0]['id']}")
        assert r.status_code == 200
        assert "title" in r.json()

def test_course_ratings_empty(api):
    courses = api.get("/api/v1/catalog/courses").json()
    if courses:
        r = api.get(f"/api/v1/catalog/courses/{courses[0]['id']}/ratings")
        assert r.status_code == 200
        data = r.json()
        assert "total_ratings" in data

def test_subscribe_to_course(api, student):
    courses = api.get("/api/v1/catalog/courses").json()
    if courses:
        r = api.post(f"/api/v1/catalog/courses/{courses[0]['id']}/subscribe", token=student["token"])
        assert r.status_code == 200

def test_unsubscribe_from_course(api, student):
    courses = api.get("/api/v1/catalog/courses").json()
    if courses:
        api.post(f"/api/v1/catalog/courses/{courses[0]['id']}/subscribe", token=student["token"])
        r = api.delete(f"/api/v1/catalog/courses/{courses[0]['id']}/subscribe", token=student["token"])
        assert r.status_code == 200

def test_rate_course_valid(api, student):
    courses = api.get("/api/v1/catalog/courses").json()
    if courses:
        r = api.post(f"/api/v1/catalog/courses/{courses[0]['id']}/rate", token=student["token"],
                     json={"rating": 5, "review": "Excellent!"})
        assert r.status_code == 200

def test_rate_course_invalid(api, student):
    courses = api.get("/api/v1/catalog/courses").json()
    if courses:
        r = api.post(f"/api/v1/catalog/courses/{courses[0]['id']}/rate", token=student["token"],
                     json={"rating": 0})
        assert r.status_code == 400

def test_my_courses(api, student):
    r = api.get("/api/v1/catalog/my-courses", token=student["token"])
    assert r.status_code == 200
