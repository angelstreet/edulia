import asyncio
import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.core.security import decode_token
from app.db.database import get_db
from app.modules.activity.session_service import get_session_by_code

logger = logging.getLogger(__name__)

ws_router = APIRouter()


async def get_redis_client():
    """
    Return an async Redis client connected to DB 1 (live session pub/sub).
    Uses redis.asyncio which ships with redis>=4.2 (requirements.txt: redis>=5.0.0).
    Falls back gracefully if Redis is unavailable.
    """
    try:
        import redis.asyncio as aioredis

        # Derive pub/sub URL: replace or append database index to base URL
        # settings.REDIS_URL is e.g. "redis://192.168.0.122:6379/0"
        base_url = settings.REDIS_URL.rsplit('/', 1)[0]
        pubsub_url = f"{base_url}/1"

        client = await aioredis.from_url(pubsub_url, decode_responses=True)
        return client
    except Exception as e:
        logger.warning(f"Redis unavailable: {e}")
        return None


@ws_router.websocket("/ws/session/{join_code}")
async def session_websocket(
    websocket: WebSocket,
    join_code: str,
    token: str = Query(...),
    db: DBSession = Depends(get_db),
):
    """
    WebSocket endpoint for live sessions.

    Auth: JWT passed as ?token= query param (standard for WS since browsers
    do not support custom headers in native WebSocket).

    Flow:
    1. Decode JWT to get user_id; reject with 4001 if invalid.
    2. Look up session by join_code; reject with 4004 if not found.
    3. Accept the WebSocket connection.
    4. Determine whether the connecting user is the teacher or a student.
    5. Send initial session state snapshot to the client.
    6. Connect to Redis pub/sub channel "session:{join_code}".
    7. Publish student_joined event if the connecting user is a student.
    8. Run two concurrent tasks:
       - listen_redis: forward Redis channel messages to this WebSocket.
       - listen_ws: forward this WebSocket messages to Redis channel.
    9. Handle disconnect and clean up gracefully.

    Fallback (Redis unavailable): keep connection open, echo messages back
    to the sender only (no real-time fan-out).
    """
    # 1. Authenticate — decode_token returns None on failure
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001)
        return

    # 2. Look up session
    try:
        session = get_session_by_code(db, join_code)
    except Exception:
        await websocket.close(code=4004)
        return

    # 3. Accept connection
    await websocket.accept()

    is_teacher = str(session.teacher_id) == str(user_id)
    channel = f"session:{session.join_code}"

    # 4. Send initial state snapshot to the connecting client
    await websocket.send_json({
        "type": "session_state",
        "data": {
            "join_code": session.join_code,
            "state": session.state,
            "current_question_index": session.current_question_index,
            "is_teacher": is_teacher,
        },
    })

    # 5. Get Redis client
    redis = await get_redis_client()

    if redis is None:
        # Fallback: no real-time fan-out, just keep connection alive
        logger.warning("Running WebSocket session without Redis (no fan-out)")
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    parsed = json.loads(data)
                except Exception:
                    parsed = {"raw": data}
                await websocket.send_json({"type": "echo", "data": parsed})
        except WebSocketDisconnect:
            return
        return

    # 6. Publish student_joined if this is a student connecting
    if not is_teacher:
        await redis.publish(channel, json.dumps({
            "type": "student_joined",
            "data": {"user_id": str(user_id)},
        }))

    # 7. Set up pub/sub
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)

    async def listen_redis():
        """Forward Redis pub/sub messages to this WebSocket client."""
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    payload_str = message["data"]
                    try:
                        msg = json.loads(payload_str)
                        await websocket.send_json(msg)
                    except Exception as exc:
                        logger.debug(f"Failed to forward Redis message: {exc}")
        except Exception as exc:
            logger.debug(f"listen_redis terminated: {exc}")

    async def listen_ws():
        """Forward WebSocket messages to Redis channel (teacher → all students, student → teacher)."""
        try:
            while True:
                text = await websocket.receive_text()
                try:
                    msg = json.loads(text)
                    msg_type = msg.get("type", "")

                    if is_teacher:
                        # Teacher controls: broadcast to all subscribers on this channel
                        await redis.publish(channel, json.dumps({
                            "type": msg_type,
                            "data": msg.get("data", {}),
                            "from": "teacher",
                        }))
                    else:
                        # Student: publish answer/event so teacher receives it
                        await redis.publish(channel, json.dumps({
                            "type": msg_type,
                            "data": {**msg.get("data", {}), "student_id": str(user_id)},
                            "from": "student",
                        }))
                except Exception as exc:
                    logger.debug(f"Failed to publish WebSocket message: {exc}")
        except WebSocketDisconnect:
            pass

    # 8. Run both tasks concurrently; stop both when either finishes
    try:
        await asyncio.gather(listen_redis(), listen_ws())
    except Exception as exc:
        logger.debug(f"session_websocket gather terminated: {exc}")
    finally:
        try:
            await pubsub.unsubscribe(channel)
        except Exception:
            pass
        try:
            await redis.aclose()
        except Exception:
            pass
