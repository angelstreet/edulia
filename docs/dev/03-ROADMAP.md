# 03 — Roadmap: Built, In Progress, Next

Last updated: 2026-03-13

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
| notifications | ✅ | SSE push + 30s polling fallback, producers in homework/gradebook/activity, bell badge, unread count |
| parent portal | ✅ | /children page + ParentDashboard + StudentGradesPage child selector |
| student portal | ✅ | Dashboard + grades + homework + timetable |
| enrollment | ✅ | Parent submits request, admin reviews, auto-creates student on approval |
| absence_justification | ✅ | Parent submits, admin/teacher reviews, SMS on status change |
| health_records | ✅ | One-to-one per student — allergies, meds, emergency contact, blood type |
| tutor CRM | ✅ | Session log, packages, invoice generation + PDF download |
| billing (school invoices) | ✅ | Invoices with ReportLab PDF, sender/recipient addresses, SIRET, in-app viewer, wallet pay |
| billing (pre-fill) | ✅ | New invoice form auto-fills IBAN/contact from tenant settings |
| user management roles | ✅ | Admin + tutor can add users; teacher cannot (school admin handles that) |

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

### ✅ DONE: Enrollment Module (shipped 2026-03-11)

- `EnrollmentRequest` model: parent/child info, status workflow (pending→reviewing→approved→rejected), documents, admin notes
- Migration `e2f3a4b5c6d7`: `enrollment_requests` table
- Service: on approval auto-creates student `User` + assigns role + adds `GroupMembership`
- Endpoints: `POST /enrollment`, `GET /enrollment`, `GET /enrollment/my`, `GET /enrollment/{id}`, `PATCH /enrollment/{id}/review`
- Notifications: admins alerted on new request; parent alerted on each status change
- Admin UI: status filter tabs, review table, approve/reject modal with notes
- Parent UI: submit form (pre-filled from auth), my requests list with status badges
- Routes: `/admin/enrollment` (admin-guarded), `/enrollment` (parent-facing)
- 10 HTTP integration tests + 5 Playwright E2E

---

### ✅ DONE: PWA + Mobile/Tablet Layout (shipped 2026-03-12)

**PWA:**
- `vite-plugin-pwa` + Workbox: autoUpdate service worker, web app manifest
- NetworkFirst for API routes (timetable, grades, homework) — works offline with last-fetched data
- CacheFirst for static assets (30-day cache)
- `InstallPrompt` banner: shows on eligible browsers, dismissable, standalone-mode aware
- index.html: full PWA meta tags (theme-color, apple-mobile-web-app-*, description)

**Mobile/tablet layout audit:**
- All tables wrapped with `overflow-x-auto` + negative margin bleed
- Filter rows stack vertically on mobile (`flex-col sm:flex-row`)
- Dashboard grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Topbar breadcrumb truncated on mobile
- EnrollmentPage admin: card layout on mobile, table on md+
- Enrollment links added to MobileNav + Sidebar (admin + parent)

---

### ✅ DONE: School Gaps + Tutor CRM (shipped 2026-03-13)

**School gaps:**
- `absence_justifications` table: parent submits justification per absence date (reason, description, optional document URL), status workflow pending→accepted→rejected, admin/teacher review with notes
- `health_records` table: one-to-one per student — allergies, medical conditions, medications, blood type, emergency contact, doctor info
- Twilio SMS integration (`send_sms()`) — no-op when `SMS_ENABLED=false`; SMS sent on absence status change
- Migrations: `f3a4b5c6d7e8` (absence/health)

**Tutor CRM:**
- `tutoring_sessions`: date, duration, rate per session, status (scheduled/completed/cancelled/no_show), homework given, package link, invoiced flag
- `tutoring_packages`: session bundles (total/used), price, paid status
- `tutoring_invoices`: auto-generated from uninvoiced completed sessions, line items (JSONB), PDF download via reportlab, invoice number `INV-YYYYMM-XXXX`
- 9 REST endpoints: `/v1/tutoring/sessions`, `/packages`, `/invoices/generate`, `/invoices/{id}/pdf`, `/my-students`
- Frontend: 4-tab CRM page (My Students | Sessions | Packages | Invoices) with log-session modal, package modal, invoice generation
- Migration: `a4b5c6d7e8f9` (tutoring tables)

---

### ✅ DONE: Billing UX + Private Tutor Polish (shipped 2026-03-08)

**Billing module fixes and enhancements:**
- `GET /v1/billing/invoices` was crashing (500) due to `ur.role.name` — `Role` model has `.code`, not `.name`. Fixed.
- `GET /v1/tenant/settings` was returning `{settings: {...}}` wrapper but frontend typed it as flat `TenantSettings`. Now returns flat dict directly.
- PDF served via `GET /v1/billing/invoices/{id}/pdf` requires JWT — replaced bare `<a href>` link with axios blob fetch + in-app iframe overlay + download button.
- PDF ReportLab layout: added sender block (name, SIRET, address, phone) top-left; recipient box (name, address, phone) top-right; fixed table/header bar overlap by using `wrapOn()` actual height instead of row-count estimate.
- New invoice form: IBAN and contact info now auto-fill from tenant settings; parent phone field added.

**Attendance filter:**
- Group members include all roles (tutor, member); `AttendancePage` now filters to `role=member|student` before rendering student rows.

**Seed script (`seed_private_tutor.py --reset`):**
- `delete_existing()` rewrote to cover ALL TenantMixin tables in FK-safe order; uses per-statement `engine.connect()` with error logging; post-delete verification raises `RuntimeError` if tenant still exists.

**Role / user management:**
- Tutor role: can access Users page (`admin/users`) to add tutees and parents.
- Teacher role: removed from Users page — in normal schools, admin/director manages users.
- `RoleGuard` on `admin/users` route: `['admin', 'tutor']` only.

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
| Enrollment Module | ✅ Shipped 2026-03-11 |
| PWA + Mobile/Tablet Layout | ✅ Shipped 2026-03-12 |
| School Gaps + Tutor CRM | ✅ Shipped 2026-03-13 |
| Billing UX + Private Tutor Polish | ✅ Shipped 2026-03-08 |

---

## Tech Debt / Known Issues

| Issue | Where | Fix |
|---|---|---|
| Notification producers missing | All modules | ✅ Fixed — homework, gradebook, activity producers added |
| Activity scores not in gradebook | Activities + Gradebook | ✅ Fixed — push-to-gradebook bridge |
| WS answer store is in-memory | session_ws.py | Persist to Redis for multi-pod (post-MVP) |
| Open questions score 0 | scoring.py | Manual grading flow for open QCM (backlog) |
| Vite dev server in production | VM port 3000 | Replace with nginx serving dist/ + proxy /api (post-MVP) |
| Cloudflare 100s WS idle timeout | Live sessions | Frontend reconnects on close — acceptable for now |
