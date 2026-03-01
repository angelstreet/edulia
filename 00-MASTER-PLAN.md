# 00 — Master Plan

## Project: EduCore — Open-Source Unified Education Platform

**Date:** 2026-03-01
**License:** Open Source (MIT or AGPL — TBD)
**Approach:** AI-assisted build, progressive scope expansion

---

## Vision

A modern, open-source alternative to École Directe / Pronote (school) and tutoring management platforms, built on a shared core ("shell") that extends to enterprise training later.

---

## Three Scopes (Progressive)

| Scope | Target | Reference | Priority |
|-------|--------|-----------|----------|
| **S1 — Core Shell** | Shared foundation | — | 🔴 Must-have first |
| **S2 — School (K-12)** | École Directe parity | ecoledirecte.com | 🔴 MVP |
| **S3 — Tutoring** | Tutor/tutee management | Custom | 🔴 MVP |
| **S4 — Enterprise** | Corporate training + AI authoring | 360Learning | 🟡 Later |

---

## S1 — Core Shell (Week 1-2)

The foundation everything else builds on.

### What it includes
- **Identity & Auth** — Users, roles, login, RBAC, permissions
- **Org & Structure** — Tenants, campuses/branches, academic years/terms
- **People & Relationships** — Students, staff, guardians, managers + links
- **Groups** — Classes, cohorts, sections, teams + memberships
- **Messaging** — Threads, announcements, notifications (in-app + email)
- **File Storage** — Upload, cloud storage, document management
- **UI Shell** — Layout, navigation, role-based dashboards, settings
- **Plugin System** — Module registration, feature flags per workspace

### Key decisions
- Single codebase, workspace = configuration (not separate code)
- React + Vite + TypeScript frontend
- Python FastAPI backend
- PostgreSQL database
- Redis for cache/queue
- Docker for deployment (local + SaaS)
- S3-compatible file storage (MinIO local, S3 SaaS)

---

## S2 — School Workspace (Week 2-4)

Feature parity with École Directe.

### Modules
1. **Timetable** — Weekly/monthly/annual views, room booking, substitutions
2. **Attendance** — Roll call (present/absent/late), reasons, justifications, parent alerts
3. **Gradebook** — Notes entry, coefficients, averages (per subject/period/annual), competencies
4. **Report Cards** — Periodic reports, teacher comments, PDF/CSV export
5. **Homework Diary (Cahier de textes)** — Session content, homework, due dates, file attachments
6. **Assignments & Submissions** — Online homework submission, teacher correction per student
7. **QCM / Quizzes** — Quiz builder, question bank, shared library, auto-grading
8. **School Life (Vie scolaire)** — Absences, tardiness, sanctions, incidents, discipline tracking
9. **Enrollment / Registration** — Online inscription, re-inscription, document upload, e-signature
10. **Billing & Payments** — Invoices, online payment, receipts, dunning
11. **Parent Portal** — Per-child view, grades, attendance, messaging, documents, payment
12. **Student Portal** — Grades, timetable, homework, submissions, messaging
13. **Teacher Portal** — Classes, gradebook, attendance, cahier de textes, QCM, messaging
14. **Admin Portal** — Users, structure, settings, reports, enrollment, billing
15. **Cloud / Document Storage** — Personal cloud, shared spaces, teacher lockers
16. **Collaborative Workspaces (ENT)** — Shared spaces for projects, group work
17. **Announcements & News** — School-wide or targeted announcements
18. **Calendar** — School calendar, events, holidays, exam periods

### Roles for School
| Role | Access |
|------|--------|
| Admin | Everything |
| Teacher | Own classes, gradebook, attendance, cahier de textes, messaging |
| Student | Own grades, timetable, homework, submissions, messaging |
| Parent/Guardian | Children's data, messaging with teachers, payments, documents |
| Vie scolaire staff | Attendance, incidents, sanctions, absences management |
| Accountant/Bursar | Billing, payments, invoices |

---

## S3 — Tutoring Workspace (Week 4-5)

Simpler than school — focuses on 1:1 or small group tutoring.

### Modules
1. **Tutor Calendar** — Availability, booking slots, recurring sessions
2. **Booking & Scheduling** — Book, reschedule, cancel sessions
3. **Attendance** — Session attendance (simplified)
4. **Learning Plans** — Per-student plans, tutor notes, goals
5. **Assignments** — Homework, exercises, document sharing
6. **Lightweight Assessments** — Simple quizzes, progress notes
7. **Packages & Subscriptions** — Hour packages, monthly plans, credits
8. **Invoicing & Payments** — Auto-invoicing, payment tracking, reminders
9. **Parent View** — Progress summaries, session history, payments
10. **Tutor Dashboard** — Today's sessions, students, earnings
11. **Student Dashboard** — Upcoming sessions, homework, progress

### Roles for Tutoring
| Role | Access |
|------|--------|
| Center Admin | Everything |
| Tutor | Own students, calendar, materials, earnings |
| Student/Tutee | Own sessions, homework, progress |
| Parent | Child's progress, payments, booking |

---

## S4 — Enterprise Workspace (Future)

Not in scope for initial build. See `04-ENTERPRISE-SCOPE.md` when ready.

---

## Tech Stack Summary

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite + TypeScript |
| API | Python FastAPI |
| DB | PostgreSQL |
| Cache/Queue | Redis |
| Workers | Celery |
| Files | S3-compatible (MinIO local) |
| Auth | JWT + OIDC (Entra ID later) |
| Deploy | Docker / Docker Compose |

---

## Build Strategy

1. **AI-assisted development** — Use Claude/AI to generate code fast
2. **File-per-file delivery** — Small, testable increments
3. **Core first** — Shell must work before any workspace module
4. **Feature flags** — Modules enabled/disabled per workspace config
5. **Open source from day 1** — Public repo

---

## Document Index

| # | Document | Content |
|---|----------|---------|
| 00 | Master Plan (this) | Roadmap, scopes, strategy |
| 01 | Core Shell | Data model, auth, RBAC, API, UI shell |
| 02 | School Scope | École Directe parity — every feature |
| 03 | Tutoring Scope | Tutor/tutee — every feature |
| 04 | Enterprise Scope | Future reference |
| 05 | UI/UX Wireframes | Text-based page layouts |
| 06 | File Structure | Full repo map |
| 07 | Workflow Sequences | Step-by-step flows |
