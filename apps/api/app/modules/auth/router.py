from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.modules.auth.schemas import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    InviteAcceptRequest,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    RegisterRequest,
    UserInfo,
)
from app.modules.auth.service import (
    accept_invite,
    authenticate_user,
    create_tokens,
    generate_reset_token,
    refresh_access_token,
    reset_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    tokens = create_tokens(user)

    roles = []
    permissions = []
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            roles.append(ur.role.code)
            if ur.role.permissions:
                permissions.extend(ur.role.permissions)

    user_info = UserInfo(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        role=roles[0] if roles else "user",
        permissions=list(set(permissions)),
    )

    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=user_info,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    access_token = refresh_access_token(db, request.refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    generate_reset_token(db, request.email)
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password_endpoint(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_password(db, request.token, request.new_password)
    return {"message": "Password reset successful"}


@router.post("/invite/accept")
def accept_invite_endpoint(request: InviteAcceptRequest, db: Session = Depends(get_db)):
    user = accept_invite(db, request.token, request.password)
    return {"message": "Account activated", "user_id": str(user.id)}


@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Self-signup for EduliaHub learners. Creates user in the hub tenant."""
    from app.db.models.tenant import Tenant
    from app.db.models.user import Role, User, UserRole
    from app.core.security import hash_password, create_access_token, create_refresh_token

    # Get or create the hub tenant
    hub_tenant = db.query(Tenant).filter(Tenant.slug == "eduliahub").first()
    if not hub_tenant:
        hub_tenant = Tenant(name="EduliaHub", slug="eduliahub", type="hub",
                           settings={"enabled_modules": []})
        db.add(hub_tenant)
        db.flush()
        # Create learner role
        learner_role = Role(tenant_id=hub_tenant.id, code="learner",
                           display_name="Learner", is_system=True,
                           permissions=["messaging.thread.send"])
        db.add(learner_role)
        db.flush()

    # Check if email already exists in hub tenant
    existing = db.query(User).filter(User.email == request.email,
                                      User.tenant_id == hub_tenant.id).first()
    if existing:
        from fastapi import HTTPException
        raise HTTPException(409, "Email already registered")

    # Get learner role
    learner_role = db.query(Role).filter(Role.tenant_id == hub_tenant.id,
                                          Role.code == "learner").first()

    user = User(
        tenant_id=hub_tenant.id,
        email=request.email,
        password_hash=hash_password(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        display_name=f"{request.first_name} {request.last_name}",
        status="active",
    )
    db.add(user)
    db.flush()

    db.add(UserRole(user_id=user.id, role_id=learner_role.id, scope_type="tenant"))
    db.commit()

    access_token = create_access_token({"sub": str(user.id), "tenant_id": str(hub_tenant.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token,
        user=UserInfo(
            id=user.id, tenant_id=hub_tenant.id, email=user.email,
            first_name=user.first_name, last_name=user.last_name,
            display_name=user.display_name, role="learner", permissions=[],
        ),
    )
