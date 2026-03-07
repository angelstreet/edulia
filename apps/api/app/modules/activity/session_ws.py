import asyncio
import json
import logging
from copy import deepcopy
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.core.security import decode_token
from app.db.database import SessionLocal, get_db
from app.modules.activity.scoring import score_attempt
from app.modules.activity.session_service import (
    advance_session_question,
    get_activity_by_id,
    get_session_by_code,
    set_session_state,
)

logger = logging.getLogger(__name__)

ws_router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory stores (reset on server restart — acceptable for MVP)
# ---------------------------------------------------------------------------

# {join_code: {question_index: {student_id: [selected_ids]}}}
_session_answers: dict[str, dict] = {}

# {join_code: set[WebSocket]}  — used for direct broadcast on the same pod
_session_connections: dict[str, set] = {}


# ---------------------------------------------------------------------------
# Redis helper
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _strip_is_correct(question: dict) -> dict:
    """Return a copy of the question dict with is_correct removed from all choices."""
    q = deepcopy(question)
    for choice in q.get("choices", []):
        choice.pop("is_correct", None)
    return q


def _get_correct_ids(question: dict) -> list[str]:
    """Return list of choice IDs where is_correct is True."""
    return [c["id"] for c in question.get("choices", []) if c.get("is_correct")]


def _compute_counts(join_code: str, question_index: int) -> dict:
    """Compute choice-id → count map for a given question from in-memory store."""
    answers_for_q = _session_answers.get(join_code, {}).get(question_index, {})
    counts: dict[str, int] = {}
    for selected_ids in answers_for_q.values():
        for cid in selected_ids:
            counts[cid] = counts.get(cid, 0) + 1
    return counts


async def _broadcast(redis, channel: str, join_code: str, msg: dict) -> None:
    """
    Publish a message to the Redis channel so ALL pods fan it out to their
    connected WebSockets (including this pod via its own pubsub subscription).
    Direct-send via _session_connections is handled by listen_redis on each pod.
    """
    if redis is not None:
        await redis.publish(channel, json.dumps(msg))


# ---------------------------------------------------------------------------
# DB helpers to run synchronous SQLAlchemy inside async handlers
# ---------------------------------------------------------------------------

def _db_advance_question(session_id, new_index, new_state, set_started_at=False):
    db = SessionLocal()
    try:
        return advance_session_question(db, session_id, new_index, new_state, set_started_at)
    finally:
        db.close()


def _db_set_state(session_id, new_state, ended_at=False):
    db = SessionLocal()
    try:
        return set_session_state(db, session_id, new_state, ended_at)
    finally:
        db.close()


def _db_get_session_and_activity(join_code):
    """Return (session, activity) tuple. Opens its own DB connection."""
    db = SessionLocal()
    try:
        session = get_session_by_code(db, join_code)
        activity = get_activity_by_id(db, session.activity_id)
        # Detach data we need before closing
        session_data = {
            "id": session.id,
            "state": session.state,
            "current_question_index": session.current_question_index,
            "teacher_id": session.teacher_id,
            "activity_id": session.activity_id,
        }
        questions = activity.questions or []
        return session_data, list(questions)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Teacher message handlers
# ---------------------------------------------------------------------------

async def _handle_next_question(
    websocket: WebSocket,
    redis,
    channel: str,
    join_code: str,
    loop,
) -> None:
    """
    Advance the session to the next question.
    lobby → active (index=0)
    reveal → active (index++)
    If no more questions while in reveal → finish.
    """
    session_data, questions = await loop.run_in_executor(
        None, _db_get_session_and_activity, join_code
    )

    state = session_data["state"]
    session_id = session_data["id"]
    current_index = session_data["current_question_index"]

    if state == "lobby":
        new_index = 0
        set_started_at = True
    elif state == "reveal":
        new_index = current_index + 1
        set_started_at = False
    else:
        # Ignore in other states
        logger.debug(f"next_question ignored in state={state}")
        return

    # Check if there are questions left
    if new_index >= len(questions):
        # No more questions — finish the session
        await loop.run_in_executor(None, _db_set_state, session_id, "finished", True)
        scores = _compute_scores(join_code, questions)
        await _broadcast(redis, channel, join_code, {
            "type": "session_finished",
            "data": {"scores": scores},
        })
        await _broadcast(redis, channel, join_code, {
            "type": "state_change",
            "data": {"state": "finished", "current_question_index": current_index},
        })
        return

    # Persist new state
    await loop.run_in_executor(
        None,
        _db_advance_question,
        session_id,
        new_index,
        "active",
        set_started_at,
    )

    question = questions[new_index]
    time_limit_s = question.get("time_limit_s", None)

    await _broadcast(redis, channel, join_code, {
        "type": "question_start",
        "data": {
            "index": new_index,
            "question": _strip_is_correct(question),
            "time_limit_s": time_limit_s,
        },
    })
    await _broadcast(redis, channel, join_code, {
        "type": "state_change",
        "data": {"state": "active", "current_question_index": new_index},
    })


async def _handle_reveal_question(
    websocket: WebSocket,
    redis,
    channel: str,
    join_code: str,
    loop,
) -> None:
    """Show correct answers for current question. Transitions active → reveal."""
    session_data, questions = await loop.run_in_executor(
        None, _db_get_session_and_activity, join_code
    )

    state = session_data["state"]
    session_id = session_data["id"]
    current_index = session_data["current_question_index"]

    if state != "active":
        logger.debug(f"reveal_question ignored in state={state}")
        return

    await loop.run_in_executor(None, _db_set_state, session_id, "reveal")

    question = questions[current_index] if current_index < len(questions) else {}
    counts = _compute_counts(join_code, current_index)
    correct_ids = _get_correct_ids(question)

    await _broadcast(redis, channel, join_code, {
        "type": "question_reveal",
        "data": {
            "question_index": current_index,
            "question": question,  # full question WITH is_correct
            "counts": counts,
            "correct_ids": correct_ids,
        },
    })
    await _broadcast(redis, channel, join_code, {
        "type": "state_change",
        "data": {"state": "reveal", "current_question_index": current_index},
    })


async def _handle_finish_session(
    websocket: WebSocket,
    redis,
    channel: str,
    join_code: str,
    loop,
) -> None:
    """End the session and broadcast final scores."""
    session_data, questions = await loop.run_in_executor(
        None, _db_get_session_and_activity, join_code
    )

    session_id = session_data["id"]
    current_index = session_data["current_question_index"]

    await loop.run_in_executor(None, _db_set_state, session_id, "finished", True)

    scores = _compute_scores(join_code, questions)
    await _broadcast(redis, channel, join_code, {
        "type": "session_finished",
        "data": {"scores": scores},
    })
    await _broadcast(redis, channel, join_code, {
        "type": "state_change",
        "data": {"state": "finished", "current_question_index": current_index},
    })


# ---------------------------------------------------------------------------
# Student message handlers
# ---------------------------------------------------------------------------

async def _handle_answer(
    websocket: WebSocket,
    redis,
    channel: str,
    join_code: str,
    student_id: str,
    data: dict,
    loop,
) -> None:
    """
    Record a student's answer and broadcast updated choice counts to all
    connected clients (teacher sees live bars).
    """
    session_data, questions = await loop.run_in_executor(
        None, _db_get_session_and_activity, join_code
    )

    state = session_data["state"]
    current_index = session_data["current_question_index"]

    if state != "active":
        logger.debug(f"answer ignored in state={state}")
        return

    question_index = data.get("question_index")
    selected_ids = data.get("selected_ids", [])

    # Validate the student is answering the current question
    if question_index != current_index:
        logger.debug(
            f"answer for question {question_index} ignored; current={current_index}"
        )
        return

    # Store the answer (last answer wins — student can change before reveal)
    if join_code not in _session_answers:
        _session_answers[join_code] = {}
    if question_index not in _session_answers[join_code]:
        _session_answers[join_code][question_index] = {}
    _session_answers[join_code][question_index][student_id] = selected_ids

    # Broadcast updated counts
    counts = _compute_counts(join_code, question_index)
    await _broadcast(redis, channel, join_code, {
        "type": "answer_update",
        "data": {
            "question_index": question_index,
            "counts": counts,
        },
    })


# ---------------------------------------------------------------------------
# Score computation
# ---------------------------------------------------------------------------

def _compute_scores(join_code: str, questions: list[dict]) -> list[dict]:
    """
    Compute per-student scores using score_attempt().
    Returns list of {student_id, score, max_score}.
    """
    all_answers = _session_answers.get(join_code, {})

    # Collect all student IDs that answered at least one question
    student_ids: set[str] = set()
    for q_answers in all_answers.values():
        student_ids.update(q_answers.keys())

    results = []
    for student_id in student_ids:
        # Build answers list expected by score_attempt:
        # [{question_id, choice_ids}]
        answers_list = []
        for q_idx, q in enumerate(questions):
            q_id = q.get("id", "")
            selected = all_answers.get(q_idx, {}).get(student_id, [])
            answers_list.append({
                "question_id": q_id,
                "choice_ids": selected,
            })

        score, max_score = score_attempt(questions, answers_list)
        results.append({
            "student_id": student_id,
            "score": float(score),
            "max_score": float(max_score),
        })

    return results


# ---------------------------------------------------------------------------
# Main WebSocket endpoint
# ---------------------------------------------------------------------------

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
       - listen_ws: handle incoming WS messages (state machine).
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

    # Register connection in local store
    if join_code not in _session_connections:
        _session_connections[join_code] = set()
    _session_connections[join_code].add(websocket)

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
            _session_connections.get(join_code, set()).discard(websocket)
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

    loop = asyncio.get_event_loop()

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
        """
        Handle incoming WebSocket messages and drive the session state machine.

        Teacher messages: next_question, reveal_question, finish_session
        Student messages: answer
        """
        try:
            while True:
                text = await websocket.receive_text()
                try:
                    msg = json.loads(text)
                except Exception:
                    logger.debug("Received non-JSON WS message, ignoring")
                    continue

                msg_type = msg.get("type", "")
                data = msg.get("data", {})

                if is_teacher:
                    # Only teacher can send control messages
                    if msg_type == "next_question":
                        await _handle_next_question(
                            websocket, redis, channel, join_code, loop
                        )
                    elif msg_type == "reveal_question":
                        await _handle_reveal_question(
                            websocket, redis, channel, join_code, loop
                        )
                    elif msg_type == "finish_session":
                        await _handle_finish_session(
                            websocket, redis, channel, join_code, loop
                        )
                    else:
                        logger.debug(f"Unknown teacher message type: {msg_type}")
                else:
                    # Only students can send answer messages
                    if msg_type == "answer":
                        await _handle_answer(
                            websocket,
                            redis,
                            channel,
                            join_code,
                            str(user_id),
                            data,
                            loop,
                        )
                    else:
                        logger.debug(f"Unknown student message type: {msg_type}")

        except WebSocketDisconnect:
            pass

    # 8. Run both tasks concurrently; stop both when either finishes
    try:
        await asyncio.gather(listen_redis(), listen_ws())
    except Exception as exc:
        logger.debug(f"session_websocket gather terminated: {exc}")
    finally:
        _session_connections.get(join_code, set()).discard(websocket)
        try:
            await pubsub.unsubscribe(channel)
        except Exception:
            pass
        try:
            await redis.aclose()
        except Exception:
            pass
