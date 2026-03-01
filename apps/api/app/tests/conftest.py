import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.database import get_db
from app.db.models.tenant import Tenant
from app.db.models.user import Role, User, UserRole
from app.main import app

# Use a separate test database
TEST_DB_URL = settings.DATABASE_URL.rsplit("/", 1)[0] + "/edulia_test"


@pytest.fixture(scope="session")
def db_engine():
    """Create tables in the test database."""
    engine = create_engine(TEST_DB_URL)
    # Import all models to register them
    import app.db.models  # noqa: F401

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a fresh DB session per test with rollback."""
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Test client with overridden DB dependency."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def tenant(db_session):
    """Create a test tenant."""
    t = Tenant(
        name="Test School",
        slug="test-school",
        type="school",
        settings={"timezone": "Europe/Paris", "locale": "fr"},
    )
    db_session.add(t)
    db_session.flush()
    return t


@pytest.fixture
def admin_role(db_session, tenant):
    """Create admin role with all permissions."""
    role = Role(
        tenant_id=tenant.id,
        code="admin",
        display_name="Administrator",
        is_system=True,
        permissions=[
            "admin.user.create",
            "admin.user.edit",
            "admin.user.delete",
            "admin.user.view",
            "admin.tenant.edit",
            "gradebook.grade.create",
            "gradebook.grade.edit",
            "attendance.record.create",
        ],
    )
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture
def teacher_role(db_session, tenant):
    """Create teacher role."""
    role = Role(
        tenant_id=tenant.id,
        code="teacher",
        display_name="Teacher",
        is_system=True,
        permissions=[
            "gradebook.grade.create",
            "gradebook.grade.edit",
            "attendance.record.create",
            "messaging.thread.send",
        ],
    )
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture
def student_role(db_session, tenant):
    """Create student role."""
    role = Role(
        tenant_id=tenant.id,
        code="student",
        display_name="Student",
        is_system=True,
        permissions=[
            "gradebook.grade.view",
            "messaging.thread.send",
        ],
    )
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture
def parent_role(db_session, tenant):
    """Create parent role."""
    role = Role(
        tenant_id=tenant.id,
        code="parent",
        display_name="Parent",
        is_system=True,
        permissions=[
            "gradebook.grade.view",
            "attendance.record.view",
            "messaging.thread.send",
        ],
    )
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture
def admin_user(db_session, tenant, admin_role):
    """Create an admin user."""
    user = User(
        tenant_id=tenant.id,
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        first_name="Admin",
        last_name="User",
        display_name="Admin User",
        status="active",
    )
    db_session.add(user)
    db_session.flush()
    ur = UserRole(user_id=user.id, role_id=admin_role.id, scope_type="tenant")
    db_session.add(ur)
    db_session.flush()
    return user


@pytest.fixture
def teacher_user(db_session, tenant, teacher_role):
    """Create a teacher user."""
    user = User(
        tenant_id=tenant.id,
        email="teacher@test.com",
        password_hash=hash_password("teacher123"),
        first_name="Jean",
        last_name="Dupont",
        display_name="Jean Dupont",
        status="active",
    )
    db_session.add(user)
    db_session.flush()
    ur = UserRole(user_id=user.id, role_id=teacher_role.id, scope_type="tenant")
    db_session.add(ur)
    db_session.flush()
    return user


@pytest.fixture
def student_user(db_session, tenant, student_role):
    """Create a student user."""
    user = User(
        tenant_id=tenant.id,
        email="student@test.com",
        password_hash=hash_password("student123"),
        first_name="Marie",
        last_name="Martin",
        display_name="Marie Martin",
        status="active",
    )
    db_session.add(user)
    db_session.flush()
    ur = UserRole(user_id=user.id, role_id=student_role.id, scope_type="tenant")
    db_session.add(ur)
    db_session.flush()
    return user


@pytest.fixture
def parent_user(db_session, tenant, parent_role):
    """Create a parent user."""
    user = User(
        tenant_id=tenant.id,
        email="parent@test.com",
        password_hash=hash_password("parent123"),
        first_name="Pierre",
        last_name="Martin",
        display_name="Pierre Martin",
        status="active",
    )
    db_session.add(user)
    db_session.flush()
    ur = UserRole(user_id=user.id, role_id=parent_role.id, scope_type="tenant")
    db_session.add(ur)
    db_session.flush()
    return user


def get_auth_header(client, email: str, password: str) -> dict:
    """Helper to login and return auth header."""
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
