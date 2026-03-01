from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import TenantMiddleware
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router

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


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
