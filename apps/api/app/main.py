from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import TenantMiddleware
from app.modules.academic_years.router import router as academic_years_router
from app.modules.auth.router import router as auth_router
from app.modules.files.router import router as files_router
from app.modules.groups.router import router as groups_router
from app.modules.messaging.router import router as messaging_router
from app.modules.notifications.router import router as notifications_router
from app.modules.subjects.router import router as subjects_router
from app.modules.tenant.router import router as tenant_router
from app.modules.attendance.router import router as attendance_router
from app.modules.timetable.router import router as timetable_router
from app.modules.users.router import router as users_router
from app.modules.gradebook.router import router as gradebook_router
from app.modules.report_cards.router import router as report_cards_router
from app.modules.homework.router import router as homework_router
from app.modules.community.router import router as community_router
from app.modules.forms.router import router as forms_router
from app.modules.wallet.router import router as wallet_router
from app.modules.catalog.router import router as catalog_router
from app.modules.certificates.router import router as certificates_router
from app.modules.portfolio.router import router as portfolio_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.calendar.router import router as calendar_router
from app.modules.school_life.router import router as school_life_router
from app.modules.activity.router import router as activity_router
from app.modules.activity.router import sessions_router as activity_sessions_router
from app.modules.activity.router import students_router as activity_students_router
from app.modules.activity.session_ws import ws_router as session_ws_router
from app.modules.enrollment.router import router as enrollment_router
from app.modules.absence.router import router as absence_router
from app.modules.health.router import router as health_router
from app.modules.tutoring.router import router as tutoring_router

app = FastAPI(title="Edulia API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tenant resolution
app.add_middleware(TenantMiddleware)

# Exception handlers
register_exception_handlers(app)

# Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tenant_router)
app.include_router(academic_years_router)
app.include_router(subjects_router)
app.include_router(groups_router)
app.include_router(messaging_router)
app.include_router(notifications_router)
app.include_router(files_router)
app.include_router(timetable_router)
app.include_router(attendance_router)
app.include_router(gradebook_router)
app.include_router(report_cards_router, prefix="/api/v1")
app.include_router(homework_router)
app.include_router(community_router)
app.include_router(forms_router)
app.include_router(wallet_router)
app.include_router(catalog_router)
app.include_router(certificates_router)
app.include_router(portfolio_router)
app.include_router(dashboard_router)
app.include_router(calendar_router)
app.include_router(school_life_router)
app.include_router(activity_router)
app.include_router(activity_students_router)
app.include_router(activity_sessions_router)
app.include_router(session_ws_router)
app.include_router(enrollment_router)
app.include_router(absence_router)
app.include_router(health_router)
app.include_router(tutoring_router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
