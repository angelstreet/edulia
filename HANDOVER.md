# Edulia — Handover Document

**Date:** 2026-03-01
**Repo:** https://github.com/angelstreet/edulia
**Live URL:** https://edulia.angelstreet.io
**Admin login:** admin@edulia.angelstreet.io / ChangeMe123!

---

## What has been accomplished

### Infrastructure (all done)

3 dedicated VMs on Proxmox (65.108.14.251) + shared proxy:

| VM | IP | Role | Components |
|----|-----|------|-----------|
| 120 | 192.168.0.120 | App server | Python 3.11, Node 20, PM2, ClamAV, DocuSeal |
| 121 | 192.168.0.121 | Database | PostgreSQL 16 (tuned, firewalled) |
| 122 | 192.168.0.122 | Storage | MinIO (3 buckets), Redis (3 DBs), Prometheus, Grafana |
| 107 | 192.168.0.107 | Proxy (shared) | Nginx reverse proxy for edulia.angelstreet.io |

- DNS: Cloudflare A record (orange cloud proxy) → 65.108.14.251
- SSL: Cloudflare edge + self-signed cert on nginx
- Monitoring: node_exporter on all 3 VMs, Prometheus + Grafana on VM 122

### Scope 0 — Project Scaffold (done)

| Component | What was built |
|-----------|---------------|
| Backend (apps/api) | FastAPI app, /api/health, config.py (pydantic-settings), SQLAlchemy engine, TenantMixin base model, Alembic setup, tenant middleware, exception handlers |
| Frontend (apps/web) | Vite + React + TypeScript, i18n (fr/en), router, AppShell layout (Sidebar, Topbar), LoginPage + DashboardPage placeholders |
| Shared (packages/shared) | 17 TypeScript type files (user, group, session, grade, attendance, homework, quiz, message, notification, file, billing, tutoring, school-life, enrollment, calendar, common), constants (roles, permissions, modules) |
| Socket.IO (apps/socketio) | Server on port 3001, JWT auth middleware, Redis pub/sub, notification handlers |

### Scope 1 — Core Auth + RBAC (done)

**Backend:**
- SQLAlchemy models: Tenant, Campus, AcademicYear, Term, User, Role, UserRole (scope-aware), Relationship
- Auth: JWT (HS256, 30min access + 7d refresh), bcrypt passwords, login/refresh/forgot-password/reset-password/invite-accept endpoints
- RBAC: scope-aware permission checking (tenant/campus/group/course), get_current_user + require_permission dependencies
- Users: Full CRUD (paginated, filtered by role, searchable), soft delete, admin-only create/delete
- Relationships: Parent-child links, guardian endpoints
- Utilities: pagination helper, create_tenant.py CLI, Brevo email sender
- Tests: 20 tests (5 auth + 8 users + 4 RBAC + 3 relationships)

**Frontend:**
- API client: axios with JWT interceptor (auto-refresh on 401)
- Stores: authStore (zustand + persist), uiStore
- Auth pages: Login, ForgotPassword, ResetPassword, AcceptInvite
- App shell: Sidebar (role-based nav for admin/teacher/student/parent/tutor), Topbar, Breadcrumb, MobileNav
- Guards: AuthGuard, RoleGuard, ModuleGuard (stub)
- Admin: UsersPage (table + search + filter + pagination), UserForm modal, ImportCSV placeholder
- UI components: Button, Input, Select, Modal, Table, Card, Badge, Avatar, Spinner, Toast, Pagination, EmptyState

### Scope 2 — Core Structure + Dashboard (done)

**Backend:**
- Tenant settings API: GET/PATCH tenant info and settings
- Academic Year + Term API: CRUD with nested terms
- Subject API: CRUD (code, name, color, coefficient)
- Group + Membership API: CRUD groups (class/section/cohort), add/remove members
- Messaging API: Thread + Message + ThreadParticipant, create/list/reply/mark-read, tenant isolation
- Notification API: CRUD + engine.py (create_notification + Redis publish)
- File API: Upload (multipart → MinIO), download (presigned URL), delete, 50MB limit, extension blocking
- ClamAV scanner integration (exists but not wired into upload flow)
- Alembic migration for all new models (subjects, groups, group_memberships, threads, thread_participants, messages, notifications, files)
- Tests: 32 tests (4 tenant + 3 academic_years + 4 subjects + 5 groups + 7 messaging + 4 notifications + 5 files)

**Frontend:**
- API clients: groups, sessions, messages, notifications, files, tenant, subjects
- Hooks: useModule, useMessages, usePagination, useTenantBranding
- Admin pages: ClassesPage (tree view), SubjectsPage (color chips), AcademicYearPage, TenantSettingsPage
- Dashboard: Role-based rendering (Admin/Teacher/Student/Parent dashboards) with 5 widgets (TodaySchedule, RecentGrades, HomeworkDue, UnreadMessages, AlertsWidget) — all placeholder data
- Messaging: MessagesPage (split view), ThreadList, ThreadView, ComposeMessage, MessageBubble
- NotificationPanel: bell icon + unread count + dropdown (polling every 30s, no Socket.IO yet)
- FileUpload + FilePreview: drag-drop, progress bar, image/PDF/generic previews
- Router: 5 new routes with guards (/admin/classes, /admin/subjects, /admin/academic-year, /admin/settings, /messages)
- Sidebar updated per role

### Deployment (done)

- Code pulled to /opt/edulia/backend
- pip dependencies installed (+ gunicorn, celery added)
- Alembic migrations: 4 migrations applied (all tables created)
- Frontend built (Vite, 192 modules)
- PM2: 3/5 processes online (api, frontend, socketio). Worker + beat stopped (no Celery worker module yet)
- Tenant seeded: "Mon École" (slug: mon-ecole), admin user created
- Config fix: added `extra = "ignore"` to pydantic Settings, changed VITE_API_URL to relative `/api`
- Branding fix: renamed EduCore → Edulia throughout

---

## Current state

### What works
- Login with email/password (JWT tokens)
- All API endpoints authenticated and functional (tested via curl)
- Frontend serves through Cloudflare → nginx → PM2
- Role-based navigation and dashboards
- Admin can manage users, classes, subjects, academic years, tenant settings
- Messaging UI (create thread, reply, mark read)
- Notification panel with polling
- File upload component (drag-drop)
- i18n: French (default) + English

### What doesn't work yet
- Worker + Beat (no Celery worker module — no background tasks yet)
- Socket.IO real-time notifications (polling only)
- ClamAV not wired into file upload pipeline
- No actual data beyond the admin user (no students, teachers, classes, etc.)
- Dashboard widgets show placeholder/mock data

---

## What's left to build

### Near-term (scope 3+)

| Phase | Feature | Ref |
|-------|---------|-----|
| 7 | Timetable (sessions, recurring schedules, room assignment) | PHASES §7 |
| 8 | Attendance (roll call, daily/session, absence justification) | PHASES §8 |
| 9 | Gradebook (assessments, grade entry, competency tracking) | PHASES §9 |
| 10 | Homework (assignments, submissions, grading) | PHASES §10 |
| 11 | Report cards (PDF generation via WeasyPrint, templates) | PHASES §11 |

### Medium-term

| Phase | Feature | Ref |
|-------|---------|-----|
| 12 | Quizzes (question bank, online quizzes, auto-grading) | PHASES §12 |
| 13 | School life (incidents, sanctions, rewards, student council) | PHASES §13 |
| 14 | Tutoring scope (tutors, bookings, payments) | PHASES §14 |
| 15 | Billing (invoices, payments, Stripe integration) | PHASES §15 |

### Infrastructure / hardening

| Item | Description |
|------|-------------|
| OAuth / SSO | Add Google, Microsoft 365, SAML/OIDC (consider Keycloak for self-hosted) |
| Celery worker module | Create worker.py for background tasks (email sending, PDF generation, notifications) |
| Wire ClamAV | Call scanner.scan_file() in file upload service before storing |
| Socket.IO integration | Connect frontend useNotifications to Socket.IO for real-time push |
| DB-level constraints | Add unique composite constraint on (tenant_id, email) for users |
| Tenant scoping audit | Ensure all GET endpoints filter by current user's tenant_id |
| CORS hardening | Lock down CORS_ORIGINS to actual domain only |
| Rate limiting | Add rate limiting to auth endpoints |
| Automated tests | Add Playwright/Cypress E2E tests |
| CI/CD | GitHub Actions pipeline: lint → test → build → deploy |
| Backup | PostgreSQL pg_dump cron, MinIO bucket replication |
| send_template_email | Add template-based email function to email sender |

---

## Architecture overview

```
Internet → Cloudflare CDN → 65.108.14.251:443
  → Nginx (VM 107) → edulia.angelstreet.io
    → /           → 192.168.0.120:3000 (React SPA via PM2 serve)
    → /api/       → 192.168.0.120:8000 (FastAPI via Gunicorn)
    → /socket.io/ → 192.168.0.120:3001 (Socket.IO)

FastAPI (VM 120) → PostgreSQL (VM 121)
                 → Redis (VM 122) — cache + Socket.IO pub/sub
                 → MinIO (VM 122) — file storage
                 → ClamAV (VM 120 Docker) — virus scanning
                 → DocuSeal (VM 120 Docker) — document signing
```

## Key files

| File | Purpose |
|------|---------|
| apps/api/app/config.py | Backend settings (loads from .env) |
| apps/api/app/main.py | FastAPI app entry point |
| apps/api/app/core/dependencies.py | Auth + permission dependencies |
| apps/api/app/db/models/ | All SQLAlchemy models |
| apps/api/app/modules/ | API modules (auth, users, tenant, subjects, groups, messaging, notifications, files) |
| apps/web/src/app/router.tsx | Frontend routing with guards |
| apps/web/src/stores/authStore.ts | Auth state (zustand) |
| apps/web/src/api/client.ts | Axios instance with JWT interceptor |
| apps/web/.env.production | VITE_API_URL=/api |
| /opt/edulia/backend/.env | Production secrets (VM 120) |
| /opt/edulia/backend/ecosystem.config.js | PM2 process config |
| scripts/create_tenant.py | CLI to seed tenant + admin |

## Credentials

All secrets live on the VMs — never in docs or repo.

```bash
ssh edulia-app "cat /opt/edulia/backend/.env"           # Full app config
ssh edulia-storage "cat /opt/edulia/.env"                # MinIO + Redis + Grafana
ssh edulia-db "sudo -u postgres psql -d edulia"          # Direct DB access
```

## SSH access

```bash
ssh edulia-app       # VM 120
ssh edulia-db        # VM 121
ssh edulia-storage   # VM 122
ssh proxy            # VM 107
```
