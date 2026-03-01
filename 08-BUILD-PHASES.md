# 08 — Build Phases (AI-Testable Micro-Scopes)

Every build step is designed to be **independently testable** — either via API tests (pytest/httpx) or via browser E2E tests (Playwright/Puppeteer screenshots). Nothing moves to "done" without a passing test.

**Testing approaches per step:**
- **API test** — automated pytest hitting real endpoints with assertions
- **E2E screenshot** — Playwright captures the page, AI agent or human verifies visually
- **Both** — API tests for logic + screenshot for UI verification

---

## Phase 0 — Project Scaffold

### Step 0.1: Repository Setup
```
What: Initialize monorepo structure, Docker Compose, basic configs
Files: docker-compose.yml, Makefile, .env.example, .gitignore, LICENSE (AGPL-3.0)
Test: `docker compose up` starts all services without errors
Verify: `curl http://localhost:8000/api/health` returns {"status": "healthy"}
Type: API test
```

### Step 0.2: Database + Migrations Setup
```
What: PostgreSQL connection, Alembic init, Base model with TenantMixin
Files: apps/api/app/db/database.py, apps/api/app/db/base.py, alembic.ini, alembic/env.py
Test: `alembic upgrade head` runs without error, tables created
Verify: Connect to DB, check tables exist
Type: API test (DB assertion)
```

### Step 0.3: Frontend Scaffold
```
What: Vite + React + TypeScript project, i18next setup, router, basic App shell
Files: apps/web/ (main.tsx, App.tsx, router.tsx, i18n.ts)
Test: `npm run dev` serves at localhost:5173
Verify: Screenshot of blank app shell with EduCore logo
Type: E2E screenshot
```

### Step 0.4: Shared Types Package
```
What: TypeScript types for all core entities (User, Tenant, Role, etc.)
Files: packages/shared/src/types/*.ts, packages/shared/src/constants/*.ts
Test: `tsc --noEmit` passes — all types compile
Verify: Types importable from apps/web
Type: Build check
```

---

## Phase 1 — Core Auth

### Step 1.1: Tenant + User Models
```
What: SQLAlchemy models for Tenant, Campus, User with migration
Files: apps/api/app/db/models/tenant.py, user.py
Migration: creates tenants, campuses, users tables
Test API:
  - POST seed tenant + user directly in DB
  - SELECT confirms data
Type: API test
```

### Step 1.2: Auth — Register/Login
```
What: JWT auth (login, token refresh, password hashing)
Files: apps/api/app/modules/auth/router.py, service.py, schemas.py
       apps/api/app/core/security.py

Test API:
  POST /api/v1/auth/login {email, password} → 200 {access_token, refresh_token}
  POST /api/v1/auth/login {wrong password} → 401
  POST /api/v1/auth/refresh {refresh_token} → 200 {new access_token}
  GET  /api/v1/users/me (with token) → 200 {user data}
  GET  /api/v1/users/me (no token) → 401

Type: API test (5 test cases)
```

### Step 1.3: Login Page UI
```
What: Login form, error handling, redirect to dashboard on success
Files: apps/web/src/features/auth/pages/LoginPage.tsx
       apps/web/src/features/auth/components/LoginForm.tsx
       apps/web/src/api/client.ts, apps/web/src/api/auth.ts
       apps/web/src/stores/authStore.ts

Test E2E:
  1. Screenshot: login page renders (email + password fields + button)
  2. Enter wrong credentials → error message shown
  3. Enter correct credentials → redirect to /dashboard
  4. Refresh page → still authenticated (token persisted)

Type: E2E screenshot (4 screenshots)
```

### Step 1.4: Password Reset Flow
```
What: Forgot password → email with token → reset form
Files: apps/api/app/modules/auth/router.py (forgot-password, reset-password endpoints)
       apps/web/src/features/auth/pages/ForgotPasswordPage.tsx
       apps/web/src/features/auth/pages/ResetPasswordPage.tsx

Test API:
  POST /api/v1/auth/forgot-password {email} → 200 (email queued)
  POST /api/v1/auth/reset-password {token, new_password} → 200
  POST /api/v1/auth/login {email, new_password} → 200

Test E2E:
  1. Screenshot: forgot password page
  2. Screenshot: reset password page with token in URL

Type: Both
```

---

## Phase 2 — Core RBAC + Users

### Step 2.1: Role + Permission Models
```
What: Role, UserRole tables, permission constants, RBAC middleware
Files: apps/api/app/db/models/user.py (add Role, UserRole)
       apps/api/app/core/permissions.py
       apps/api/app/core/dependencies.py (get_current_user, require_permission)
       packages/shared/src/constants/permissions.ts

Test API:
  - Create user with role "teacher" + permissions ["gradebook.grade.create"]
  - GET endpoint with @require_permission("gradebook.grade.create") → 200
  - GET same endpoint as "student" (no permission) → 403
  - GET endpoint scoped to campus A as user scoped to campus B → 403

Type: API test (4 test cases)
```

### Step 2.2: User CRUD API
```
What: Full user management endpoints
Files: apps/api/app/modules/users/router.py, service.py, schemas.py

Test API:
  GET    /api/v1/users → 200 (paginated list, filtered by tenant)
  POST   /api/v1/users {name, email, role} → 201 (admin only)
  GET    /api/v1/users/:id → 200
  PATCH  /api/v1/users/:id → 200
  DELETE /api/v1/users/:id → 204 (soft delete)
  GET    /api/v1/users?role=teacher → filtered results
  GET    /api/v1/users?q=dupont → search results
  POST   /api/v1/users as non-admin → 403

Type: API test (8 test cases)
```

### Step 2.3: User Invite Flow
```
What: Admin creates user → invite email → user accepts → sets password
Files: apps/api/app/modules/auth/router.py (invite/accept endpoint)
       apps/api/app/integrations/email/sender.py
       apps/web/src/features/auth/pages/AcceptInvitePage.tsx

Test API:
  POST /api/v1/users {status: "invited"} → user created, invite token generated
  POST /api/v1/auth/invite/accept {token, password} → 200, user status → "active"

Test E2E:
  1. Screenshot: accept invite page with password form

Type: Both
```

### Step 2.4: Admin Users Page
```
What: Users list with filters, search, pagination, add/edit/delete
Files: apps/web/src/features/admin/pages/UsersPage.tsx
       apps/web/src/features/admin/components/UserForm.tsx

Test E2E:
  1. Screenshot: users table with data (name, role, status columns)
  2. Screenshot: add user modal/form
  3. Screenshot: search results filtered by "teacher"
  4. Screenshot: pagination (page 2)

Type: E2E screenshot (4 screenshots)
```

---

## Phase 3 — Core Structure (Tenants, Groups, Subjects)

### Step 3.1: Tenant + Campus API
```
What: Tenant settings, campus CRUD
Files: apps/api/app/modules/tenant/router.py, service.py, schemas.py

Test API:
  GET   /api/v1/tenant → 200 {tenant info}
  PATCH /api/v1/tenant → 200 (admin updates settings)
  GET   /api/v1/tenant/settings → 200
  PATCH /api/v1/tenant/settings → 200 (enable/disable modules)

Type: API test (4 test cases)
```

### Step 3.2: Academic Year + Term API
```
What: Year/term CRUD
Files: apps/api/app/modules/academic_years/ (router, service, schemas)

Test API:
  POST /api/v1/academic-years → 201 {name: "2025-2026", start, end}
  POST /api/v1/academic-years/:id/terms → 201 {name: "Trimestre 1"}
  GET  /api/v1/academic-years → 200 (list with terms)

Type: API test (3 test cases)
```

### Step 3.3: Subject CRUD API
```
What: Subject management
Files: apps/api/app/modules/subjects/ (router, service, schemas)

Test API:
  POST   /api/v1/subjects → 201 {code: "MATH", name: "Mathématiques", color: "#4A90D9"}
  GET    /api/v1/subjects → 200 (list)
  PATCH  /api/v1/subjects/:id → 200
  DELETE /api/v1/subjects/:id → 204

Type: API test (4 test cases)
```

### Step 3.4: Group + Membership API
```
What: Classes, sections, memberships
Files: apps/api/app/modules/groups/ (router, service, schemas)

Test API:
  POST   /api/v1/groups → 201 {type: "class", name: "6ème A"}
  GET    /api/v1/groups → 200 (list with member count)
  POST   /api/v1/groups/:id/members → 200 (add student)
  DELETE /api/v1/groups/:id/members/:uid → 200 (remove)
  GET    /api/v1/groups/:id → 200 (includes member list)

Type: API test (5 test cases)
```

### Step 3.5: Relationship API (Guardian/Parent links)
```
What: Parent-child, tutor-student relationships
Files: apps/api/app/db/models/user.py (Relationship model)
       apps/api/app/modules/users/ (relationship endpoints)

Test API:
  POST /api/v1/users/:id/relationships → 201 {type: "guardian", to_user_id: child_id}
  GET  /api/v1/users/:id/relationships → 200 (list of related users)
  GET  /api/v1/users/:id/children → 200 (parent's children shortcut)

Type: API test (3 test cases)
```

### Step 3.6: Admin Structure Pages
```
What: Classes page, subjects page, academic year config
Files: apps/web/src/features/admin/pages/ClassesPage.tsx
       apps/web/src/features/admin/pages/SubjectsPage.tsx
       apps/web/src/features/admin/pages/AcademicYearPage.tsx

Test E2E:
  1. Screenshot: classes page with tree view (6ème > 6°A, 6°B)
  2. Screenshot: subjects list with color chips
  3. Screenshot: academic year with terms timeline

Type: E2E screenshot (3 screenshots)
```

---

## Phase 4 — UI Shell + Navigation

### Step 4.1: App Shell Layout
```
What: Topbar, sidebar, breadcrumbs, main content area
Files: apps/web/src/components/layout/AppShell.tsx
       apps/web/src/components/layout/Sidebar.tsx
       apps/web/src/components/layout/Topbar.tsx
       apps/web/src/components/layout/Breadcrumb.tsx

Test E2E:
  1. Screenshot: logged in as teacher → sidebar shows teacher items
  2. Screenshot: logged in as student → sidebar shows student items
  3. Screenshot: logged in as parent → sidebar shows parent items + child selector
  4. Screenshot: logged in as admin → sidebar shows admin items

Type: E2E screenshot (4 screenshots)
```

### Step 4.2: Mobile Navigation
```
What: Bottom tab bar for mobile, hamburger menu
Files: apps/web/src/components/layout/MobileNav.tsx

Test E2E:
  1. Screenshot: mobile viewport (375px) → bottom tab bar visible, sidebar hidden
  2. Screenshot: tap hamburger → sidebar slides in

Type: E2E screenshot (2 screenshots, mobile viewport)
```

### Step 4.3: Dashboard Page (Role-based)
```
What: Dashboard that renders different widgets per role
Files: apps/web/src/features/dashboard/pages/DashboardPage.tsx
       apps/web/src/features/dashboard/components/TeacherDashboard.tsx
       apps/web/src/features/dashboard/components/StudentDashboard.tsx
       apps/web/src/features/dashboard/components/ParentDashboard.tsx
       apps/web/src/features/dashboard/components/AdminDashboard.tsx

Test E2E:
  1. Screenshot: teacher dashboard (today's schedule, quick actions, unread messages)
  2. Screenshot: student dashboard (schedule, homework due, recent grades)
  3. Screenshot: parent dashboard (child selector, alerts, grades, payments)
  4. Screenshot: admin dashboard (stats, recent activity)

Type: E2E screenshot (4 screenshots)
```

---

## Phase 5 — Messaging + Notifications

### Step 5.1: Messaging API
```
What: Threads, messages, participants
Files: apps/api/app/modules/messaging/ (router, service, schemas)
       apps/api/app/db/models/message.py

Test API:
  POST /api/v1/threads → 201 {type: "direct", participants: [...], subject, body}
  GET  /api/v1/threads → 200 (list, ordered by last message)
  GET  /api/v1/threads/:id → 200 (thread + messages)
  POST /api/v1/threads/:id/messages → 201 (reply)
  PATCH /api/v1/threads/:id/read → 200 (mark read)
  GET  /api/v1/threads (as user B) → only threads where B is participant
  GET  /api/v1/threads (as user in other tenant) → empty (tenant isolation)

Type: API test (7 test cases)
```

### Step 5.2: Messaging UI
```
What: Thread list + thread view + compose
Files: apps/web/src/features/messaging/pages/MessagesPage.tsx
       apps/web/src/features/messaging/components/ThreadList.tsx
       apps/web/src/features/messaging/components/ThreadView.tsx
       apps/web/src/features/messaging/components/ComposeMessage.tsx

Test E2E:
  1. Screenshot: message list with unread indicators
  2. Screenshot: open thread showing conversation bubbles
  3. Screenshot: compose new message modal (recipient search, subject, body)
  4. Screenshot: send message → appears in recipient's inbox

Type: E2E screenshot (4 screenshots)
```

### Step 5.3: Notification API
```
What: Notification CRUD, mark read
Files: apps/api/app/modules/notifications/ (router, service, schemas, engine.py)

Test API:
  GET   /api/v1/notifications → 200 (list, unread first)
  PATCH /api/v1/notifications/:id/read → 200
  POST  /api/v1/notifications/read-all → 200
  # Trigger test: create a grade → notification auto-created for student

Type: API test (4 test cases)
```

### Step 5.4: Notification UI + Real-Time
```
What: Bell icon with badge, dropdown panel, WebSocket push
Files: apps/web/src/components/common/NotificationPanel.tsx
       apps/web/src/hooks/useNotifications.ts
       apps/socketio/ (server setup)

Test E2E:
  1. Screenshot: bell icon showing "3" badge
  2. Screenshot: notification dropdown open with items
  3. Test: trigger notification server-side → appears in UI without refresh

Type: E2E screenshot (3 screenshots)
```

---

## Phase 6 — File Storage

### Step 6.1: File Upload/Download API
```
What: Multipart upload to MinIO/S3, file metadata, download
Files: apps/api/app/modules/files/ (router, service, schemas, storage.py)

Test API:
  POST   /api/v1/files/upload (multipart) → 201 {id, name, url, size}
  GET    /api/v1/files/:id → 200 (metadata)
  GET    /api/v1/files/:id/download → 302 (presigned URL)
  DELETE /api/v1/files/:id → 204
  POST   /api/v1/files/upload (10MB+ file) → 413 (size limit)
  POST   /api/v1/files/upload (.exe file) → 400 (type not allowed)

Type: API test (6 test cases)
```

### Step 6.2: File Upload Component
```
What: Drag-and-drop upload component, progress bar, preview
Files: apps/web/src/components/common/FileUpload.tsx

Test E2E:
  1. Screenshot: file upload zone (drag area + browse button)
  2. Screenshot: upload in progress (progress bar)
  3. Screenshot: uploaded file with preview (PDF icon / image thumbnail)

Type: E2E screenshot (3 screenshots)
```

---

## Phase 7 — Timetable (School)

### Step 7.1: Timetable Models + API
```
What: Session, Room, SessionException models + endpoints
Files: apps/api/app/db/models/session.py
       apps/api/app/modules/timetable/ (router, service, schemas)

Test API:
  POST /api/v1/rooms → 201 {name: "Salle 201", capacity: 30}
  POST /api/v1/sessions → 201 {group_id, subject_id, teacher_id, room_id, day, start, end}
  GET  /api/v1/sessions?group_id=X&week=2026-W10 → weekly schedule
  GET  /api/v1/sessions?teacher_id=X&week=2026-W10 → teacher schedule
  POST /api/v1/sessions/:id/exceptions → 201 (cancel/substitute)
  POST /api/v1/sessions (conflict: same room same time) → 409

Type: API test (6 test cases)
```

### Step 7.2: Timetable UI
```
What: Weekly grid view, per-class / per-teacher / per-student
Files: apps/web/src/features/timetable/pages/TimetablePage.tsx
       apps/web/src/features/timetable/components/WeekView.tsx
       apps/web/src/features/timetable/components/SessionCard.tsx

Test E2E:
  1. Screenshot: student timetable (Mon-Fri grid, color-coded subjects)
  2. Screenshot: teacher timetable (shows class names per slot)
  3. Screenshot: cancelled session shown with strikethrough + red indicator
  4. Screenshot: week navigation (previous/next arrows)

Type: E2E screenshot (4 screenshots)
```

---

## Phase 8 — Attendance (School)

### Step 8.1: Attendance API
```
What: AttendanceRecord model, bulk roll call endpoint
Files: apps/api/app/db/models/attendance.py
       apps/api/app/modules/attendance/ (router, service, schemas)

Test API:
  POST /api/v1/attendance/bulk → 201 (array of {student_id, status, late_minutes})
  GET  /api/v1/attendance?session_id=X → 200 (roll call for session)
  GET  /api/v1/attendance?student_id=X&term_id=Y → 200 (student's record)
  PATCH /api/v1/attendance/:id/justify → 200 (parent justifies)
  POST /api/v1/attendance/bulk (as student) → 403
  # Verify: creating absence triggers notification for parent

Type: API test (6 test cases)
```

### Step 8.2: Roll Call UI (Teacher)
```
What: Student list with P/A/R toggles, batch save
Files: apps/web/src/features/attendance/pages/RollCallPage.tsx
       apps/web/src/features/attendance/components/RollCallGrid.tsx

Test E2E:
  1. Screenshot: roll call page with student list (all present by default)
  2. Screenshot: mark 2 students absent, 1 late → summary updates
  3. Screenshot: save → success toast "Appel enregistré"

Type: E2E screenshot (3 screenshots)
```

### Step 8.3: Absence View (Parent)
```
What: Parent sees child's absences, can justify
Files: apps/web/src/features/attendance/components/AbsenceJustifyForm.tsx
       apps/web/src/features/school-life/pages/VieScolarirePage.tsx

Test E2E:
  1. Screenshot: absence list for child (date, session, status, justified?)
  2. Screenshot: justify form (reason dropdown, comment, file upload)
  3. Screenshot: justified absence now shows green check

Type: E2E screenshot (3 screenshots)
```

---

## Phase 9 — Gradebook (School)

### Step 9.1: Gradebook API
```
What: GradeCategory, Assessment, Grade models + endpoints + average calculator
Files: apps/api/app/db/models/grade.py
       apps/api/app/modules/gradebook/ (router, service, schemas, calculator.py)

Test API:
  POST /api/v1/assessments → 201 {title, subject_id, group_id, max_score, coefficient}
  POST /api/v1/grades/bulk → 201 (array of {assessment_id, student_id, score})
  GET  /api/v1/grades/me?term_id=X → 200 (student's grades, grouped by subject)
  GET  /api/v1/grades/averages?group_id=X&term_id=Y → 200 (class averages)
  PATCH /api/v1/assessments/:id/publish → 200 (makes grades visible)
  # Verify: averages recalculate correctly (weighted by coefficient)
  # Verify: publishing triggers notifications to students + parents
  # Verify: student can only see published grades

Type: API test (8 test cases)
```

### Step 9.2: Grade Entry UI (Teacher)
```
What: Assessment creation + grade grid entry
Files: apps/web/src/features/gradebook/pages/GradeEntryPage.tsx
       apps/web/src/features/gradebook/components/GradeGrid.tsx
       apps/web/src/features/gradebook/components/GradeStats.tsx

Test E2E:
  1. Screenshot: create assessment form (title, date, max score, coefficient)
  2. Screenshot: grade grid with student list + score inputs
  3. Screenshot: filled grid with stats at bottom (min, max, avg, distribution)
  4. Screenshot: publish → confirmation dialog

Type: E2E screenshot (4 screenshots)
```

### Step 9.3: Grade View UI (Student + Parent)
```
What: Student grades page, parent child-grades page
Files: apps/web/src/features/gradebook/pages/MyGradesPage.tsx
       apps/web/src/features/gradebook/pages/ChildGradesPage.tsx
       apps/web/src/features/gradebook/components/GradeCard.tsx
       apps/web/src/features/gradebook/components/AverageDisplay.tsx

Test E2E:
  1. Screenshot: student grades grouped by subject with averages + arrows
  2. Screenshot: general average at bottom
  3. Screenshot: parent view with child selector → same data

Type: E2E screenshot (3 screenshots)
```

---

## Phase 10 — Homework (Cahier de textes)

### Step 10.1: Homework API
```
What: SessionContent, Homework models + endpoints
Files: apps/api/app/db/models/homework.py
       apps/api/app/modules/homework/ (router, service, schemas)

Test API:
  POST /api/v1/session-content → 201 {session_id, content, attachments}
  POST /api/v1/homework → 201 {subject_id, group_id, title, due_date, allow_submission}
  GET  /api/v1/homework?group_id=X → 200 (list, sorted by due date)
  GET  /api/v1/homework/upcoming/me → 200 (student's upcoming homework)

Type: API test (4 test cases)
```

### Step 10.2: Cahier de Textes UI (Teacher + Student)
```
What: Teacher fills session content + assigns homework; student views
Files: apps/web/src/features/homework/pages/CahierDeTextesPage.tsx
       apps/web/src/features/homework/components/SessionContentForm.tsx
       apps/web/src/features/homework/components/HomeworkCard.tsx

Test E2E:
  1. Screenshot: teacher cahier entry form (content + homework + attachments)
  2. Screenshot: student homework view (upcoming, sorted by due date)
  3. Screenshot: homework card with due date + subject color

Type: E2E screenshot (3 screenshots)
```

### Step 10.3: Submission API + UI
```
What: Student submits homework, teacher reviews
Files: apps/api/app/modules/homework/ (submission endpoints)
       apps/web/src/features/homework/pages/SubmissionPage.tsx
       apps/web/src/features/homework/components/SubmissionForm.tsx
       apps/web/src/features/homework/components/SubmissionReview.tsx

Test API:
  POST /api/v1/submissions → 201 {homework_id, content, attachments}
  GET  /api/v1/submissions?homework_id=X → 200 (teacher sees all)
  PATCH /api/v1/submissions/:id → 200 (teacher grades + feedback)

Test E2E:
  1. Screenshot: student submission form (text + file upload)
  2. Screenshot: teacher reviewing submission with feedback form
  3. Screenshot: student sees returned submission with grade + feedback

Type: Both (3 API + 3 screenshots)
```

---

## Phase 11 — Tutoring Calendar + Booking

### Step 11.1: Tutor Profile + Availability API
```
What: TutorProfile, AvailabilityOverride models
Files: apps/api/app/db/models/tutoring.py
       apps/api/app/modules/tutoring/ (router, service, schemas)

Test API:
  PATCH /api/v1/tutors/me/profile → 200 {subjects, hourly_rate, bio}
  PATCH /api/v1/tutors/me/availability → 200 {weekly template}
  POST  /api/v1/availability-overrides → 201 {date, type: "unavailable"}
  GET   /api/v1/tutoring/availability?tutor_id=X&week=Y → 200 (free slots)

Type: API test (4 test cases)
```

### Step 11.2: Booking API
```
What: TutoringSession model, booking engine with conflict checks
Files: apps/api/app/modules/tutoring/booking_engine.py

Test API:
  POST /api/v1/tutoring/sessions → 201 (book on available slot)
  POST /api/v1/tutoring/sessions → 409 (slot already booked)
  POST /api/v1/tutoring/sessions → 409 (tutor marked unavailable)
  PATCH /api/v1/tutoring/sessions/:id → 200 (cancel with reason)
  PATCH /api/v1/tutoring/sessions/:id → 200 (reschedule to new slot)
  POST /api/v1/tutoring/sessions {recurrence: "weekly"} → 201 (creates series)
  # Verify: booking notification sent to tutor

Type: API test (7 test cases)
```

### Step 11.3: Tutor Calendar UI
```
What: Visual week calendar with booked/free/unavailable slots
Files: apps/web/src/features/tutoring/pages/TutorCalendarPage.tsx
       apps/web/src/features/tutoring/components/AvailabilityGrid.tsx

Test E2E:
  1. Screenshot: tutor calendar with color-coded slots (booked/free/off)
  2. Screenshot: click session → session detail panel
  3. Screenshot: availability settings modal

Type: E2E screenshot (3 screenshots)
```

### Step 11.4: Booking UI (Parent)
```
What: Select tutor + subject → see available slots → book
Files: apps/web/src/features/tutoring/pages/BookingPage.tsx
       apps/web/src/features/tutoring/components/BookingForm.tsx

Test E2E:
  1. Screenshot: booking form (student, tutor, subject selection)
  2. Screenshot: available slots grid for selected week
  3. Screenshot: booking confirmation screen

Type: E2E screenshot (3 screenshots)
```

---

## Phase 12 — Tutoring Session Management

### Step 12.1: Session Completion + Learning Plans API
```
What: Mark session complete, write notes, learning plan entries
Files: apps/api/app/db/models/learning_plan.py
       apps/api/app/modules/learning_plans/ (router, service, schemas)

Test API:
  PATCH /api/v1/tutoring/sessions/:id → 200 {status: "completed", notes: "..."}
  POST  /api/v1/learning-plans → 201 {student_id, subject_id, goals}
  POST  /api/v1/learning-plans/:id/entries → 201 {session_id, notes, progress_rating}
  GET   /api/v1/learning-plans?student_id=X → 200 (with entries)
  # Verify: hours deducted from package on completion

Type: API test (5 test cases)
```

### Step 12.2: Session Notes + Progress UI
```
What: Tutor completes session with notes; parent sees progress
Files: apps/web/src/features/tutoring/components/SessionNotes.tsx
       apps/web/src/features/tutoring/components/ProgressTimeline.tsx
       apps/web/src/features/tutoring/pages/LearningPlanPage.tsx

Test E2E:
  1. Screenshot: session completion form (notes, progress rating)
  2. Screenshot: learning plan with timeline of sessions + progress trend
  3. Screenshot: parent view of child's progress

Type: E2E screenshot (3 screenshots)
```

---

## Phase 13 — Packages + Billing

### Step 13.1: Packages API
```
What: Package definitions, student package purchase, hour deduction
Files: apps/api/app/db/models/package.py
       apps/api/app/modules/packages/ (router, service, schemas)

Test API:
  POST /api/v1/packages → 201 {name: "Pack 10h", type: "hours", price: 360}
  POST /api/v1/student-packages → 201 {package_id, student_id}
  GET  /api/v1/student-packages?student_id=X → 200 {hours_remaining}
  # Verify: completing session reduces hours_remaining
  # Verify: low balance alert at < 2 hours

Type: API test (5 test cases)
```

### Step 13.2: Billing API
```
What: Invoice generation, payment tracking
Files: apps/api/app/db/models/billing.py
       apps/api/app/modules/billing/ (router, service, schemas, stripe.py)

Test API:
  POST /api/v1/invoices → 201 {parent_id, items, total}
  GET  /api/v1/invoices?parent_id=X → 200 (list with status)
  POST /api/v1/invoices/:id/pay → 200 (Stripe checkout session URL)
  # Webhook: Stripe callback → invoice status "paid"

Type: API test (4 test cases)
```

### Step 13.3: Billing UI
```
What: Invoice list, payment flow, billing admin
Files: apps/web/src/features/billing/pages/InvoicesPage.tsx
       apps/web/src/features/billing/pages/BillingAdminPage.tsx
       apps/web/src/features/billing/components/InvoiceCard.tsx

Test E2E:
  1. Screenshot: parent invoice list (paid, pending, overdue)
  2. Screenshot: invoice detail with pay button
  3. Screenshot: admin billing overview with monthly summary

Type: E2E screenshot (3 screenshots)
```

---

## Phase 14 — QCM / Quizzes

### Step 14.1: Quiz API
```
What: Quiz builder, question types, auto-grading
Files: apps/api/app/db/models/quiz.py
       apps/api/app/modules/quizzes/ (router, service, schemas, grader.py)

Test API:
  POST /api/v1/quizzes → 201 {title, subject_id, time_limit}
  POST /api/v1/quizzes/:id/questions → 201 {type: "multiple_choice", ...}
  POST /api/v1/quizzes/:id/publish → 200
  POST /api/v1/quiz-attempts → 201 (student starts quiz)
  PATCH /api/v1/quiz-attempts/:id → 200 {answers: [...]} (submit)
  # Verify: auto-grading returns correct score immediately

Type: API test (6 test cases)
```

### Step 14.2: Quiz UI
```
What: Quiz builder (teacher) + quiz take (student) + results
Files: apps/web/src/features/quizzes/pages/QuizBuilderPage.tsx
       apps/web/src/features/quizzes/pages/QuizTakePage.tsx
       apps/web/src/features/quizzes/pages/QuizResultsPage.tsx

Test E2E:
  1. Screenshot: quiz builder with question types
  2. Screenshot: student taking quiz (timer, questions, answers)
  3. Screenshot: quiz results with score + corrections

Type: E2E screenshot (3 screenshots)
```

---

## Phase 15 — Report Cards + Enrollment

### Step 15.1: Report Card API + PDF
```
What: Auto-generate from grades, comments, PDF export
Files: apps/api/app/db/models/report_card.py
       apps/api/app/modules/report_cards/ (router, service, schemas, pdf_generator.py)

Test API:
  POST /api/v1/report-cards/generate?term_id=X&group_id=Y → 201 (batch create)
  GET  /api/v1/report-cards?student_id=X → 200 (with subject averages)
  PATCH /api/v1/report-cards/:id → 200 (add comments)
  POST /api/v1/report-cards/:id/publish → 200
  GET  /api/v1/report-cards/:id/pdf → 200 (PDF download)

Type: API test (5 test cases)
```

### Step 15.2: Enrollment API + UI
```
What: Dynamic enrollment forms, document upload, review workflow
Files: apps/api/app/modules/enrollment/ (router, service, schemas)
       apps/web/src/features/enrollment/ (pages + components)

Test API:
  POST /api/v1/enrollment-forms → 201 (admin creates form)
  POST /api/v1/enrollment-submissions → 201 (parent submits)
  PATCH /api/v1/enrollment-submissions/:id/review → 200 (admin accepts/rejects)

Test E2E:
  1. Screenshot: enrollment form (dynamic fields + document checklist)
  2. Screenshot: admin review queue with statuses

Type: Both
```

---

## Phase 16 — Hardening + Polish

### Step 16.1: Audit Log
```
What: Immutable audit trail for sensitive operations
Files: apps/api/app/db/models/audit.py
       apps/api/app/modules/audit/ (router, service)

Test API:
  # Verify: grade creation creates audit entry
  # Verify: attendance edit creates audit with before/after
  GET /api/v1/audit-logs?entity_type=grade → 200 (admin only)

Type: API test (3 test cases)
```

### Step 16.2: Search
```
What: Global search across users, groups, messages, files
Files: apps/api/app/modules/search/ (router, service)

Test API:
  GET /api/v1/search?q=dupont → 200 {users: [...], groups: [...], messages: [...]}
  # Verify: results scoped by role (student doesn't see admin data)

Type: API test (2 test cases)
```

### Step 16.3: Tenant Isolation Tests
```
What: Verify no cross-tenant data leakage across all modules
Files: apps/api/tests/test_tenant_isolation.py

Test API:
  # Create 2 tenants, create data in Tenant A
  POST /api/v1/users (Tenant A) → 201
  GET /api/v1/users (Tenant B) → 200 [] (empty — no leakage)
  # Repeat for grades, attendance, messages, files
  # Test RLS policy blocks direct SQL access cross-tenant
  # Test subdomain routing resolves correct tenant

Type: API test (6 test cases)
```

### Step 16.4: GDPR Compliance — Data Export & Purge
```
What: Right to access (export), right to deletion (purge), data retention auto-purge
Files: apps/api/app/modules/gdpr/router.py, service.py, schemas.py
       apps/api/app/jobs/data_retention_purge.py

Test API:
  POST /api/v1/admin/gdpr/export/{user_id} → 200 {download_url: "..."}
  # Verify: ZIP contains user's grades, attendance, messages, files metadata
  POST /api/v1/admin/gdpr/delete/{user_id} → 200
  # Verify: User hard-deleted, grades anonymized, audit log retained with anonymized user
  POST /api/v1/admin/gdpr/purge-check → 200 {users_to_purge: 3}
  # Verify: Users inactive > data_retention_years flagged

Type: API test (5 test cases)
```

### Step 16.5: DocuSeal E-Signature Integration
```
What: Connect enrollment forms to DocuSeal for parental e-signature
Files: apps/api/app/integrations/docuseal/client.py
       apps/api/app/modules/enrollment/esignature.py

Test API:
  POST /api/v1/enrollment/{id}/request-signature → 201 {signing_url: "..."}
  # Verify: DocuSeal template created, parent receives email with signing link
  POST /api/v1/webhooks/docuseal → 200
  # Verify: Enrollment status updated to "signed" on callback
  GET /api/v1/enrollment/{id} → 200 {status: "signed", signed_at: "..."}

Type: API test (3 test cases)
```

### Step 16.6: Competency Tracking (LSU/LSL)
```
What: Competency CRUD, evaluation entry, integration with report cards
Files: apps/api/app/modules/competencies/router.py, service.py, schemas.py
       apps/web/src/features/competencies/

Test API:
  GET /api/v1/competencies?cycle=cycle_3 → 200 [...pre-seeded competencies]
  POST /api/v1/competencies/evaluations → 201 {student_id, competency_id, level: "satisfactory"}
  GET /api/v1/students/{id}/competencies?term_id=... → 200 [evaluations by domain]
  GET /api/v1/report-cards/{id} → 200 {grades: [...], competencies: [...]}

E2E:
  screenshot: competency-evaluation-grid (teacher fills LSU grid)
  screenshot: report-card-with-competencies (student/parent view)

Type: Both (4 API tests + 2 E2E screenshots)
```

### Step 16.7: Seed Script + Demo Mode
```
What: Generate full demo data for testing and screenshots (includes branding, competencies, e-signatures)
Files: scripts/seed.py

Test: Run seed → all E2E tests pass with seeded data
Type: All E2E tests re-run
```

---

## Summary Table

| Phase | Steps | API Tests | E2E Screenshots | Estimated Days |
|-------|-------|-----------|-----------------|----------------|
| 0. Scaffold | 4 | 2 | 1 | 2 |
| 1. Auth | 4 | 10 | 6 | 3 |
| 2. RBAC + Users | 4 | 16 | 5 | 3 |
| 3. Structure | 6 | 19 | 3 | 3 |
| 4. UI Shell | 3 | 0 | 10 | 3 |
| 5. Messaging | 4 | 14 | 7 | 3 |
| 6. Files | 2 | 6 | 3 | 2 |
| 7. Timetable | 2 | 6 | 4 | 3 |
| 8. Attendance | 3 | 6 | 6 | 3 |
| 9. Gradebook | 3 | 8 | 7 | 4 |
| 10. Homework | 3 | 7 | 6 | 3 |
| 11. Tutoring Booking | 4 | 11 | 6 | 4 |
| 12. Session Mgmt | 2 | 5 | 3 | 2 |
| 13. Packages + Billing | 3 | 9 | 3 | 3 |
| 14. Quizzes | 2 | 6 | 3 | 3 |
| 15. Reports + Enrollment | 2 | 8 | 2 | 3 |
| 16. Hardening | 7 | 23 | 2 | 4 |
| **TOTAL** | **58 steps** | **156 tests** | **77 screenshots** | **~53 days** |

---

## How AI Tests Each Step

### API Testing (automated, no human needed)
```bash
# Run after each backend step
cd apps/api && pytest tests/ -v --tb=short
# CI runs automatically on every push
```

### E2E Screenshot Testing (AI-verifiable)
```bash
# Run Playwright tests that capture screenshots
cd e2e && npx playwright test --project=chromium
# Screenshots saved to e2e/screenshots/
# AI agent (browser tool) or human reviews screenshots
```

### Validation Checklist Per Step
Before marking any step "done":
1. All API tests pass (pytest exit code 0)
2. All E2E screenshots captured and visually correct
3. No TypeScript errors (`tsc --noEmit`)
4. No Python lint errors (`ruff check`)
5. Docker Compose stack starts clean
6. No console errors in browser dev tools
