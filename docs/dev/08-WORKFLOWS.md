# 08 — User Workflows (Audit)

Precise status of every workflow. Based on actual code review, not assumptions.

**Status definitions:**
- **WORKS** = Backend API + Frontend UI + data flows end-to-end. A real user could do this today.
- **WIRED** = Frontend calls real API, but needs seed data or setup to test (no mock data, just empty state).
- **MOCK** = Frontend page exists but uses hardcoded/mock data instead of API calls.
- **CODE EXISTS** = Backend API exists, Frontend page exists, but they're not connected (page doesn't call the API, or API isn't imported).
- **NO CODE** = No implementation at all.

---

## Edulia — School Admin Workflows

### 1. School Admin

| # | Workflow | Backend | Frontend | Data | Status | Detail |
|---|---------|---------|----------|------|--------|--------|
| 1.1 | Create tenant | API: POST /tenants (via CLI) | No onboarding UI | Seed script | WORKS (CLI only) | `scripts/create_tenant.py` creates tenant + admin. No web signup wizard. |
| 1.2 | Invite user | API: POST /users (with invite) | UsersPage: invite form | Real | WORKS | Creates user, sends invite token. AcceptInvitePage wired. |
| 1.3 | CSV import users | API: POST /users (bulk) | UsersPage: CSV upload | Real | WORKS | Parses CSV, creates users with roles. |
| 1.4 | Manage classes | API: full CRUD /groups | ClassesPage: list, create, add members | Real | WORKS | Groups = classes. Members added/removed. |
| 1.5 | Manage subjects | API: full CRUD /subjects | SubjectsPage: list, create, edit, delete | Real | WORKS | |
| 1.6 | Academic years + terms | API: full CRUD /academic-years + terms | AcademicYearPage: create year, add terms | Real | WORKS | |
| 1.7 | Tenant settings | API: GET/PATCH /tenant + /tenant/settings | TenantSettingsPage: module toggles | Real | WIRED | Settings page loads from API but UI shows basic form. Module toggle works (enables/disables sidebar items). |
| 1.8 | Dashboard | No API | AdminDashboard component | **MOCK** | MOCK | `MOCK_STATS` and `MOCK_ACTIVITY` hardcoded. Shows fake numbers (28 teachers, 342 students). No real data. |
| 1.9 | Timetable | API: full CRUD /timetable/sessions + rooms | TimetablePage: weekly grid, create session | Real | WIRED | API and UI connected. You can create rooms, sessions with day/time/teacher/subject. Missing: conflict detection, recurring patterns. |
| 1.10 | Attendance | API: GET + POST bulk /attendance | AttendancePage: select group → mark students | Real | WIRED | Fetches real groups/students, saves attendance records. Needs timetable sessions to be meaningful. |
| 1.11 | Gradebook | API: categories + assessments + grades | GradebookPage + GradeEntryPage | Real | WIRED | Full grade workflow: create category → create assessment → enter grades per student. Student averages endpoint works. |
| 1.12 | Homework | API: CRUD + submit | HomeworkPage + SubmissionPage | Real | WIRED | Create homework, students submit (text + file), teacher views submissions. `subject_id` field has a placeholder comment. |
| 1.13 | Messaging | API: threads + messages + read | MessagesPage: inbox, compose, thread view | Real | WIRED | `createThread` calls API. Thread list and detail partially wired. |
| 1.14 | Documents | API: upload/download/list + categories | DocumentsPage: file grid with upload | Real | WIRED | Upload to MinIO, list files, download. Categories endpoint exists. |
| 1.15 | Forms | API: full CRUD + responses + stats | 4 pages: list, builder, fill, results | Real | WIRED | Create form with fields, fill it, view responses + stats. Fully wired. |
| 1.16 | Wallet | API: balance + topup + debit + services | WalletPage + ServicesPage | Real | WIRED | Virtual wallet with transactions. Services with subscriptions. No real payment gateway. |
| 1.17 | Community/Directory | API: directory + delegates | DirectoryPage: searchable user list | Real | WIRED | Lists all users in tenant, filterable. Delegates endpoint exists. |
| 1.18 | Report cards (PDF) | **NO API** | **NO UI** | - | NO CODE | No PDF generation, no report card template, no teacher comment system. |
| 1.19 | Calendar | **NO API** | **NO UI** | - | NO CODE | No school calendar (holidays, exam periods, events). |
| 1.20 | Analytics | **NO API** | **NO UI** | - | NO CODE | No performance trends, attendance stats, class comparison. |

### 2. Teacher

| # | Workflow | Status | Detail |
|---|---------|--------|--------|
| 2.1 | View my schedule | WIRED | Same TimetablePage, filtered by teacher (if sessions have teacher_id). |
| 2.2 | Take attendance | WIRED | AttendancePage works, needs sessions to exist first. |
| 2.3 | Enter grades | WIRED | GradeEntryPage: select assessment → enter grades per student. |
| 2.4 | Assign homework | WIRED | HomeworkPage: create with title, description, deadline, group. |
| 2.5 | Review submissions | WIRED | SubmissionPage: view student submissions. No grading UI on submission. |
| 2.6 | Message parents | WIRED | ComposeMessage component calls createThread API. |
| 2.7 | View class list | WORKS | Groups page shows members. |
| 2.8 | Dashboard | MOCK | TeacherDashboard = hardcoded. Shows "Prochains cours" with fake data. |
| 2.9 | Write report comments | NO CODE | No comment system for end-of-term reports. |
| 2.10 | Generate report cards | NO CODE | No PDF generation. |

### 3. Student

| # | Workflow | Status | Detail |
|---|---------|--------|--------|
| 3.1 | View schedule | WIRED | TimetablePage shows weekly grid (if sessions exist for student's group). |
| 3.2 | Check grades | WIRED | StudentGradesPage: calls `/students/{id}/averages` API. |
| 3.3 | View homework | WIRED | HomeworkPage filtered by group. |
| 3.4 | Submit homework | WIRED | SubmissionPage: text + file upload. |
| 3.5 | Read messages | WIRED | MessagesPage: thread list + detail. |
| 3.6 | View attendance | WIRED | AttendancePage filtered by student (API supports it). |
| 3.7 | Dashboard | MOCK | StudentDashboard = hardcoded mock data. |

### 4. Parent

| # | Workflow | Status | Detail |
|---|---------|--------|--------|
| 4.1 | Accept invitation | WORKS | AcceptInvitePage exists, sets password. |
| 4.2 | View child's schedule | WIRED | TimetablePage (needs child's group filter — may need work). |
| 4.3 | View child's grades | WIRED | StudentGradesPage (needs to resolve child relationship). |
| 4.4 | Check attendance | WIRED | AttendancePage (same — needs child filter). |
| 4.5 | Message teacher | WIRED | ComposeMessage works. |
| 4.6 | View report cards | NO CODE | Report cards not built. |
| 4.7 | Fill forms | WIRED | FormFillPage works. |
| 4.8 | Pay fees | WIRED (no gateway) | WalletPage shows balance. No Stripe/PayPal. |
| 4.9 | Dashboard | MOCK | ParentDashboard: `MOCK_CHILDREN` hardcoded. |

### 5. Tutor

| # | Workflow | Status | Detail |
|---|---------|--------|--------|
| 5.1 | Create workspace | WIRED | Workspace type "tutoring" exists in tenant settings. No signup wizard. |
| 5.2-5.6 | Same as teacher | Same statuses | Tutor role maps to teacher dashboard. |
| 5.7 | Progress tracking | NO CODE | No tutor-specific student progress view. |
| 5.8 | Recurring sessions | NO CODE | No recurrence rules on timetable sessions. |

---

## EduliaHub — Learner Workflows

### 6. Learner (self-directed)

| # | Workflow | Backend | Frontend | Status | Detail |
|---|---------|---------|----------|--------|--------|
| 6.1 | Browse courses | **NO API** | CatalogPage: placeholder | NO CODE | No course table, no API, no data. |
| 6.2 | Explore platforms | **NO API** | PlatformsPage: **hardcoded** 15 platforms | MOCK | Data is in the React component, not from DB. |
| 6.3 | Course detail | **NO API** | CourseDetailPage: placeholder | NO CODE | |
| 6.4 | Self-signup | **NO API** | SignupPage: placeholder form | NO CODE | No self-registration endpoint in auth module. |
| 6.5 | Login | Shares Edulia auth | LoginPage: placeholder form | CODE EXISTS | Backend login API exists, but Hub login page isn't wired to it. |
| 6.6 | Upload certificate | **NO API** | **NO UI** | NO CODE | No certificate table, no upload endpoint. |
| 6.7 | Portfolio | **NO API** | PortfolioPage: placeholder | NO CODE | |
| 6.8 | Write review | **NO API** | **NO UI** | NO CODE | |
| 6.9 | Browse curriculum | **NO API** | CurriculumPage: placeholder | NO CODE | |
| 6.10 | Dashboard | **NO API** | DashboardPage: placeholder | NO CODE | |

### 7. Company Admin

| # | Workflow | Status | Detail |
|---|---------|--------|--------|
| 7.1 | Create enterprise workspace | WIRED | Workspace type "enterprise" exists. Same as school but different module defaults. |
| 7.2 | Import employees | WORKS | Same CSV import as school. |
| 7.3 | Assign courses | NO CODE | No course assignment system. Depends on EduliaHub catalog. |
| 7.4 | Track completion | NO CODE | |
| 7.5 | Manage certificates | NO CODE | |
| 7.6 | Schedule training | WIRED | Same timetable as school. |
| 7.7 | Reports | NO CODE | |

### 8. Employee

| # | Workflow | Status | Detail |
|---|---------|--------|--------|
| 8.1-8.4 | All workflows | NO CODE | Depends entirely on EduliaHub + course assignment system. |

---

## Summary

### What ACTUALLY works today (a real user could use it):

1. Admin creates tenant (CLI)
2. Admin invites users (email + role)
3. Admin imports users via CSV
4. Admin creates classes, subjects, academic years/terms
5. Users accept invitations
6. Users send/read messages
7. Admin toggles modules on/off

**That's 7 workflows out of ~68.**

### What's WIRED (code exists on both sides, needs data to be useful):

8. Timetable: create rooms, sessions (no conflicts)
9. Attendance: mark present/absent
10. Gradebook: create assessments, enter grades, view averages
11. Homework: create, submit
12. Documents: upload, download, list
13. Forms: build, fill, view results
14. Wallet: topup, debit, services
15. Directory: search users

**That's 8 more workflows — they work but show empty screens without seed data.**

### What's MOCK (UI shows fake data):

16. Admin dashboard (fake stats)
17. Teacher dashboard (fake schedule)
18. Student dashboard (fake grades)
19. Parent dashboard (fake children)
20. Platform directory (hardcoded list)

**5 dashboards showing lies.**

### What has NO CODE at all:

- Report cards / PDF generation
- School calendar
- Analytics / trends
- Self-signup (EduliaHub)
- Course catalog (DB + API)
- Certificate upload
- Portfolio
- Reviews
- Curriculum browser
- Course assignment (enterprise)
- Recurring sessions (tutoring)
- Student progress view (tutoring)
- Payment gateway integration

---

## What this means

**Edulia (school admin)** has solid foundations: user management, RBAC, tenant isolation, all the CRUD for academic structure. The academic modules (timetable, grades, attendance, homework) have working APIs AND UI — they just need a seed script to populate a demo school so they don't show empty screens.

**The dashboards are the biggest lie** — they show hardcoded numbers instead of aggregating real data. Fix: replace MOCK_STATS with API calls to `/attendance/stats`, `/gradebook/stats`, etc. (these stat endpoints need to be built).

**EduliaHub** is a landing page + one hardcoded page. Zero backend. Everything needs building from scratch: auth, course tables, APIs, frontend wiring.

**Report cards** are the biggest functional gap in Edulia — it's the feature parents actually check every term.
