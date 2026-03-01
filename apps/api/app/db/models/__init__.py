# Import all models here so Alembic can discover them
from app.db.models.tenant import AcademicYear, Campus, Tenant, Term  # noqa: F401
from app.db.models.user import Relationship, Role, User, UserRole  # noqa: F401
from app.db.models.subject import Subject  # noqa: F401
from app.db.models.group import Group, GroupMembership  # noqa: F401
from app.db.models.message import Message, Thread, ThreadParticipant  # noqa: F401
from app.db.models.notification import Notification  # noqa: F401
from app.db.models.file import File  # noqa: F401
