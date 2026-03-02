# 00 — Architecture: One Core + Configuration Wrappers

## The Idea

People teach. People learn. People supervise. Content is delivered. Progress is tracked. Money is exchanged. People communicate.

Everything else is **labels and policies**.

A school, a tutoring center, and a corporate training platform all do the same things — they just call them different names and enforce different rules.

## Core Concepts

| Core concept | School calls it | Tutoring calls it | Enterprise calls it |
|---|---|---|---|
| Teaching person | Enseignant | Tuteur | Formateur |
| Learning person | Élève | Apprenant | Apprenant |
| Supervisor | Parent | Parent | Manager |
| Group of learners | Classe | Groupe | Cohorte |
| Time slot | Emploi du temps | Séance | Session |
| Evaluation | Note /20 | Progress rating | Certification |
| Payment | Scolarité | Forfait heures | Budget formation |
| Content | Cahier de textes | Exercices | Module de cours |

## Architecture

```
┌─────────────────────────────────────┐
│  WRAPPER (workspace config)         │
│  - Labels / vocabulary              │
│  - Which modules are ON/OFF         │
│  - Policies (grading scale, etc.)   │
│  - UI theme / branding              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ONE CORE                           │
│  - People (teach / learn / watch)   │
│  - Relationships (who sees whom)    │
│  - Groups (any size: 1:1 to 300)    │
│  - Sessions (scheduled time)        │
│  - Content (materials, homework)    │
│  - Assessment (any form of eval)    │
│  - Communication (messages, alerts) │
│  - Billing (invoices, payments)     │
│  - Files (documents, uploads)       │
│  - Auth + permissions               │
└─────────────────────────────────────┘
```

We don't build 3 products. We build one. A "school" is a workspace with attendance-by-session + grading /20 + report cards enabled. A "tutoring center" is a workspace with booking + hour packages enabled. An "enterprise" is a workspace with certifications + learning paths enabled.

## How It Maps to Code

The core already exists in the codebase:

| Core primitive | Backend model | Status |
|---|---|---|
| People | `User`, `Role`, `UserRole` | Built |
| Relationships | `Relationship` (guardian, tutor, mentor) | Built |
| Groups | `Group` (class, section, cohort, team, tutoring_group) | Built |
| Organization | `Tenant`, `Campus`, `AcademicYear`, `Term` | Built |
| Content | `Subject`, `File` | Built |
| Communication | `Thread`, `Message`, `Notification` | Built |
| Sessions | `Session` (timetable) | Not yet |
| Assessment | `Assessment`, `Grade` | Not yet |
| Billing | `Invoice`, `Payment` | Not yet |

The workspace config lives in `Tenant.settings` (JSONB):

```json
{
  "enabled_modules": ["timetable", "attendance", "gradebook"],
  "grading_scale": 20,
  "attendance_mode": "per_session",
  "locale": "fr",
  "timezone": "Europe/Paris"
}
```

The branding lives in `Tenant.branding` (JSONB):

```json
{
  "display_name": "École Saint-Joseph",
  "primary_color": "#1B4F72",
  "logo_url": "/files/tenant-logo.png"
}
```

The workspace type (`Tenant.type`: school | tutoring_center | enterprise) determines which **template** of default settings is applied on creation. After that, the admin can toggle any module on/off.

## Modules

Modules are feature sets. Each module adds UI pages, API endpoints, and possibly new database tables. A module is either ON or OFF per workspace.

See [01-MODULES.md](01-MODULES.md) for the full module catalog.

## Workspace Templates

A template is just a preset of enabled modules + default policies. See [02-WORKSPACE-TEMPLATES.md](02-WORKSPACE-TEMPLATES.md).

## Licensing

**AGPL-3.0 + Commercial Dual License** (same model as GitLab, Mattermost)

| Use Case | License | Cost |
|---|---|---|
| Self-hosted by a school | AGPL-3.0 | Free |
| SaaS deployment by Edulia team | Commercial | Paid |
| Third party embedding without sharing code | Commercial | Paid |

## RGPD / GDPR

Non-negotiable for student data in the EU. Built in from day one:
- EU hosting only, no data leaves EU
- Data minimization, right to access/deletion/portability
- Configurable retention (default 3 years)
- No third-party trackers
- CNIL-compliant

Full details in the [archived master plan](archive/00-MASTER-PLAN.md).

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Lucide |
| State | Zustand |
| API | Python FastAPI |
| ORM | SQLAlchemy 2 + Alembic |
| DB | PostgreSQL 16 |
| Cache/Queue | Redis + Celery |
| Real-time | Socket.IO + Redis Pub/Sub |
| Files | S3-compatible (MinIO) |
| Auth | JWT + RBAC |
| i18n | i18next (fr/en) |
| Deploy | Docker + PM2 + Nginx |
