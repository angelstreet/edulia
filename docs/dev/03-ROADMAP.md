# 03 — Roadmap: Built, In Progress, Next

Last updated: 2026-03-07

---

## What's Built

### Core Infrastructure
| Module | Backend | Frontend | Notes |
|---|---|---|---|
| auth | JWT, refresh, reset, invite | Login, forgot/reset, accept invite | |
| users | CRUD, roles, CSV import | Users page, user form | |
| groups | CRUD, memberships | Classes page | |
| structure | Academic years, terms, campuses | Academic year page | |
| subjects | CRUD with color | Subjects page | |
| messaging | Threads, messages, compose | Messages page, thread view | |
| files | Upload, S3, ClamAV, categories | Documents page (tabbed, upload, delete) | |
| settings | Tenant config, branding | Settings page | |
| dashboards | Role-based widgets | Admin/Teacher/Student/Parent/Tutor/Enterprise dashboards | |

### School MVP (P1) — ✅ Complete
| Module | Status | What it does |
|---|---|---|
| timetable | ✅ | Session CRUD, weekly grid, week navigation, today highlight |
| attendance | ✅ | Roll call UI, date/group/session selectors |
| gradebook | ✅ | Manual grade entry (score + comment per student), coefficients, weighted averages, student/parent view |
| homework | ✅ | Teacher assigns with file/text, student submits, teacher grades with feedback |
| report_cards | ✅ | PDF export from gradebook, per-subject averages per term |
| school_life | ✅ | Incidents (type, severity, status), admin/teacher create, resolve flow |
| calendar | ✅ | School events (type, color), role-filtered, admin CRUD |
| forms | ✅ | Dynamic form builder, fill, results view, target roles |
| community | ✅ | Directory + school organigramme (class tree, members) |
| wallet | ✅ | Prepaid balance, top-up, service catalog, subscriptions, transaction history |
| notifications | ⚠️ | Backend API complete, bell/dropdown in app shell, read_at tracking. No producers yet. |
| parent portal | ✅ | /children page + ParentDashboard + StudentGradesPage child selector |
| student portal | ✅ | Dashboard + grades + homework + timetable |

### Interactive Teaching (P5) — ✅ Complete (Features 1–6)
| Feature | Status | What it does |
|---|---|---|
| F1 — Async Activity Builder | ✅ | Teacher creates QCM, draft → publish workflow |
| F2 — Async Attempt + Auto-score | ✅ | Student submits at home, server scores instantly, reveals correct answers |
| F3 — Auto-reporting Dashboard | ✅ | Per-activity stats, per-question error rates, per-student scores |
| F4 — Live Session Infrastructure | ✅ | Join codes, WebSocket + Redis pub/sub, lobby waiting room |
| F5 — Live QCM Real-Time | ✅ | Real-time question delivery, live answer bars, countdown, score reveal |
| F6 — Replay Mode | ✅ | Students replay finished live session async within deadline |

**Test coverage:** 37 HTTP integration tests + 18 Playwright E2E scenarios across all 6 features.

---

## Next Up — Ordered Execution Queue

### 🔴 NOW: Gradebook ↔ Activity Integration

**Why:** Activities (auto-scored QCM) live in a silo. Teachers want QCM scores to appear in the gradebook alongside manual grades, feeding into term averages and report cards.

**What to build:**
- Backend: `POST /api/v1/activities/{id}/push-to-gradebook` — teacher pushes activity scores as an Assessment in gradebook (creates Assessment + bulk-creates Grades from attempt scores)
- Frontend: "Push to Gradebook" button on `ActivityResultsPage` → modal to select subject/group/term/coefficient → confirm
- Gradebook then shows activity scores with a badge "from QCM" (read-only, not manually editable)
- Students and parents see QCM grades alongside manual grades in their grade view

**Effort:** Small-Medium (both systems exist, just need the bridge)

---

### 🟠 NEXT: Gradebook Audit & Gap Fix

The gradebook module exists but may have gaps. Audit and fix:

1. **Term selector** — does grade entry require selecting a term? Is it wired to the academic year/term structure?
2. **Assessment creation flow** — teacher needs to create an assessment (title, date, max score, coefficient, category) before entering grades. Is this UX smooth?
3. **Category management** — grade categories (homework, test, oral, participation) with weights. Does the UI exist?
4. **Student-facing view** — can students see their grades per subject, per term, running average?
5. **Parent-facing view** — can parents see their child's grades?
6. **Average computation** — weighted by coefficient, split by term. Is it correct?

**Effort:** Small (likely just missing UI glue, all DB/API already exists)

---

### 🟡 SOON: Billing / Stripe Real Payments

Current state: wallet top-up and service catalog exist but Stripe checkout is not wired.

**What to build:**
- Stripe payment intent for wallet top-up (server-side, webhook handler for confirmation)
- Auto-debit Celery task: daily/weekly recurring service charges from wallet
- Low balance email alert (when wallet < threshold)
- Monthly statement PDF

**Effort:** Medium (Stripe SDK + Celery already in stack)

---

### 🟡 SOON: Real-Time Notifications

Backend API is complete (read_at tracking, notification types). No producers exist.

**What to build:**
- Notification producers in key modules: new homework → notify students, new grade → notify student+parent, live session started → notify enrolled students, replay enabled → notify students
- SSE or WebSocket push to frontend (reuse existing Redis pub/sub infrastructure)
- Bell icon badge with unread count
- Notification panel auto-refresh

**Effort:** Medium

---

### 🟢 LATER: Enrollment Module

Online enrollment: parent fills form, uploads documents, admin reviews and approves.

**What to build:**
- `enrollment_requests` table (family info, child info, documents, status: pending/reviewing/approved/rejected)
- Admin review workflow with notes
- Parent tracks status
- On approval: create User (student) + Group membership automatically

**Effort:** Medium

---

### 🟢 LATER: PWA + Offline

- Service worker, installable on iPad/phone
- Offline: view timetable, grades, homework (last fetched)
- Push notifications via Web Push API

**Effort:** Medium

---

### 🔵 BACKLOG: Interactive Teaching — Phase D

Game types beyond QCM:
- Drag & match (e.g., match country → capital)
- Ordering / sequencing questions
- Fill-in-the-blank
- Gradebook integration (auto-push live session scores)
- Parent-visible activity results

---

### 🔵 BACKLOG: Tutoring Suite (P3)

For tutor accounts (already have role):
- `booking` — tutor availability calendar, student books slot
- `learning_plans` — structured curriculum per student
- `packages` — session bundles, pricing, payment

---

## Current Sprint

| Item | Status |
|---|---|
| Interactive Teaching F1–F6 | ✅ Shipped 2026-03-07 |
| Gradebook ↔ Activity Integration | 🔴 Next |
| Gradebook audit & gap fix | 🟠 After |

---

## Tech Debt / Known Issues

| Issue | Where | Fix |
|---|---|---|
| Notification producers missing | All modules | Add on each write operation |
| Activity scores not in gradebook | Activities + Gradebook | Push-to-gradebook bridge |
| WS answer store is in-memory | session_ws.py | Persist to Redis for multi-pod (post-MVP) |
| Open questions score 0 | scoring.py | Manual grading flow for open QCM (backlog) |
