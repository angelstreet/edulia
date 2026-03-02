# Scope 2 Prompts — Core Structure + Dashboard

Launch these 2 terminals in parallel AFTER scope 1 is verified.

---

## Terminal 1 — Backend structure + messaging + files APIs

```
You are building the structure, messaging, and file APIs for Edulia, a multi-tenant education platform. The repo is at https://github.com/angelstreet/edulia — pull latest from main first. Scope 0 (scaffold) and scope 1 (auth + RBAC + users) are already done.

Read these reference docs FIRST:
- /home/jndoye/shared/projects/edulia/08-BUILD-PHASES.md — Phase 3 (Steps 3.1–3.5), Phase 5 (Steps 5.1+5.3), Phase 6 (Step 6.1)
- /home/jndoye/shared/projects/edulia/01-CORE-SHELL.md — Sections 1.7 (Group), 1.8 (Subject), 1.3 (AcademicYear/Term), 1.9+ (Message, Notification, File)
- /home/jndoye/shared/projects/edulia/06-FILE-STRUCTURE.md — Backend modules section

Build these in order:

1. Phase 3 Step 3.1 — Tenant settings API:
   Create apps/api/app/modules/tenant/ (router.py, service.py, schemas.py)
   Endpoints:
     GET   /api/v1/tenant → tenant info
     PATCH /api/v1/tenant → update tenant (admin only)
     GET   /api/v1/tenant/settings → tenant settings (enabled_modules, grading_scale, etc.)
     PATCH /api/v1/tenant/settings → update settings (admin only)

2. Phase 3 Step 3.2 — Academic Year + Term API:
   Create apps/api/app/modules/academic_years/ (router.py, service.py, schemas.py)
   Note: AcademicYear and Term models should already exist from scope 1. If not, create them now.
   Endpoints:
     POST /api/v1/academic-years → create year
     GET  /api/v1/academic-years → list years with terms
     POST /api/v1/academic-years/:id/terms → create term
     PATCH /api/v1/academic-years/:id → update
     DELETE /api/v1/academic-years/:id → delete

3. Phase 3 Step 3.3 — Subject CRUD API:
   Create apps/api/app/db/models/subject.py (Subject model: id, tenant_id, code, name, color, coefficient)
   Create apps/api/app/modules/subjects/ (router.py, service.py, schemas.py)
   Endpoints:
     POST   /api/v1/subjects → create
     GET    /api/v1/subjects → list
     PATCH  /api/v1/subjects/:id → update
     DELETE /api/v1/subjects/:id → delete

4. Phase 3 Step 3.4 — Group + Membership API:
   Create apps/api/app/db/models/group.py (Group, GroupMembership models per CORE §1.7)
   Create apps/api/app/modules/groups/ (router.py, service.py, schemas.py)
   Endpoints:
     POST   /api/v1/groups → create group (type: class/section/cohort)
     GET    /api/v1/groups → list with member count
     GET    /api/v1/groups/:id → detail with member list
     PATCH  /api/v1/groups/:id → update
     DELETE /api/v1/groups/:id → delete
     POST   /api/v1/groups/:id/members → add member
     DELETE /api/v1/groups/:id/members/:uid → remove member

5. Phase 5 Step 5.1 — Messaging API:
   Create apps/api/app/db/models/message.py (Thread, ThreadParticipant, Message models per CORE)
   Create apps/api/app/modules/messaging/ (router.py, service.py, schemas.py)
   Endpoints:
     POST  /api/v1/threads → create thread (type: direct/group, participants, subject, body)
     GET   /api/v1/threads → list threads (ordered by last message, only where user is participant)
     GET   /api/v1/threads/:id → thread with messages
     POST  /api/v1/threads/:id/messages → reply
     PATCH /api/v1/threads/:id/read → mark read
   Tenant isolation: user in tenant A cannot see threads from tenant B.

6. Phase 5 Step 5.3 — Notification API:
   Create apps/api/app/db/models/notification.py (Notification model)
   Create apps/api/app/modules/notifications/ (router.py, service.py, schemas.py, engine.py)
   engine.py: create_notification(user_id, type, title, body, link) — also publishes to Redis for Socket.IO
   Endpoints:
     GET   /api/v1/notifications → list (unread first)
     PATCH /api/v1/notifications/:id/read → mark one read
     POST  /api/v1/notifications/read-all → mark all read

7. Phase 6 Step 6.1 — File upload/download API:
   Create apps/api/app/db/models/file.py (File model: id, tenant_id, name, mime_type, size, s3_key, uploaded_by)
   Create apps/api/app/modules/files/ (router.py, service.py, schemas.py, storage.py)
   storage.py: MinIO/S3 client wrapper (upload, download presigned URL, delete)
   Create apps/api/app/integrations/clamav/scanner.py: connect to ClamAV on 127.0.0.1:3310, scan file before storing
   Endpoints:
     POST   /api/v1/files/upload (multipart) → virus scan → store in MinIO → 201 {id, name, url, size}
     GET    /api/v1/files/:id → metadata
     GET    /api/v1/files/:id/download → 302 presigned URL
     DELETE /api/v1/files/:id → delete from MinIO + DB
   Validations: max 50MB, blocked extensions (.exe, .bat, .sh, .cmd)

8. Create apps/api/app/integrations/email/sender.py:
   Brevo (ex-Sendinblue) transactional email via SMTP. Load SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD from config.
   Functions: send_email(to, subject, html_body), send_template_email(to, template_name, context)

9. Generate alembic migration for all new models. Run alembic upgrade head.

10. Write pytest tests in apps/api/app/tests/:
   - test_tenant.py: get tenant, update tenant, get/update settings (4 tests)
   - test_academic_years.py: create year, create term, list with terms (3 tests)
   - test_subjects.py: CRUD (4 tests)
   - test_groups.py: create group, list, add member, remove member, detail with members (5 tests)
   - test_messaging.py: create thread, list threads, reply, mark read, tenant isolation empty, cross-tenant blocked (7 tests)
   - test_notifications.py: list, mark read, mark all read, auto-create on event (4 tests)
   - test_files.py: upload success, download presigned, delete, size limit 413, blocked extension 400 (5 tests — mock ClamAV for tests)
   - Update conftest.py with fixtures for subjects, groups, threads, files

Run: alembic upgrade head && pytest -v. ALL 32+ tests must pass.

After completing each major step, update /home/jndoye/shared/projects/edulia/CODE-PROGRESS.md: change S2.1 status from "Not started" to "In progress", then to "Done" when all tests pass.

Commit and push to main when everything passes. Do NOT modify frontend or shared types files.
```

---

## Terminal 2 — Frontend structure + dashboard + messaging UI

```
You are building the admin pages, dashboard, messaging, and file upload UI for Edulia, a multi-tenant education platform. The repo is at https://github.com/angelstreet/edulia — pull latest from main first. Scope 0 (scaffold) and scope 1 (auth + login + admin users) are already done.

Read these reference docs FIRST:
- /home/jndoye/shared/projects/edulia/08-BUILD-PHASES.md — Phase 3 Step 3.6, Phase 4 Step 4.3, Phase 5 Steps 5.2+5.4, Phase 6 Step 6.2
- /home/jndoye/shared/projects/edulia/06-FILE-STRUCTURE.md — Frontend section (features, components, hooks, api)
- /home/jndoye/shared/projects/edulia/01-CORE-SHELL.md — for entity shapes (Group, Subject, Message, Notification, File)

Build these in order:

1. Create API client files in apps/web/src/api/:
   - groups.ts: getGroups, getGroup, createGroup, updateGroup, deleteGroup, addMember, removeMember
   - sessions.ts: getSessions (placeholder for timetable scope)
   - messages.ts: getThreads, getThread, createThread, replyToThread, markRead
   - notifications.ts: getNotifications, markRead, markAllRead
   - files.ts: uploadFile, getFile, downloadFile, deleteFile
   - tenant.ts: getTenant, updateTenant, getSettings, updateSettings
   - subjects.ts: getSubjects, createSubject, updateSubject, deleteSubject

2. Create hooks in apps/web/src/hooks/:
   - useModule.ts: checks if a module is enabled in tenant settings
   - useMessages.ts: wraps messages API with React Query or SWR
   - usePagination.ts: generic pagination state (page, pageSize, total, setPage)
   - useTenantBranding.ts: applies tenant branding as CSS custom properties

3. Phase 3 Step 3.6 — Admin structure pages in apps/web/src/features/admin/:
   - pages/ClassesPage.tsx: group list displayed as a tree view (level → classes under it). Add/edit/delete group. Click group → show members, add/remove members.
   - pages/SubjectsPage.tsx: list of subjects with color chip, code, name. Add/edit/delete subject modal.
   - pages/AcademicYearPage.tsx: current year with terms displayed as a timeline or table. Create/edit year and terms.
   - pages/TenantSettingsPage.tsx: toggle modules on/off, set grading scale, attendance mode, timezone, locale. Save button.

4. Phase 4 Step 4.3 — Role-based DashboardPage in apps/web/src/features/dashboard/:
   - pages/DashboardPage.tsx: renders different dashboard component based on user role
   - components/TeacherDashboard.tsx: widgets — TodaySchedule (placeholder data), UnreadMessages count, quick action buttons (Take attendance, Enter grades)
   - components/StudentDashboard.tsx: widgets — TodaySchedule, HomeworkDue (list), RecentGrades (last 5)
   - components/ParentDashboard.tsx: widgets — ChildSelector dropdown, AlertsWidget (absences, low grades), RecentGrades for selected child
   - components/AdminDashboard.tsx: widgets — stats cards (total users, active students, teachers), recent activity feed
   - components/widgets/TodaySchedule.tsx, RecentGrades.tsx, HomeworkDue.tsx, UnreadMessages.tsx, AlertsWidget.tsx
   All widgets show placeholder/mock data for now — real data comes when backend APIs for those modules exist.

5. Phase 5 Step 5.2 — Messaging UI in apps/web/src/features/messaging/:
   - pages/MessagesPage.tsx: split view — thread list on left, thread view on right (or full screen on mobile)
   - components/ThreadList.tsx: list of threads with last message preview, unread indicator (bold), timestamp, participant avatars
   - components/ThreadView.tsx: message bubbles (sent = right/blue, received = left/gray), scroll to bottom, reply input at bottom
   - components/ComposeMessage.tsx: modal — recipient search (autocomplete from users API), subject, body (rich text or plain), send button
   - components/MessageBubble.tsx: single message with avatar, name, time, content

6. Phase 5 Step 5.4 — Notifications in apps/web/src/components/common/:
   - NotificationPanel.tsx: bell icon in Topbar with unread count badge. Click → dropdown panel with notification list. Each item: icon, title, time, click → navigate to link. "Mark all read" button at top.
   - Update Topbar.tsx to include NotificationPanel
   - hooks/useNotifications.ts: fetch notifications on mount, poll every 30s (or use Socket.IO if connected). Expose unreadCount, notifications, markRead, markAllRead.
   - Connect to Socket.IO: on "notification:new" event, prepend to notification list and increment badge.

7. Phase 6 Step 6.2 — FileUpload component in apps/web/src/components/common/:
   - FileUpload.tsx: drag-and-drop zone + browse button. Shows upload progress bar during upload. After upload: file name, size, preview (image thumbnail or PDF/doc icon). Delete button to remove. Props: onUpload(file), accept (mime types), maxSize.
   - FilePreview.tsx: given a file object, show appropriate preview (image → thumbnail, PDF → PDF icon, other → generic file icon + name)

8. Update the router in apps/web/src/app/router.tsx to add all new routes:
   - /admin/classes → ClassesPage (RoleGuard: admin)
   - /admin/subjects → SubjectsPage (RoleGuard: admin)
   - /admin/academic-year → AcademicYearPage (RoleGuard: admin)
   - /admin/settings → TenantSettingsPage (RoleGuard: admin)
   - /messages → MessagesPage (AuthGuard)
   Update Sidebar.tsx to include links to new pages per role.

9. Create any missing UI components in apps/web/src/components/ui/ that you need:
   - Tabs.tsx, SearchBar.tsx, RichTextEditor.tsx (simple textarea wrapper for now), ChildSelector.tsx

Test: Admin can manage classes, subjects, academic years, tenant settings. Dashboard shows role-appropriate widgets. Messaging: create thread, view thread, reply, see unread indicator. Notification bell shows count, dropdown lists notifications. File upload with drag-drop works. Mobile layout is responsive.

After completing each major step, update /home/jndoye/shared/projects/edulia/CODE-PROGRESS.md: change S2.2 status from "Not started" to "In progress", then to "Done" when everything works.

Commit and push to main when everything works. Do NOT modify backend or shared types files.
```

---

## After Scope 2 — Deploy to VM 120

Once both terminals are done and scope 2 is verified, run these deploy commands:

```
Deploy Edulia to VM 120 (edulia-app). The infrastructure is already set up (scope 0 infra).

1. Pull latest code:
   ssh edulia-app "cd /opt/edulia/backend && git pull origin main"

2. Install backend dependencies:
   ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && pip install -r apps/api/requirements.txt"

3. Run DB migrations (task 14):
   ssh edulia-app "cd /opt/edulia/backend/apps/api && source ../../.venv/bin/activate && alembic upgrade head"
   Test: python3 -c "from app.db.database import engine; from sqlalchemy import inspect; print(f'{len(inspect(engine).get_table_names())} tables')"

4. Build frontend (task 15):
   ssh edulia-app "cd /opt/edulia/backend/apps/web && npm ci && npm run build"
   Test: ls /opt/edulia/backend/apps/web/dist/index.html

5. Install Socket.IO deps:
   ssh edulia-app "cd /opt/edulia/backend/apps/socketio && npm ci"

6. Start PM2 services (task 16) — all 5 processes:
   ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && pm2 start 'cd apps/api && gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120' --name edulia-api"
   ssh edulia-app "cd /opt/edulia/backend && pm2 start 'cd apps/socketio && node src/index.js' --name edulia-socketio"
   ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && pm2 start 'cd apps/api && celery -A worker.worker worker -l warning -c 4 -Q default,notifications,pdf,email --max-tasks-per-child=100' --name edulia-worker"
   ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && pm2 start 'cd apps/api && celery -A worker.worker beat -l warning --schedule /opt/edulia/backend/celerybeat-schedule' --name edulia-beat"
   ssh edulia-app "pm2 serve /opt/edulia/backend/apps/web/dist 3000 --name edulia-frontend --spa"
   ssh edulia-app "pm2 save && pm2 startup systemd"
   Test: pm2 list → 5 processes online
   Test: curl http://127.0.0.1:8000/api/health → {"status": "healthy"}

7. Seed initial data (task 17):
   ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && python3 scripts/create_tenant.py --name 'Mon École' --slug mon-ecole --type school --admin-email admin@edulia.angelstreet.io --admin-password CHANGE_ME"

8. Update /home/jndoye/shared/projects/edulia/INSTALLATION-PROGRESS.md: mark tasks 14–17 as Done.
9. Update /home/jndoye/shared/projects/edulia/CODE-PROGRESS.md: mark D1–D5 as Done.

10. Run post-install checks:
   curl -s https://edulia.angelstreet.io/api/health → {"status": "healthy"}
   curl -sI https://edulia.angelstreet.io/ → HTTP/2 200

If all pass, mark task 21 and D6 as Done.
```
