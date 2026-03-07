# 13 — Interactive Teaching: Feature-by-Feature Implementation Plan

> Architecture vision: [11-INTERACTIVE-TEACHING.md](11-INTERACTIVE-TEACHING.md)
> Infrastructure: [12-EDULIA-INFRASTRUCTURE.md](12-EDULIA-INFRASTRUCTURE.md)

## How We Build: 3 Agents in Parallel

Each feature is split into 3 independent tracks that run simultaneously:

| Agent | Track | What they do |
|-------|-------|--------------|
| **A — Backend** | API + DB | SQLAlchemy model, Alembic migration, Pydantic schemas, FastAPI router, service logic |
| **B — Frontend** | UI | TypeScript API client, React page/components, i18n keys |
| **C — Tests** | Quality | pytest API tests, Playwright E2E, acceptance criteria verification |

**Sequencing rule:** A and B can build in parallel. C writes tests against A's spec
(can start from schemas/contracts even before A is done). Full integration only
needed at the end of each feature, not during.

---

## Feature 1 — Activity Builder (Async, No WebSocket)

**Goal:** Teacher creates a QCM with questions, publishes it, assigns it to a class.

### Agent A — Backend

**New model: `Activity`**
```
apps/api/app/db/models/activity.py

Activity
  id UUID PK
  tenant_id UUID FK
  created_by UUID FK → users
  title str
  description str | null
  type: 'qcm' | 'poll' | 'game'
  status: 'draft' | 'published' | 'closed'
  questions: JSONB  ← [{id, text, type, choices:[{id,text,is_correct}], time_limit_s, points}]
  group_id UUID FK | null  ← target class
  subject_id UUID FK | null
  scheduled_at: datetime | null
  replay_deadline: datetime | null
  created_at datetime
```

**Migration:** `apps/api/alembic/versions/…_add_activity_table.py`

**Schemas:** `apps/api/app/modules/activity/schemas.py`
- `ActivityCreate`, `ActivityUpdate`, `ActivityResponse`
- `QuestionSchema` (validated inside JSONB)
- Validation: at least 1 question, each question has at least 2 choices, exactly 1 `is_correct=true` for `single` type

**Router:** `GET/POST /api/v1/activities`, `GET/PATCH/DELETE /api/v1/activities/{id}`
- Only teacher/admin can create/edit
- Students see only `published` activities for their group

**Register** in `main.py` and `models/__init__.py`

---

### Agent B — Frontend

**API client:** `apps/web/src/api/activities.ts`
```ts
interface Question { id: string; text: string; type: 'single'|'multi'|'open'; choices: Choice[]; time_limit_s: number|null; points: number }
interface Activity { id: string; title: string; type: string; status: string; questions: Question[]; group_id: string|null; ... }
getActivities(params?): Promise<Activity[]>
getActivity(id): Promise<Activity>
createActivity(data): Promise<Activity>
updateActivity(id, patch): Promise<Activity>
deleteActivity(id): Promise<void>
```

**Pages:**
- `apps/web/src/features/activities/pages/ActivitiesPage.tsx`
  - Teacher: list of activities with status badges, "+ New Activity" button
  - Student: list of published activities for their group, with "Start" button

- `apps/web/src/features/activities/pages/ActivityBuilderPage.tsx`
  - Title, type selector (QCM / Poll), subject, class
  - Question list: add/remove/reorder questions
  - Per question: text input, type (single/multi), add choices, mark correct, time limit
  - Save Draft / Publish buttons

**Router:** add `/activities` and `/activities/new` and `/activities/:id/edit` to `router.tsx`
**Sidebar:** add Activities nav item (all roles)
**i18n:** add keys EN + FR

---

### Agent C — Tests

**pytest:** `apps/api/tests/test_activity.py`
```
test_teacher_can_create_activity
test_teacher_can_publish_activity
test_student_cannot_create_activity
test_student_sees_only_published_for_their_group
test_questions_require_at_least_2_choices
test_single_question_requires_exactly_1_correct
```

**Playwright:** `apps/web/tests/activity-builder.spec.ts`
```
teacher can create a QCM with 3 questions
teacher can add/remove choices
teacher can publish → activity appears in student view
```

**Acceptance criteria:**
- [ ] Teacher creates QCM, adds 3 questions, each with 4 choices, 1 correct
- [ ] Teacher publishes → status changes to `published`
- [ ] Student (same group) sees the activity in their list
- [ ] Student from different group does not see it

---

## Feature 2 — Async Attempt + Auto-Scoring

**Goal:** Student opens a published activity, answers all questions in one sitting,
submits, gets instant score. Teacher sees results without any manual action.

### Agent A — Backend

**New model: `ActivityAttempt`**
```
apps/api/app/db/models/activity_attempt.py

ActivityAttempt
  id UUID PK
  tenant_id UUID FK
  activity_id UUID FK → Activity
  student_id UUID FK → users
  session_id UUID | null  ← null for async
  mode: 'async' | 'live' | 'replay'
  started_at datetime
  submitted_at datetime | null
  answers: JSONB  ← [{question_id, choice_ids:[], text:str|null, answered_at_ms:int}]
  score: Decimal | null
  max_score: Decimal | null
  scored_at datetime | null
```

**Scoring engine:** `apps/api/app/modules/activity/scoring.py`
```python
def score_attempt(activity: Activity, answers: list[dict]) -> tuple[Decimal, Decimal]:
    """Returns (score, max_score). Runs server-side only."""
    # For each question: compare choice_ids to is_correct choices
    # Single: full points if correct, 0 otherwise
    # Multi: partial points (correct selected - incorrect selected) / total_correct
    # Open: 0 auto (teacher must grade manually — flag for later)
```

**Router endpoints:**
- `POST /api/v1/activities/{id}/attempt/start` → creates attempt, returns activity WITHOUT `is_correct` fields stripped
- `POST /api/v1/activities/{id}/attempt/{attempt_id}/submit` → scores, saves, returns result WITH correct answers revealed
- `GET /api/v1/activities/{id}/attempts` → teacher only, all attempts for this activity
- `GET /api/v1/activities/{id}/attempt/my` → student's own attempt

**Security:** strip `is_correct` from activity response on start. Only reveal after submit.

---

### Agent B — Frontend

**API client additions to `activities.ts`:**
```ts
startAttempt(activityId): Promise<{attempt_id: string; activity: Activity}>
submitAttempt(activityId, attemptId, answers: Answer[]): Promise<AttemptResult>
getMyAttempt(activityId): Promise<AttemptResult | null>
getAttempts(activityId): Promise<AttemptResult[]>  // teacher
```

**New pages:**
- `apps/web/src/features/activities/pages/AttemptPage.tsx` (student)
  - Question by question or all-on-one-page (single scroll)
  - For each question: large tap-friendly choice buttons
  - Submit button at end (disabled until all answered)
  - After submit: score reveal screen — "You scored 14/20", per-question
    result (correct/incorrect + right answer shown)

- `apps/web/src/features/activities/pages/ActivityResultsPage.tsx` (teacher)
  - Summary: X/Y submitted, average score
  - Per-question breakdown: bar showing % who got it right
  - Per-student table: name, score, submitted_at

**Router:** add `/activities/:id/attempt` and `/activities/:id/results`

---

### Agent C — Tests

**pytest:** `apps/api/tests/test_activity_attempt.py`
```
test_student_can_start_attempt
test_activity_response_strips_is_correct
test_student_cannot_submit_twice
test_submit_scores_correctly_single_choice
test_submit_scores_correctly_multi_choice
test_teacher_sees_all_attempts
test_student_sees_only_own_attempt
test_correct_answers_revealed_after_submit
test_correct_answers_not_revealed_before_submit
```

**Acceptance criteria:**
- [ ] Student starts attempt — response has no `is_correct` fields
- [ ] Student submits — gets score immediately
- [ ] Submit same activity twice → 400 error
- [ ] Teacher sees all student scores on results page
- [ ] Per-question: correct answer highlighted in student result

---

## Feature 3 — Teacher Auto-Reporting Dashboard

**Goal:** Teacher sees at a glance how the class is doing across all activities.
No manual work required.

### Agent A — Backend

**New endpoint:** `GET /api/v1/activities/report`
Returns aggregated stats per activity for the teacher's tenant:
```json
{
  "activities": [
    {
      "id": "...",
      "title": "Chapter 3 Quiz",
      "published_at": "...",
      "group_name": "6ème A",
      "total_students": 24,
      "submitted_count": 18,
      "avg_score": 13.4,
      "max_score": 20,
      "completion_rate": 0.75,
      "questions": [
        {"text": "What is...", "error_rate": 0.67}
      ]
    }
  ]
}
```

Per-student endpoint: `GET /api/v1/students/{id}/activity-scores`
```json
{
  "student": {...},
  "attempts": [{"activity_title": "...", "score": 14, "max_score": 20, "submitted_at": "..."}],
  "avg_score": 13.2,
  "trend": "improving"
}
```

All computed from `ActivityAttempt` table — no separate materialized view needed at this scale.

---

### Agent B — Frontend

**New component: `apps/web/src/features/activities/pages/ReportingPage.tsx`**

Teacher view:
- Cards per activity: completion donut, average score bar
- Click activity → drill down to per-question error rate chart (simple horizontal bars)
- Click student name → per-student history modal

**Charts:** use `recharts` (already likely in deps) or simple CSS-only bars to avoid new deps.

**Router:** `/activities/report`
**Sidebar:** "Reports" sub-item under Activities (teacher/admin only)

---

### Agent C — Tests

**pytest:** `apps/api/tests/test_activity_report.py`
```
test_report_returns_correct_completion_rate
test_report_returns_correct_avg_score
test_report_question_error_rate_calculation
test_student_cannot_access_report
test_teacher_only_sees_own_tenant_data
```

**Acceptance criteria:**
- [ ] 20 students, 15 submitted, avg 13/20 → report shows 75% completion, 13.0 avg
- [ ] Question answered wrong by 12/15 → error_rate = 0.80
- [ ] Student from another tenant not visible

---

## Feature 4 — Live Session Infrastructure (WebSocket)

**Goal:** Teacher launches a session, students join with a code. Real-time channel
established. No question shown yet — just lobby.

### Agent A — Backend

**New model: `LiveSession`**
```
apps/api/app/db/models/live_session.py

LiveSession
  id UUID PK
  tenant_id UUID FK
  activity_id UUID FK → Activity
  teacher_id UUID FK → users
  join_code str(6)  ← unique, alphanumeric, regenerated each session
  state: 'lobby' | 'active' | 'reveal' | 'finished'
  current_question_index int default 0
  started_at datetime | null
  ended_at datetime | null
  created_at datetime
```

**Session state in Redis** (TTL 24h):
```
Key: session:{join_code}
Value: JSON { state, current_q_index, activity_id, teacher_ws_id, student_ws_ids:[] }
```

**WebSocket endpoint:**
```python
# apps/api/app/modules/activity/ws.py

@router.websocket("/ws/session/{join_code}")
async def session_ws(websocket: WebSocket, join_code: str, token: str = Query(...)):
    # Authenticate via token query param (JWT)
    # Determine role: if teacher_id matches session → teacher channel
    # else → student channel
    # Subscribe to Redis channel: session:{join_code}
    # On message: route to handler based on role + event type
```

**Redis Pub/Sub fan-out:**
- Teacher sends `{type: "next_question"}` → server publishes to channel → all student WS receive `{type: "question", data: {...no is_correct...}}`
- Student sends `{type: "answer", data: {...}}` → server saves answer + publishes to teacher channel `{type: "answer_received", student_id, choice_id}`

**REST endpoints:**
- `POST /api/v1/sessions` → create session for an activity, returns `join_code`
- `GET /api/v1/sessions/{join_code}` → get session state
- `POST /api/v1/sessions/{join_code}/finish` → close session, score all attempts

---

### Agent B — Frontend

**WebSocket client hook:** `apps/web/src/hooks/useSessionSocket.ts`
```ts
function useSessionSocket(joinCode: string, token: string) {
  // ws = new WebSocket(`wss://.../ws/session/${joinCode}?token=${token}`)
  // returns { send, lastMessage, readyState }
}
```

**Teacher: `SessionLaunchPage.tsx`**
- Shows join code + QR code (qrcode.react)
- Shows list of students who joined lobby (updated via WS)
- "Start Session" button → sends `next_question` event
- Redirects to `SessionDashboardPage`

**Student: `JoinPage.tsx`**
- Input: enter 6-char code (or scan QR)
- Redirects to `LobbyPage` ("Waiting for teacher to start…")

**Router:** `/activities/:id/launch`, `/join`, `/session/:code/lobby`

---

### Agent C — Tests

**pytest (WS):** `apps/api/tests/test_live_session.py`
```
test_create_session_generates_unique_join_code
test_student_can_join_via_join_code
test_teacher_ws_receives_student_join_event
test_student_ws_receives_lobby_state
test_redis_pubsub_fan_out (mock Redis)
```

**Acceptance criteria:**
- [ ] Teacher creates session → 6-char code generated
- [ ] Student connects to WS with code → joins lobby
- [ ] Teacher WS receives `student_joined` event within 500ms
- [ ] 10 students connected simultaneously → all in lobby without error

---

## Feature 5 — Live QCM Real-Time

**Goal:** Teacher advances questions, students answer live, teacher sees bar chart
updating in real-time, leaderboard after each question.

### Agent A — Backend

**State machine events** (handled in WS router):

| Sender | Event | Effect |
|--------|-------|--------|
| Teacher | `next_question` | Broadcast question (no `is_correct`) to all students, start server-side timer |
| Student | `answer` | Save answer to Redis, broadcast `answer_count` update to teacher |
| Server (timer) | — | Auto-advance after `time_limit_s`, broadcast `reveal` with correct answer |
| Teacher | `reveal` | Force reveal (skip timer) |
| Teacher | `next_question` after reveal | Advance index, loop |
| Teacher | `finish` | End session, trigger scoring for all attempts |

**Timer:** `asyncio.create_task(sleep(time_limit_s))` per question. Cancel if teacher reveals early.

**Leaderboard:** computed from per-question correct answers in Redis, broadcast after each reveal.

---

### Agent B — Frontend

**Teacher: `SessionDashboardPage.tsx`**
- Current question display (read-only)
- Real-time bar chart: for each choice, bar fills as students answer (% of responses)
- Total answered / total joined counter
- "Reveal" button → sends reveal event
- "Next Question" button
- Leaderboard panel (right side): top 5 students, updates after each question

**Student: `SessionQuestionPage.tsx`**
- Large question text
- Choice buttons (A/B/C/D style, full width, tap-friendly)
- Countdown timer ring (CSS animation, synced to server start time)
- On tap: button locks + turns grey ("Locked in!")
- After reveal: correct choice turns green, wrong turns red
- Points earned animation

**Libraries needed:**
- `qrcode.react` (QR code for join page) — install if not present
- No charting library needed: simple CSS width bars for the answer distribution

---

### Agent C — Tests

**pytest (WS integration):**
```
test_teacher_sends_next_question_students_receive_it
test_student_answer_updates_teacher_count
test_timer_expiry_triggers_reveal
test_answer_after_timer_rejected
test_correct_answer_in_reveal_matches_activity
test_leaderboard_sorted_by_score
test_is_correct_not_in_student_question_payload
```

**Playwright E2E:**
```
teacher_launches_session_students_join_and_answer (multi-tab test)
  → open teacher tab + 3 student tabs
  → teacher advances question
  → students tap answers
  → teacher sees bar chart update
  → reveal → students see correct/wrong
```

**Acceptance criteria:**
- [ ] Student answer arrives at teacher dashboard < 300ms
- [ ] `is_correct` never in student WS message before reveal
- [ ] Answer sent after timer expiry → ignored by server
- [ ] 25 students connected → all receive question broadcast < 1s

---

## Feature 6 — Async Replay + Multi-Timezone

**Goal:** Student who missed the live session can still complete it. Teacher
sees "live" vs "replay" cohorts in results.

### Agent A — Backend

- Add `replay_deadline` to `LiveSession`
- After session finishes: set `replay_open = true`, `replay_deadline = now + X hours`
- `GET /api/v1/sessions/{join_code}/replay` → returns activity (same as async attempt start, no `is_correct`)
- `POST /api/v1/sessions/{join_code}/replay/submit` → scores, saves attempt with `mode='replay'`
- Update report endpoint to split `live_count` vs `replay_count`

**Timezone display:** all datetimes stored as UTC. Frontend converts to local time.

---

### Agent B — Frontend

- `SessionReplayPage.tsx` — same as `AttemptPage` but with "Replay" badge and deadline countdown
- `ActivitiesPage`: show sessions with "Replay available until [local time]"
- All datetime rendering: `toLocaleString(undefined, {timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone})`

---

### Agent C — Tests

```
test_replay_available_after_session_ends
test_replay_closed_after_deadline
test_replay_attempt_mode_is_replay
test_report_splits_live_vs_replay
test_datetime_stored_as_utc
```

---

## Build Order

```
Feature 1 ──► Feature 2 ──► Feature 3
  (builder)    (async score)  (reporting)
                    │
                    ▼
              Feature 4 ──► Feature 5 ──► Feature 6
               (WS infra)   (live QCM)   (replay)
```

Features 1–3 deliver value with zero WebSocket complexity.
Ship to real users, get feedback, then build 4–6.

Features 1, 2, 3 can all be parallelized internally (A+B+C at same time).
Feature 4 must come before 5 (WS infra first).

---

## Agent Assignment per Feature

### Feature 1
```
Agent A: create Activity model + migration + schemas + router
Agent B: create ActivityBuilderPage + ActivitiesPage + API client
Agent C: write pytest suite + Playwright spec + verify acceptance criteria
```

### Feature 2
```
Agent A: create ActivityAttempt model + scoring engine + attempt endpoints
Agent B: create AttemptPage + ActivityResultsPage + API client additions
Agent C: scoring unit tests + security tests (is_correct stripping) + E2E
```

### Feature 3
```
Agent A: reporting aggregation endpoints
Agent B: ReportingPage + charts
Agent C: aggregation correctness tests + multi-tenant isolation tests
```

### Feature 4
```
Agent A: LiveSession model + WS endpoint + Redis pub/sub handler
Agent B: useSessionSocket hook + JoinPage + SessionLaunchPage + LobbyPage
Agent C: WS integration tests + Redis fan-out tests (mock)
```

### Feature 5
```
Agent A: state machine event handlers + timer + leaderboard logic
Agent B: SessionDashboardPage + SessionQuestionPage
Agent C: WS security tests + multi-client Playwright test + latency check
```

### Feature 6
```
Agent A: replay mode + deadline enforcement
Agent B: SessionReplayPage + timezone rendering
Agent C: replay tests + timezone UTC tests
```
