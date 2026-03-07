# 03 — Roadmap: Built, In Progress, Next

Last updated: 2026-03-10

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

### ✅ DONE: Gradebook ↔ Activity Integration (shipped 2026-03-07)

- `POST /api/v1/activities/{id}/push-to-gradebook` — score scaling, idempotency via `source_activity_id`
- "Push to Gradebook" button + modal on ActivityResultsPage
- QCM badge on assessments in gradebook; read-only grade cells for QCM-sourced grades
- 10 HTTP integration tests + 5 Playwright E2E

### ✅ DONE: Gradebook Audit & Gap Fix (shipped 2026-03-08)

- GradebookPage: working term + subject filter selects; assessment creation modal passes subject_id + term_id
- GradeEntryPage: student names resolved from group members (no more UUID slugs); QCM grades read-only
- StudentGradesPage: term filter dropdown; passes term_id to averages and subject drill-down
- Backend: `GET /gradebook/assessments/{id}` endpoint added
- 10 HTTP integration tests + 5 Playwright E2E

---

### ✅ DONE: Billing / Stripe Real Payments (shipped 2026-03-09)

- `POST /api/v1/wallet/create-payment-intent` — Stripe PaymentIntent creation with user/tenant metadata
- `POST /api/v1/stripe/webhook` — verifies Stripe signature, credits wallet on `payment_intent.succeeded` (idempotent via `stripe_payment_intent_id`)
- Celery worker + beat: `charge_subscriptions` (daily auto-debit by billing_period), `send_low_balance_alerts`
- SMTP low balance email when wallet below threshold
- Frontend: Stripe Elements (`CardElement`) in WalletPage; fallback to direct top-up in dev without Stripe keys
- Migration `d1e2f3a4b5c6`: `stripe_payment_intent_id` on `wallet_transactions`
- 10 HTTP integration tests + 5 Playwright E2E

---

### ✅ DONE: Real-Time Notifications (shipped 2026-03-10)

- Producers added to homework (assign → notify students), gradebook (bulk grades → notify student), activity (live session start → notify group, replay enabled → notify group)
- All producers wrapped in `try/except` — never block main flow
- `GET /api/v1/notifications/stream` — SSE endpoint via Redis pub/sub with heartbeat + cleanup
- `GET /api/v1/notifications/unread-count` — fast badge count
- Frontend: `useNotifications` uses SSE-first with 30s polling fallback; NotificationPanel auto-refreshes on open
- 10 HTTP integration tests + 5 Playwright E2E

---

### 🟢 NOW: Enrollment Module

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
| Gradebook ↔ Activity Integration | ✅ Shipped 2026-03-07 |
| Gradebook audit & gap fix | ✅ Shipped 2026-03-08 |
| Billing / Stripe Real Payments | ✅ Shipped 2026-03-09 |
| Real-Time Notifications | ✅ Shipped 2026-03-10 |
| Enrollment Module | 🟢 Next |

---

## Tech Debt / Known Issues

| Issue | Where | Fix |
|---|---|---|
| Notification producers missing | All modules | ✅ Fixed — homework, gradebook, activity producers added |
| Activity scores not in gradebook | Activities + Gradebook | ✅ Fixed — push-to-gradebook bridge |
| WS answer store is in-memory | session_ws.py | Persist to Redis for multi-pod (post-MVP) |
| Open questions score 0 | scoring.py | Manual grading flow for open QCM (backlog) |
