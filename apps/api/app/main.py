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
from app.modules.homework.router import router as homework_router
from app.modules.community.router import router as community_router
from app.modules.forms.router import router as forms_router

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
app.include_router(homework_router)
app.include_router(community_router)
app.include_router(forms_router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
