"""Notification dispatch engine.

Publishes notification events to Redis for real-time delivery.
Falls back to direct DB insert when Redis is unavailable.
"""

import json
import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.notifications.service import create_notification

logger = logging.getLogger(__name__)


def dispatch_notification(
    db: Session,
    tenant_id: UUID,
    user_id: UUID,
    type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    channel: str = "in_app",
) -> None:
    """Create a notification and optionally publish to Redis for real-time push."""
    notification = create_notification(
        db, tenant_id,
        user_id=user_id, type=type, channel=channel,
        title=title, body=body, link=link,
    )

    # Try publishing to Redis for real-time delivery
    try:
        from app.config import settings
        import redis

        r = redis.from_url(settings.REDIS_URL)
        r.publish(
            f"notification:user:{user_id}",
            json.dumps({
                "id": str(notification.id),
                "type": type,
                "title": title,
                "body": body,
                "link": link,
            }),
        )
    except Exception:
        logger.debug("Redis unavailable, notification saved to DB only")
