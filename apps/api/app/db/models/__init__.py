# Import all models here so Alembic can discover them
from app.db.models.tenant import AcademicYear, Campus, Tenant, Term  # noqa: F401
from app.db.models.user import Relationship, Role, User, UserRole  # noqa: F401
