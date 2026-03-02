# Edulia — Code Development Scopes

Parallel task assignment for building the codebase. Maps to `08-BUILD-PHASES.md`.

**Repo:** `https://github.com/angelstreet/edulia`
**Deploy target:** VM 120 at `/opt/edulia/backend`

---

## Scope 0 — Project Scaffold (3 parallel terminals)

No dependencies between these — all run at the same time.

### Terminal 1: Backend scaffold

```
Phase 0 Steps 0.1 + 0.2. Initialize the FastAPI backend in apps/api/:

1. Create the monorepo root structure: Makefile, .env.example, .gitignore, LICENSE (AGPL-3.0), docker-compose.yml (for local dev)
2. Create apps/api/ with: pyproject.toml, requirements.txt, alembic.ini, alembic/env.py
3. Create app/main.py — FastAPI app with /api/health endpoint returning {"status": "healthy"}
4. Create app/config.py — load settings from env (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
5. Create app/db/database.py — SQLAlchemy async engine + session factory connecting to PostgreSQL
6. Create app/db/base.py — Base model class with TenantMixin (id, tenant_id, created_at, updated_at)
7. Create app/core/exceptions.py — custom exception handlers
8. Create app/core/middleware.py — tenant resolution middleware
9. Run alembic init, configure env.py to use app models
10. Create initial migration (empty — just proves alembic works)

Test: alembic upgrade head succeeds, curl localhost:8000/api/health returns {"status": "healthy"}
Ref: 08-BUILD-PHASES.md Phase 0 Steps 0.1–0.2, 06-FILE-STRUCTURE.md Backend section, 01-CORE-SHELL.md for data model

Push to main when done. Do NOT create frontend files.
```

### Terminal 2: Frontend scaffold

```
Phase 0 Step 0.3. Initialize the React frontend in apps/web/:

1. Create Vite + React + TypeScript project in apps/web/
2. Setup: main.tsx, App.tsx, app/router.tsx, app/providers.tsx
3. Configure i18next with fr/en locales (apps/web/src/i18n.ts, locales/fr/common.json, locales/en/common.json)
4. Create basic app shell layout components: AppShell.tsx, Sidebar.tsx, Topbar.tsx (placeholder content)
5. Create styles/globals.css with CSS variables for theming
6. Create a LoginPage.tsx placeholder at /login route
7. Create a DashboardPage.tsx placeholder at /dashboard route
8. Configure router with these 2 routes + a catch-all redirect to /login
9. Add .env.production with VITE_API_URL and VITE_APP_NAME

Test: npm run dev serves at localhost:5173, shows app shell with EduCore logo
Ref: 08-BUILD-PHASES.md Phase 0 Step 0.3, 06-FILE-STRUCTURE.md Frontend section

Push to main when done. Do NOT create backend files.
```

### Terminal 3: Shared types + Socket.IO scaffold

```
Phase 0 Step 0.4 + Socket.IO setup. Create shared contracts and real-time server:

1. Create packages/shared/ as a TypeScript package with tsconfig.json and package.json
2. Create packages/shared/src/types/ with ALL type files from 06-FILE-STRUCTURE.md:
   user.ts, group.ts, session.ts, grade.ts, attendance.ts, homework.ts, quiz.ts,
   message.ts, notification.ts, file.ts, billing.ts, tutoring.ts, school-life.ts,
   enrollment.ts, calendar.ts, common.ts
   Use 01-CORE-SHELL.md for the exact entity definitions.
3. Create packages/shared/src/constants/ with: roles.ts, permissions.ts, modules.ts
4. Create apps/socketio/ with: package.json, src/index.ts, src/auth.ts, src/redis.ts
5. Socket.IO server: connect to Redis for pub/sub, validate JWT on connection, basic handlers/notifications.ts

Test: tsc --noEmit passes for shared package, Socket.IO server starts and connects to Redis
Ref: 08-BUILD-PHASES.md Phase 0 Step 0.4, 06-FILE-STRUCTURE.md Shared + SocketIO sections, 01-CORE-SHELL.md for all entities

Push to main when done. Do NOT create backend API or frontend files.
```

---

## Scope 1 — Core Auth + RBAC (2 parallel terminals, after scope 0)

### Terminal 1: Backend auth + RBAC + user CRUD

```
Phase 1 + Phase 2 backend. Build auth system and user management API:

1. Phase 1 Step 1.1: Create SQLAlchemy models for Tenant, Campus, User, AcademicYear, Term in apps/api/app/db/models/
   Use 01-CORE-SHELL.md for exact field definitions. Generate alembic migration.
2. Phase 1 Step 1.2: Create auth module (apps/api/app/modules/auth/):
   - router.py: POST /login, POST /refresh, POST /forgot-password, POST /reset-password
   - service.py: JWT creation, password hashing (bcrypt), token validation
   - schemas.py: Pydantic models for requests/responses
   - app/core/security.py: JWT encode/decode, password hash/verify
3. Phase 2 Step 2.1: Add Role, UserRole models. Create app/core/permissions.py (RBAC enforcement),
   app/core/dependencies.py (get_current_user, require_permission decorators)
4. Phase 2 Step 2.2: Create users module (apps/api/app/modules/users/):
   - Full CRUD: GET list (paginated, filtered), POST create, GET by id, PATCH update, DELETE soft-delete
   - Search by name/email, filter by role
   - Admin-only create/delete
5. Phase 2 Step 2.3: Add invite flow — POST /users creates with status "invited",
   POST /auth/invite/accept sets password and activates
6. Phase 2 Step 2.5: Create Relationship model and endpoints (parent-child links)
7. Write pytest tests for ALL endpoints listed in 08-BUILD-PHASES.md Phase 1 + Phase 2 (29 test cases total)
8. Create scripts/create_tenant.py — CLI to seed a tenant + admin user

Run alembic upgrade head + pytest. All tests must pass.
Ref: 08-BUILD-PHASES.md Phase 1 + Phase 2, 01-CORE-SHELL.md §1.1–1.6

Push to main when done.
```

### Terminal 2: Frontend auth + admin UI

```
Phase 1 + Phase 2 frontend. Build login flow and admin pages:

1. Phase 1 Step 1.3: Build LoginPage.tsx + LoginForm.tsx:
   - Email + password fields, submit, error handling
   - Create api/client.ts (axios instance with JWT interceptor)
   - Create api/auth.ts (login, refresh, forgotPassword, resetPassword)
   - Create stores/authStore.ts (zustand — token, user, login/logout actions)
   - Create hooks/useAuth.ts
   - On success: redirect to /dashboard
2. Phase 1 Step 1.4: Build ForgotPasswordPage.tsx + ResetPasswordPage.tsx
3. Phase 4 Step 4.1: Build full AppShell layout:
   - Sidebar.tsx with role-based menu items (teacher/student/parent/admin see different items)
   - Topbar.tsx with user menu, notification bell placeholder
   - Breadcrumb.tsx
   - MobileNav.tsx (bottom tab bar for mobile)
4. Phase 4 Step 4.2: Mobile navigation (responsive, hamburger menu)
5. Phase 2 Step 2.4: Build admin UsersPage.tsx + UserForm.tsx:
   - Users table with columns (name, email, role, status)
   - Add/edit user modal, search, filter by role, pagination
   - AcceptInvitePage.tsx for invite flow
6. Create app/guards/AuthGuard.tsx, RoleGuard.tsx, ModuleGuard.tsx
7. Create hooks/usePermission.ts, useCurrentUser.ts

Test: Login flow works end-to-end against the backend API. Admin can list/create users.
Ref: 08-BUILD-PHASES.md Phase 1 Steps 1.3–1.4, Phase 2 Steps 2.3–2.4, Phase 4 Steps 4.1–4.2

Push to main when done.
```

---

## Scope 2 — Core Structure + Dashboard (2 parallel terminals, after scope 1)

### Terminal 1: Backend structure APIs

```
Phase 3 + Phase 5 + Phase 6 backend. Build structure, messaging, and file APIs:

1. Phase 3 Step 3.1: Tenant settings API (GET/PATCH tenant, GET/PATCH settings)
2. Phase 3 Step 3.2: AcademicYear + Term CRUD API
3. Phase 3 Step 3.3: Subject CRUD API (code, name, color)
4. Phase 3 Step 3.4: Group + GroupMembership CRUD API (classes, add/remove members)
5. Phase 5 Step 5.1: Messaging API — Thread, Message, ThreadParticipant models + CRUD
   (create thread, list threads, reply, mark read, tenant isolation)
6. Phase 5 Step 5.3: Notification API — Notification model + CRUD + notification engine
7. Phase 6 Step 6.1: File upload/download API — multipart upload to MinIO, presigned download URLs,
   ClamAV virus scan on upload, file type/size validation
8. Create apps/api/app/integrations/email/sender.py (Brevo transactional email)
9. Create apps/api/app/integrations/clamav/scanner.py (virus scan client)
10. Write pytest tests for ALL endpoints (36 test cases total from phases 3+5+6)

Run pytest. All tests must pass.
Ref: 08-BUILD-PHASES.md Phase 3 + Phase 5 + Phase 6, 01-CORE-SHELL.md §1.7–1.8

Push to main when done.
```

### Terminal 2: Frontend structure + dashboard UI

```
Phase 3 + Phase 4 + Phase 5 + Phase 6 frontend. Build admin pages, dashboard, messaging, files:

1. Phase 3 Step 3.6: Admin structure pages:
   - ClassesPage.tsx (group tree view)
   - SubjectsPage.tsx (list with color chips)
   - AcademicYearPage.tsx (year + terms config)
   - TenantSettingsPage.tsx
2. Phase 4 Step 4.3: Role-based DashboardPage.tsx with:
   - TeacherDashboard.tsx (today schedule, quick actions)
   - StudentDashboard.tsx (schedule, homework due, grades)
   - ParentDashboard.tsx (child selector, alerts)
   - AdminDashboard.tsx (stats, activity)
   - Widget components: TodaySchedule, RecentGrades, HomeworkDue, UnreadMessages
3. Phase 5 Step 5.2: Messaging UI:
   - MessagesPage.tsx, ThreadList.tsx, ThreadView.tsx, ComposeMessage.tsx
4. Phase 5 Step 5.4: NotificationPanel.tsx + useNotifications.ts (bell icon, dropdown, real-time via Socket.IO)
5. Phase 6 Step 6.2: FileUpload.tsx component (drag-drop, progress bar, preview)
6. Create api/ client files: groups.ts, sessions.ts, messages.ts, notifications.ts, files.ts, tenant.ts
7. Create hooks: useModule.ts, useMessages.ts, usePagination.ts, useTenantBranding.ts

Test: Admin can manage classes/subjects/years. Dashboard shows role-appropriate widgets. Messaging works end-to-end.
Ref: 08-BUILD-PHASES.md Phase 3 Step 3.6, Phase 4 Step 4.3, Phase 5 Steps 5.2+5.4, Phase 6 Step 6.2

Push to main when done.
```

---

## After Scope 2 — Deploy + Continue

Once scope 2 is merged, run the remaining install tasks on VM 120:

```bash
ssh edulia-app "cd /opt/edulia/backend && git pull && source .venv/bin/activate && pip install -r apps/api/requirements.txt && cd apps/api && alembic upgrade head"
ssh edulia-app "cd /opt/edulia/backend/apps/web && npm ci && npm run build"
ssh edulia-app "cd /opt/edulia/backend && pm2 start ... && pm2 save"  # task 16
ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && python3 scripts/create_tenant.py ..."  # task 17
```

Then continue with Phase 7–16 (timetable, attendance, gradebook, homework, tutoring, billing, quizzes, report cards, hardening) — same pattern of parallel backend + frontend terminals.
