"""
Shared test fixtures for Edulia API tests.
Tests run against the live demo instance with seeded data.
"""
import pytest
import requests
from typing import Optional

BASE_URL = "http://192.168.0.120:8000"
PASSWORD = "demo2026"

ACCOUNTS = {
    "admin": "admin@demo.edulia.io",
    "teacher_martin": "prof.martin@demo.edulia.io",
    "teacher_dubois": "prof.dubois@demo.edulia.io",
    "student_emma": "emma.leroy@demo.edulia.io",
    "student_lucas": "lucas.moreau@demo.edulia.io",
    "parent": "parent.leroy@demo.edulia.io",
    "tutor": "sophie@demo.edulia.io",
    "tutor_student": "julie.petit@demo.edulia.io",
    "enterprise_hr": "rh@demo.edulia.io",
    "employee": "marie.lefevre@demo.edulia.io",
}


def _login(email: str) -> dict:
    """Login and return {token, user_id, tenant_id, role}."""
    r = requests.post(f"{BASE_URL}/api/v1/auth/login",
                      json={"email": email, "password": PASSWORD}, timeout=10)
    r.raise_for_status()
    data = r.json()
    return {
        "token": data["access_token"],
        "user_id": data["user"]["id"],
        "tenant_id": data["user"].get("tenant_id"),
        "role": data["user"].get("role"),
    }


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class ApiClient:
    """Thin wrapper around requests for API testing."""
    def __init__(self):
        self.base = BASE_URL

    def get(self, path, token=None, **kwargs):
        h = _headers(token) if token else {}
        return requests.get(f"{self.base}{path}", headers=h, timeout=10, **kwargs)

    def post(self, path, token=None, **kwargs):
        h = _headers(token) if token else {}
        return requests.post(f"{self.base}{path}", headers=h, timeout=10, **kwargs)

    def patch(self, path, token=None, **kwargs):
        h = _headers(token) if token else {}
        return requests.patch(f"{self.base}{path}", headers=h, timeout=10, **kwargs)

    def put(self, path, token=None, **kwargs):
        h = _headers(token) if token else {}
        return requests.put(f"{self.base}{path}", headers=h, timeout=10, **kwargs)

    def delete(self, path, token=None, **kwargs):
        h = _headers(token) if token else {}
        return requests.delete(f"{self.base}{path}", headers=h, timeout=10, **kwargs)


@pytest.fixture(scope="session")
def api():
    return ApiClient()


@pytest.fixture(scope="session")
def admin():
    return _login(ACCOUNTS["admin"])

@pytest.fixture(scope="session")
def teacher():
    return _login(ACCOUNTS["teacher_martin"])

@pytest.fixture(scope="session")
def teacher_dubois():
    return _login(ACCOUNTS["teacher_dubois"])

@pytest.fixture(scope="session")
def student():
    return _login(ACCOUNTS["student_emma"])

@pytest.fixture(scope="session")
def student_lucas():
    return _login(ACCOUNTS["student_lucas"])

@pytest.fixture(scope="session")
def parent():
    return _login(ACCOUNTS["parent"])

@pytest.fixture(scope="session")
def tutor():
    return _login(ACCOUNTS["tutor"])

@pytest.fixture(scope="session")
def tutor_student():
    return _login(ACCOUNTS["tutor_student"])

@pytest.fixture(scope="session")
def enterprise_hr():
    return _login(ACCOUNTS["enterprise_hr"])

@pytest.fixture(scope="session")
def employee():
    return _login(ACCOUNTS["employee"])
