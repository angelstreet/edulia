# 11 — Interactive Teaching: Vision, Use Cases & Architecture

## Vision

A teacher anywhere in the world can run a live interactive class for students
spread across multiple timezones — some attending live, others catching up
asynchronously later. Every interaction is auto-scored, auto-reported to the
teacher, and requires no manual grading for objective exercises.

This is not a homework submission system. It is a **real-time engagement layer**
on top of the existing school infrastructure.

---

## Core Principles

- **Teacher is a facilitator, not a grader** — objective exercises score
  themselves. Teacher time is spent on discussion and qualitative feedback.
- **Device-first** — students have iPads, smartphones. Interactions are tap-based,
  fast, designed for < 30 seconds per question.
- **Location-independent** — teacher and students can be anywhere. Timezones
  are a first-class concern, not an afterthought.
- **Live + async coexist** — a session run at 10am Paris time must still be
  completable by a student in Tokyo at 9pm. Results always flow to teacher dashboard.
- **No cheating vector** — scoring happens server-side only. Client never
  receives correct answers before the activity closes.

---

## Use Cases

### UC-1: Live QCM (Kahoot-style)
**Actor:** Teacher + class attending live
**Flow:**
1. Teacher creates a QCM (multiple choice questions with one or more correct answers)
2. Teacher launches a **live session** — gets a session code + QR code
3. Students join on their device using the code or QR (no login required if
   guest join is enabled, or with their Edulia account)
4. Teacher controls the pace: reveals one question at a time, sets a timer
   (10s / 30s / 60s)
5. Students tap their answer on their device
6. When timer ends: teacher screen shows real-time bar chart of answers per
   choice, correct answer revealed, leaderboard updated
7. After all questions: final leaderboard + per-student score auto-saved to
   teacher dashboard

**Key constraint:** students cannot see correct answers before time expires.
**Auto-scoring:** yes, fully automatic.

---

### UC-2: Live Poll / Word Cloud
**Actor:** Teacher + class (live or async)
**Flow:**
1. Teacher creates a poll ("What is one word that describes…?", "Which topic
   confused you most?")
2. Launches live — students type a short answer
3. Teacher screen shows responses appearing in real-time as a word cloud or list
4. No scoring — qualitative, used for discussion

---

### UC-3: Async QCM (homework mode)
**Actor:** Teacher assigns, student completes at own time
**Flow:**
1. Teacher assigns a QCM with a deadline (e.g. 48h)
2. Student receives it in their homework list
3. Student opens it on their device, answers all questions in one sitting
4. On submit: instant score shown to student ("You scored 14/20. Question 3 was
   wrong — correct answer: B")
5. Teacher dashboard updates automatically — sees per-student score, completion
   rate, which questions had the most wrong answers

**Key difference from live QCM:** no real-time sync needed, but correct answers
shown only after submission, not before.

---

### UC-4: Remote / Multi-timezone Class
**Actor:** Teacher running a class where students are in different timezones
**Flow:**
1. Teacher schedules a session with a start time in their timezone
2. Students in the same timezone join live
3. Students in other timezones see the session marked as "scheduled" or "live"
   with local time displayed
4. After the live session ends, the session enters **replay mode**:
   - QCM questions are still answerable (without the live timer pressure)
   - Results still submitted and counted
   - Teacher can set a replay deadline
5. Teacher sees two cohorts in results: "live" vs "async" with timestamps

---

### UC-5: Auto-reporting Dashboard (Teacher)
**Actor:** Teacher reviewing class performance
**What they see:**
- Per-activity: completion rate, average score, per-question error rate
  ("Question 4: 67% of students answered wrong — needs revisiting")
- Per-student: all activity scores over time, trend, weak subjects
- Class heatmap: which students are consistently struggling vs excelling
- Export to PDF for parent meetings or school records

This aggregates automatically from all UC-1 / UC-3 results. No manual entry.

---

### UC-6: Interactive Game (future)
**Actor:** Students competing in a game-based exercise
**Examples:**
- **Drag & match** — match vocabulary to definitions, scored on speed + accuracy
- **Fill in the blank** — timed text input, auto-scored with fuzzy matching
- **Ordering** — put steps of a process in the right order

These are activity types within the same session framework as QCM. They share
the same scoring and reporting infrastructure.

---

## What We Are NOT Building

- File upload / PDF submission — paper-era workflow
- Manual teacher grading of objective exercises — wastes teacher time
- Synchronous video streaming — use Zoom/Meet for that, integrate via link
- Chat / messaging during class — out of scope, distraction risk

---

## Technical Architecture

### Real-time Layer

**Technology: FastAPI WebSockets + Redis Pub/Sub**

Redis is already on VM 122 (storage VM). We use it as the message broker
between teacher and student connections.

```
Teacher browser  ──WS──► FastAPI WS handler ──► Redis PUBLISH "session:{id}"
Student browsers ──WS──► FastAPI WS handler ──► Redis SUBSCRIBE "session:{id}"
```

**Why not Socket.IO?**
FastAPI has native WebSocket support. Redis Pub/Sub handles fan-out to N students.
Socket.IO adds a JS dependency and complexity we don't need.

**Why Redis and not DB polling?**
Polling (even 1s interval) cannot deliver the < 200ms latency needed for live
quiz feel. Redis Pub/Sub is push-based and already on the infrastructure.

### Session State Machine

A live session has states:
```
LOBBY → QUESTION_ACTIVE → QUESTION_REVEAL → [next question] → FINISHED
```

State is stored in Redis (TTL = 24h). DB gets a write only at session end
(final scores persist). During the session, intermediate state lives in Redis only.

### Async Mode (UC-3, UC-4 replay)

No WebSocket needed for pure async. Standard REST:
- `POST /v1/activities/{id}/attempt` — student submits answers
- Server scores server-side, returns result immediately
- Score written to DB

Replay of a live session uses the same endpoint — the session is marked
`replay_open: true` with a deadline.

### Data Model (simplified)

```
Activity
  id, tenant_id, created_by (teacher)
  type: qcm | poll | game
  title, description
  status: draft | scheduled | live | replay | closed
  scheduled_at, replay_deadline
  questions: JSON[]   ← stored as JSONB, not separate table (simpler)

Question (embedded in Activity.questions JSONB)
  id (uuid), text, type: single | multi | open
  choices: [{id, text, is_correct}]
  time_limit_seconds: int | null
  points: int

LiveSession
  id, activity_id, tenant_id
  join_code (6-char alphanumeric)
  started_at, ended_at
  current_question_index
  state: lobby | active | reveal | finished

ActivityAttempt
  id, activity_id, student_id, session_id (null if async)
  mode: live | async | replay
  started_at, submitted_at
  answers: JSON[]     ← [{question_id, choice_ids, text, answered_at_ms}]
  score: Decimal
  max_score: Decimal

ActivityResult (teacher dashboard view)
  materialized or computed from ActivityAttempt
  per-question error rates, per-student trend
```

### Scoring Engine

Server-side only. Client never receives `is_correct` on choices until:
- Live QCM: question timer expires (server broadcasts reveal)
- Async QCM: student submits the full attempt

Fuzzy matching for open-text questions: Levenshtein distance tolerance
configurable per question (e.g. tolerate 1 typo for short answers).

### Frontend Architecture

**Teacher side:**
- Activity builder (create questions, set timers, publish)
- Session launcher (generates join code + QR)
- Live dashboard (WebSocket consumer — shows bar charts updating in real-time,
  leaderboard, current question state)
- Reporting view (REST — post-session analysis)

**Student side:**
- Join screen (enter code or scan QR — works without full login for guest mode)
- Question display (large tap targets, countdown timer, immediate "locked in"
  feedback on tap)
- Score reveal screen (animated, shows correct answer, points earned)
- Async attempt UI (same question display, no timer pressure, submit at end)

### Infrastructure Notes

- WebSocket connections are stateful — need sticky sessions if we ever run
  multiple FastAPI instances (not a concern now, single VM)
- Redis on VM 122 is already accessible from VM 120 (app VM)
- No new VMs needed for the initial implementation
- If we later need horizontal scale: use Redis adapter pattern, connections
  hash to Redis channel regardless of which FastAPI instance handles them

---

## Implementation Phases

### Phase A — Foundation (build first)
1. DB models + migrations: `Activity`, `ActivityAttempt`
2. Activity CRUD API (teacher creates/edits QCM)
3. Async attempt API (student submits, gets score back)
4. Basic teacher reporting (completion rate + scores per activity)
5. Frontend: activity builder + async student attempt UI

This delivers UC-3 (async QCM) with zero WebSocket complexity.
Ships value immediately — teacher assigns a quiz, students do it, scores appear.

### Phase B — Real-time (build second)
1. WebSocket endpoint + Redis Pub/Sub integration
2. `LiveSession` model + state machine
3. Teacher live dashboard (real-time bar charts)
4. Student live question UI (countdown, lock-in)
5. Join code + QR generation

This delivers UC-1 (live Kahoot-style session).

### Phase C — Async Replay + Multi-timezone (build third)
1. Replay mode on closed live sessions
2. Local time display for scheduled sessions
3. "Live" vs "async" cohort split in reporting

### Phase D — Games + Advanced (future)
- Additional question types (drag/match, ordering, fill-in)
- Fuzzy matching for text answers
- Parent-visible activity results
- Export to PDF

---

## What Other LMS Do (and Why We Differ)

| Tool | Model | Weakness |
|---|---|---|
| Google Classroom | File submit + manual grade | Teacher grading bottleneck |
| Pronote / École Directe | Same + QCM bolted on | Desktop-era UX, no real-time |
| Kahoot | Live only, no reporting, no curriculum link | No persistent record, no async |
| Quizlet | Flashcards, async only | No live teacher control |
| Nearpod | Closest to our vision | Expensive, external, no school integration |

**Edulia's edge:** live + async in one system, integrated with gradebook,
attendance, and class groups. No separate tool, no data silo.

---

## Open Questions (decide before Phase B)

1. **Guest join vs account required?** — Guest join (code only, no login) lowers
   friction for students but loses persistent identity across sessions.
   Recommendation: require Edulia account for scored activities; guest for polls only.

2. **Timer enforcement:** client-side (smooth UX) or server-side (cheat-proof)?
   Recommendation: client shows countdown, server enforces deadline — reject
   answers submitted after server-side expiry.

3. **Leaderboard during live session?** — Motivating but can cause anxiety.
   Make it optional per activity.

4. **Score weight in gradebook?** — Should activity scores feed into the gradebook
   automatically? Recommendation: opt-in per activity, teacher sets coefficient.
