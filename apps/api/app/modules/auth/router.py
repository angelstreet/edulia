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
    return TokenResponse(**tokens)


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
