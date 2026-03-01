# 00 — Master Plan

## Project: Edulia — Open-Source Unified Education Platform

**Date:** 2026-03-01
**License:** AGPL-3.0 (dual licensing: AGPL for open-source, commercial license for proprietary deployments)
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

## Licensing Strategy

**AGPL-3.0 + Commercial Dual License** (same model as GitLab, Mattermost, Supabase)

| Use Case | License | Cost |
|----------|---------|------|
| Self-hosted by a school (unmodified or sharing changes) | AGPL-3.0 | Free |
| Self-hosted with custom modifications (shared back) | AGPL-3.0 | Free |
| SaaS deployment by Edulia team | Commercial | Paid plans |
| Third party wanting to embed/resell without sharing code | Commercial | Paid license |
| Contributions from community | CLA (Contributor License Agreement) | Free |

**Why AGPL over MIT:**
- Prevents large EdTech companies from taking the code, adding proprietary features, and competing without contributing back
- Schools still get full freedom to deploy, modify, and use
- Commercial license creates a sustainable revenue stream for maintenance and development
- CLA allows the project to offer both licenses (contributor grants rights to dual-license)

---

## S1 — Core Shell (Week 1-4)

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
- **White-Label Branding** — Per-tenant logo, colors, name, favicon, custom domain, "Powered by" logic

### Key decisions
- Single codebase, workspace = configuration (not separate code)
- React + Vite + TypeScript frontend
- Python FastAPI backend
- PostgreSQL database
- Redis for cache/queue
- Docker for deployment (local + SaaS)
- S3-compatible file storage (MinIO local, S3 SaaS)

---

## S2 — School Workspace (Week 4-10)

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

## S3 — Tutoring Workspace (Week 10-14)

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
| UI Components | Tailwind CSS + shadcn/ui (Radix primitives) |
| State Management | Zustand (auth, notifications, UI, tenant stores) |
| Rich Text Editor | Tiptap (ProseMirror-based, headless) |
| i18n | i18next + react-i18next |
| API | Python FastAPI |
| ORM | SQLAlchemy 2.0 + Alembic migrations |
| DB | PostgreSQL 16 (row-level isolation, RLS) |
| Search | PostgreSQL Full-Text Search (tsvector + French stemming) |
| Cache/Queue | Redis 7 |
| Workers | Celery |
| Real-Time | Socket.IO + Redis Pub/Sub |
| Files | S3-compatible (MinIO local, S3/Scaleway prod) |
| Virus Scan | ClamAV (Docker, scan on upload) |
| PDF Generation | WeasyPrint (HTML/CSS → PDF via Jinja2 templates) |
| Auth | JWT + TOTP 2FA (pyotp) + OIDC (Entra ID / Google later) |
| E-Signature | DocuSeal (open-source, self-hosted Docker) |
| Email | Brevo (ex-Sendinblue) — French, GDPR-compliant |
| Video (Tutoring) | Jitsi Meet (open-source, embed or self-hosted) |
| Push Notifications | Web Push API (via PWA service worker + pywebpush) |
| Mobile | PWA (Progressive Web App) — no native app needed |
| Calendar Sync | iCal feed (icalendar Python lib) |
| Deploy | Docker / Docker Compose |
| Monitoring | Prometheus + Grafana + Loki |
| Reverse Proxy | Nginx + Let's Encrypt SSL |

---

## Realistic Timeline

| Phase | Weeks | Content | Milestone |
|-------|-------|---------|-----------|
| **Phase 0 — Setup** | 1 | Repo, Docker, CI/CD, DB schema, project scaffold | Dev environment running |
| **Phase 1 — Core Shell** | 2-4 | Auth, users, RBAC, tenants, groups, messaging, files, UI shell | Login + dashboard working |
| **Phase 2 — School P0** | 5-8 | Timetable, attendance, gradebook, cahier de textes | Teacher can enter grades, take roll call |
| **Phase 3 — School P0 cont.** | 9-10 | Parent/student portals, notifications, dashboards | Parents can view grades + attendance |
| **Phase 4 — Tutoring P0** | 11-14 | Tutor calendar, booking, session management, learning plans | Tutor can manage sessions |
| **Phase 5 — P1 features** | 15-20 | Billing, enrollment, QCM, report cards, packages | Full feature set |
| **Phase 6 — Hardening** | 21-24 | Testing, security audit, RGPD compliance, performance | Production-ready |

**Total to MVP (P0):** ~14 weeks (3.5 months)
**Total to full feature set:** ~24 weeks (6 months)
**Pilot school target:** End of Phase 3 (week 10)

---

## RGPD / GDPR Compliance

Edulia handles student data (minors) in the EU. Compliance is **non-negotiable**.

### Data Protection Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Lawful basis** | Legitimate interest (school contract) + parental consent for minors |
| **Data minimization** | Only collect what's needed per module; no tracking/analytics on students |
| **Right to access** | Admin can export all data for a user/family as JSON/CSV |
| **Right to deletion** | Hard delete with cascade (not just soft delete) on request; audit log retained anonymized |
| **Right to portability** | Export student record (grades, attendance, reports) in standard format |
| **Data retention** | Configurable per tenant: default 3 years after student leaves; auto-purge job |
| **Breach notification** | Audit logs + alerting; 72h notification process documented |
| **DPO contact** | Configurable per tenant in settings |
| **Privacy policy** | Template provided, customizable per school |

### Hosting & Data Residency

- **EU hosting required** — default deployment on EU cloud (OVH, Scaleway, or AWS eu-west-3 Paris)
- **No data leaves EU** — S3 buckets, database, Redis all in same EU region
- **No third-party trackers** — no Google Analytics, no Facebook pixel, no CDN that logs student IPs
- **Email provider** — EU-based or GDPR-compliant (Brevo/Sendinblue, or self-hosted SMTP)

### Parental Consent

- On student account creation, system generates a consent form
- Parent must accept via e-signature before student can use the platform
- Consent is versioned — if privacy policy changes, re-consent is required
- Consent records stored in AuditLog with timestamp

### French-Specific Regulations

| Regulation | Impact |
|------------|--------|
| **CNIL guidelines for schools** | Privacy impact assessment (PIA) required before deployment |
| **Facture électronique (2026)** | Invoices must comply with French e-invoicing format (Factur-X) |
| **Hébergement de données de santé (HDS)** | If storing medical certificates (absence justification), hosting must be HDS-certified |
| **ENT framework** | If positioning as an ENT (Espace Numérique de Travail), must follow national specifications |

---

## Go-to-Market Strategy

### Target Segments (in order)

1. **French private schools (établissements privés)** — frustrated with Ecole Directe pricing and rigidity
2. **Private tutoring centers** — no good unified platform exists; most use spreadsheets
3. **Independent tutors** — lightweight self-hosted or SaaS offering
4. **International French schools (AEFE network)** — same needs, abroad, less vendor lock-in

### Launch Playbook

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Ship open-source repo with Docker one-click deploy | Week 10 |
| 2 | Find 1-2 pilot schools (personal network, education forums) | Week 8-12 |
| 3 | Run parallel with Ecole Directe for one trimester | Week 12-24 |
| 4 | Build data import tool (CSV from Ecole Directe/Pronote export) | Week 14-16 |
| 5 | Launch hosted SaaS version (commercial license) | Week 24 |
| 6 | Content marketing: blog posts, demo videos, conference talks | Ongoing |

### Competitive Advantage

| vs. Ecole Directe / Pronote | Edulia |
|-----------------------------|---------|
| Closed source, no customization | Open source, fully extensible |
| Annual license per student (expensive) | Free self-hosted, affordable SaaS |
| School-only | School + Tutoring in one platform |
| Outdated UI | Modern React UI, mobile-first |
| No API for integrations | Full REST API, plugin system |
| French-only | i18n-ready from day 1 |

---

## Build Strategy

1. **AI-assisted development** — Use Claude/AI to generate code fast
2. **File-per-file delivery** — Small, testable increments
3. **Core first** — Shell must work before any workspace module
4. **Feature flags** — Modules enabled/disabled per workspace config
5. **Open source from day 1** — Public repo (AGPL-3.0)
6. **Test-driven** — Every module ships with unit + integration tests
7. **RGPD by design** — Privacy built in, not bolted on

---

## Document Index

| # | Document | Content |
|---|----------|---------|
| 00 | Master Plan (this) | Roadmap, scopes, strategy, licensing, compliance, GTM |
| 01 | Core Shell | Data model, auth, RBAC, API, UI shell, DB strategy, real-time, i18n, testing, deployment |
| 02 | School Scope | École Directe parity — every feature |
| 03 | Tutoring Scope | Tutor/tutee — every feature |
| 04 | Enterprise Scope | Future reference |
| 05 | UI/UX Wireframes | Text-based page layouts |
| 06 | File Structure | Full repo map (frontend, backend, socketio, e2e, infra, scripts, CI/CD) |
| 07 | Workflow Sequences | Step-by-step flows |
| 08 | Build Phases | 54 AI-testable micro-steps with 138 API tests + 75 E2E screenshots |
| 09 | Infrastructure | Full infra: Docker Compose, services, networking, deployment, backup, security |
