# Import all models here so Alembic can discover them
from app.db.models.tenant import AcademicYear, Campus, Tenant, Term  # noqa: F401
from app.db.models.user import Relationship, Role, User, UserRole  # noqa: F401
from app.db.models.subject import Subject  # noqa: F401
from app.db.models.group import Group, GroupMembership  # noqa: F401
from app.db.models.message import Message, Thread, ThreadParticipant  # noqa: F401
from app.db.models.notification import Notification  # noqa: F401
from app.db.models.file import File  # noqa: F401
from app.db.models.gradebook import Assessment, Grade, GradeCategory  # noqa: F401
from app.db.models.timetable import Room, Session, SessionException  # noqa: F401
from app.db.models.attendance import AttendanceRecord  # noqa: F401
from app.db.models.homework import Homework, Submission  # noqa: F401
from app.db.models.forms import Form, FormField, FormResponse  # noqa: F401
from app.db.models.wallet import Wallet, WalletTransaction, ServiceCatalog, ServiceSubscription  # noqa: F401
from app.db.models.catalog import Course, LearningPlatform  # noqa: F401
from app.db.models.certificate import Certificate  # noqa: F401
from app.db.models.portfolio import Portfolio  # noqa: F401
from app.db.models.calendar import CalendarEvent  # noqa: F401
from app.db.models.school_life import Incident  # noqa: F401
from app.db.models.activity import Activity  # noqa: F401
from app.db.models.activity_attempt import ActivityAttempt  # noqa: F401
from app.db.models.live_session import LiveSession  # noqa: F401
from app.db.models.enrollment import EnrollmentRequest  # noqa: F401
from app.db.models.absence_justification import AbsenceJustification  # noqa: F401
from app.db.models.health_record import HealthRecord  # noqa: F401
from app.db.models.tutoring import TutoringSession, TutoringPackage, TutoringInvoice  # noqa: F401
