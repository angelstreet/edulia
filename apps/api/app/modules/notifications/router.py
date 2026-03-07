import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import redis.asyncio as aioredis

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.db.models.notification import Notification
from app.db.models.user import User
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


@router.get("/stream")
async def notification_stream(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """SSE endpoint — pushes real-time notifications to the client via Redis pub/sub."""
    from app.config import settings

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
