import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
import redis.asyncio as aioredis

from app.core.dependencies import get_current_user
from app.core.exceptions import UnauthorizedException
from app.core.security import decode_token
from app.db.database import get_db
from app.db.models.notification import Notification
from app.db.models.user import User, UserRole
from app.modules.notifications.schemas import NotificationResponse
from app.modules.notifications.service import list_notifications, mark_all_read, mark_read

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_notifications(db, current_user.tenant_id, current_user.id)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return mark_read(db, notification_id, current_user.id)


@router.post("/read-all")
def read_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = mark_all_read(db, current_user.tenant_id, current_user.id)
    return {"marked_read": count}


@router.get("/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.tenant_id == current_user.tenant_id,
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
        .count()
    )
    return {"count": count}


def _get_user_from_query_token(token: str, db: Session) -> User:
    """Resolve a JWT passed as ?token= query param (for EventSource clients)."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedException("Invalid or expired token")
    user_id = payload.get("sub")
    user = (
        db.query(User)
        .options(joinedload(User.user_roles).joinedload(UserRole.role))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise UnauthorizedException("User not found")
    return user


@router.get("/stream")
async def notification_stream(
    request: Request,
    token: str | None = Query(None),
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
):
    """SSE endpoint — accepts ?token= (EventSource) or Authorization header."""
    from app.config import settings

    # Resolve user from ?token= query param (EventSource) or Authorization header
    if token:
        current_user = _get_user_from_query_token(token, db)
    elif authorization and authorization.startswith("Bearer "):
        jwt = authorization.split(" ", 1)[1]
        current_user = _get_user_from_query_token(jwt, db)
    else:
        raise UnauthorizedException("Missing token")

    async def event_generator():
        r = aioredis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()
        channel = f"notification:user:{current_user.id}"
        await pubsub.subscribe(channel)
        try:
            # Send a heartbeat immediately to establish connection
            yield "data: {\"type\":\"connected\"}\n\n"
            async for message in pubsub.listen():
                if await request.is_disconnected():
                    break
                if message["type"] == "message":
                    yield f"data: {message['data'].decode()}\n\n"
                else:
                    # Heartbeat every ~30s to keep connection alive
                    await asyncio.sleep(0)
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await r.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
