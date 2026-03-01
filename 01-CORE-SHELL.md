# 01 — Core Shell Specification

The shell is the shared foundation. Every workspace (School, Tutoring, Enterprise) builds on top of it. Nothing workspace-specific lives here — only reusable primitives.

---

## 1. Data Model (Entities)

### 1.1 Tenant / Organization

```
Tenant
├── id (uuid)
├── name
├── slug (unique, used in URL)
├── type (enum: school | tutoring_center | enterprise)
├── logo_url
├── settings (jsonb) — timezone, locale, currency, enabled_modules[]
├── subscription_plan (enum: free | pro | enterprise) — SaaS only
├── created_at
└── updated_at
```

### 1.2 Campus / Branch

```
Campus
├── id (uuid)
├── tenant_id (fk)
├── name
├── address (jsonb: street, city, zip, country, lat, lng)
├── phone
├── email
├── is_default (bool)
├── created_at
└── updated_at
```

### 1.3 Academic Year / Term

```
AcademicYear
├── id (uuid)
├── tenant_id (fk)
├── name (e.g. "2025-2026")
├── start_date
├── end_date
├── is_current (bool)
├── created_at
└── updated_at

Term (trimester, semester, etc.)
├── id (uuid)
├── academic_year_id (fk)
├── name (e.g. "Trimestre 1")
├── start_date
├── end_date
├── order (int)
├── created_at
└── updated_at
```

### 1.4 User / Person

```
User
├── id (uuid)
├── tenant_id (fk)
├── email (unique per tenant)
├── password_hash
├── first_name
├── last_name
├── display_name
├── avatar_url
├── phone
├── date_of_birth
├── gender (enum: male | female | other | undisclosed)
├── address (jsonb)
├── metadata (jsonb) — extensible per workspace
├── status (enum: active | inactive | suspended | invited)
├── last_login_at
├── created_at
└── updated_at
```

### 1.5 Role & Permission

```
Role
├── id (uuid)
├── tenant_id (fk)
├── code (e.g. "admin", "teacher", "student", "parent", "tutor")
├── display_name
├── is_system (bool) — built-in vs custom
├── permissions (text[]) — list of permission codes
├── created_at
└── updated_at

UserRole (many-to-many)
├── id (uuid)
├── user_id (fk)
├── role_id (fk)
├── scope_type (enum: tenant | campus | group | course) — RBAC scoping
├── scope_id (uuid, nullable) — the specific entity
├── granted_at
└── revoked_at (nullable)
```

**Permission codes follow pattern:** `module.entity.action`
Examples: `attendance.record.create`, `gradebook.grade.edit`, `messaging.thread.send`, `billing.invoice.view`

### 1.6 Relationship

```
Relationship
├── id (uuid)
├── tenant_id (fk)
├── from_user_id (fk) — e.g. the parent
├── to_user_id (fk) — e.g. the child
├── type (enum: guardian | manager | tutor | mentor | emergency_contact)
├── is_primary (bool)
├── metadata (jsonb) — e.g. { "relation": "mother" }
├── created_at
└── updated_at
```

### 1.7 Group

```
Group
├── id (uuid)
├── tenant_id (fk)
├── campus_id (fk, nullable)
├── academic_year_id (fk, nullable)
├── type (enum: class | section | cohort | team | tutoring_group)
├── name (e.g. "6ème A", "Math Group B")
├── description
├── capacity (int, nullable)
├── metadata (jsonb)
├── created_at
└── updated_at

GroupMembership
├── id (uuid)
├── group_id (fk)
├── user_id (fk)
├── role_in_group (enum: member | leader | teacher | tutor)
├── joined_at
└── left_at (nullable)
```

### 1.8 Subject / Course

```
Subject
├── id (uuid)
├── tenant_id (fk)
├── code (e.g. "MATH", "FRA", "HIS")
├── name
├── color (hex, for timetable)
├── description
├── created_at
└── updated_at
```

### 1.9 Messaging

```
Thread
├── id (uuid)
├── tenant_id (fk)
├── type (enum: direct | group | announcement)
├── subject (nullable)
├── created_by (fk → User)
├── created_at
└── updated_at

ThreadParticipant
├── id (uuid)
├── thread_id (fk)
├── user_id (fk)
├── role (enum: sender | recipient | cc)
├── read_at (nullable)
├── archived (bool)

Message
├── id (uuid)
├── thread_id (fk)
├── sender_id (fk → User)
├── body (text, rich text)
├── attachments (jsonb) — [{name, url, size, mime}]
├── created_at
└── edited_at (nullable)
```

### 1.10 Notification

```
Notification
├── id (uuid)
├── tenant_id (fk)
├── user_id (fk) — recipient
├── type (enum: info | warning | action | reminder)
├── channel (enum: in_app | email | push | sms)
├── title
├── body
├── link (nullable) — deep link to relevant page
├── read_at (nullable)
├── sent_at
├── created_at
```

### 1.11 File / Document

```
File
├── id (uuid)
├── tenant_id (fk)
├── uploaded_by (fk → User)
├── name
├── mime_type
├── size_bytes
├── storage_key (S3 key)
├── folder (nullable) — virtual folder path
├── visibility (enum: private | group | public)
├── context_type (nullable) — e.g. "assignment", "message", "profile"
├── context_id (nullable)
├── created_at
└── updated_at
```

### 1.12 Audit Log

```
AuditLog
├── id (uuid)
├── tenant_id (fk)
├── user_id (fk)
├── action (string) — e.g. "grade.update", "attendance.edit"
├── entity_type (string)
├── entity_id (uuid)
├── before (jsonb, nullable)
├── after (jsonb, nullable)
├── ip_address
├── user_agent
├── created_at
```

---

## 2. Authentication & Authorization

### Auth Flow
1. **Login** — Email + password → JWT (access + refresh tokens)
2. **Token refresh** — Refresh token → new access token
3. **Password reset** — Email link → reset form
4. **Invite flow** — Admin creates user → invite email → set password
5. **SSO (later)** — OIDC with Entra ID / Google

### JWT Payload
```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "roles": ["teacher"],
  "permissions": ["gradebook.grade.edit", "attendance.record.create"],
  "exp": 1234567890
}
```

### RBAC Enforcement
- Every API endpoint checks: `require_permission("module.entity.action")`
- Scope narrowing: permission can be scoped to campus/group/course
- Server-side only — frontend hides UI but backend always validates

---

## 3. API Design (REST)

Base URL: `/api/v1`

### Core endpoints

```
# Auth
POST   /auth/login
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/invite/accept

# Users
GET    /users                    — list (filtered, paginated)
POST   /users                    — create / invite
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id
GET    /users/me                 — current user profile
PATCH  /users/me

# Roles
GET    /roles
POST   /roles
PATCH  /roles/:id
DELETE /roles/:id

# Groups
GET    /groups
POST   /groups
GET    /groups/:id
PATCH  /groups/:id
DELETE /groups/:id
POST   /groups/:id/members       — add members
DELETE /groups/:id/members/:uid   — remove member

# Subjects
GET    /subjects
POST   /subjects
PATCH  /subjects/:id
DELETE /subjects/:id

# Messaging
GET    /threads                  — list user's threads
POST   /threads                  — create thread
GET    /threads/:id              — get thread + messages
POST   /threads/:id/messages     — send message
PATCH  /threads/:id/read         — mark as read

# Notifications
GET    /notifications
PATCH  /notifications/:id/read
POST   /notifications/read-all

# Files
POST   /files/upload             — multipart upload
GET    /files/:id
DELETE /files/:id
GET    /files?context_type=X&context_id=Y

# Tenant / Settings
GET    /tenant
PATCH  /tenant
GET    /tenant/settings
PATCH  /tenant/settings

# Academic structure
GET    /academic-years
POST   /academic-years
GET    /academic-years/:id/terms
POST   /academic-years/:id/terms

# Audit
GET    /audit-logs               — admin only, filtered
```

### API Conventions
- Pagination: `?page=1&per_page=20`
- Filtering: `?status=active&role=teacher`
- Sorting: `?sort=created_at&order=desc`
- Search: `?q=search+term`
- All responses: `{ data: T, meta: { page, per_page, total } }`
- Errors: `{ error: { code: string, message: string, details?: any } }`

---

## 4. UI Shell

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR                                             │
│  [☰ Menu]  [EduCore Logo]  [🔍 Search]  [🔔 3] [👤]│
├────────────┬────────────────────────────────────────┤
│  SIDEBAR   │  MAIN CONTENT                         │
│            │                                        │
│  Dashboard │  ┌──────────────────────────────────┐  │
│  Timetable │  │  Page Header                     │  │
│  Grades    │  │  [Title]        [Action Buttons]  │  │
│  Homework  │  ├──────────────────────────────────┤  │
│  Messages  │  │                                  │  │
│  Vie scol. │  │  Page Content                    │  │
│  Files     │  │  (tables, forms, cards, etc.)    │  │
│  ────────  │  │                                  │  │
│  Settings  │  │                                  │  │
│            │  │                                  │  │
│            │  └──────────────────────────────────┘  │
├────────────┴────────────────────────────────────────┤
│  MOBILE: Bottom tab bar replaces sidebar            │
└─────────────────────────────────────────────────────┘
```

### Sidebar — varies by role

**Teacher sees:**
Dashboard, Timetable, My Classes, Gradebook, Cahier de textes, Attendance, QCM, Messages, Files, Settings

**Student sees:**
Dashboard, Timetable, Grades, Homework, Submissions, Messages, Files, Settings

**Parent sees:**
Dashboard (per child), Grades, Timetable, Homework, Vie scolaire, Messages, Payments, Documents, Settings

**Admin sees:**
Dashboard, Users, Groups/Classes, Structure, Enrollment, Billing, Reports, Settings

### Dashboard (per role)

**Teacher Dashboard:**
```
┌─────────────────────────────────────────────┐
│  Good morning, M. Dupont                    │
├──────────────────────┬──────────────────────┤
│  TODAY'S SCHEDULE    │  QUICK ACTIONS       │
│  ┌────────────────┐  │  [📝 New grade]      │
│  │ 08:00 Math 6eA │  │  [📋 Take attendance]│
│  │ 09:00 Math 5eB │  │  [📨 New message]    │
│  │ 10:00 — Free — │  │  [📎 Upload file]    │
│  │ 11:00 Math 4eC │  │                      │
│  └────────────────┘  │                      │
├──────────────────────┼──────────────────────┤
│  UNREAD MESSAGES (3) │  PENDING TASKS       │
│  • Parent Mme Martin │  • Grade 6eA test    │
│  • Admin: meeting    │  • Cahier 5eB Friday │
│  • Student: question │  • Corrections due   │
├──────────────────────┴──────────────────────┤
│  RECENT GRADES ENTERED                      │
│  6eA Math — Test Ch.3 — avg: 13.2/20       │
│  5eB Math — Exercice 12 — avg: 11.8/20     │
└─────────────────────────────────────────────┘
```

**Student Dashboard:**
```
┌─────────────────────────────────────────────┐
│  Hello, Lucas                                │
├──────────────────────┬──────────────────────┤
│  TODAY'S SCHEDULE    │  HOMEWORK DUE        │
│  ┌────────────────┐  │  📕 Math: Ex 12 (Fri)│
│  │ 08:00 Français │  │  📗 French: Essay(Mon)│
│  │ 09:00 Math     │  │  📘 History: Read(Tue)│
│  │ 10:00 History  │  │                      │
│  │ 11:00 Sport    │  │                      │
│  └────────────────┘  │                      │
├──────────────────────┼──────────────────────┤
│  LATEST GRADES       │  AVERAGES            │
│  Math: 15/20 ↑       │  General: 13.8/20    │
│  French: 12/20 →     │  Math: 14.5/20       │
│  History: 16/20 ↑    │  French: 12.2/20     │
└──────────────────────┴──────────────────────┘
```

**Parent Dashboard:**
```
┌─────────────────────────────────────────────┐
│  [Child selector: Lucas ▼ | Emma ▼]         │
├──────────────────────┬──────────────────────┤
│  TODAY FOR LUCAS     │  ALERTS              │
│  ┌────────────────┐  │  ⚠️ Absence 02/28   │
│  │ 08:00 Français │  │  📝 New grade: Math  │
│  │ 09:00 Math     │  │  📨 Msg from teacher │
│  └────────────────┘  │                      │
├──────────────────────┼──────────────────────┤
│  RECENT GRADES       │  VIE SCOLAIRE        │
│  Math: 15/20         │  Absences: 2 this yr │
│  French: 12/20       │  Late: 1 this term   │
│  History: 16/20      │  Sanctions: 0        │
├──────────────────────┴──────────────────────┤
│  PENDING PAYMENTS                           │
│  Invoice #1234 — €450.00 — Due: Mar 15     │
│  [Pay now]                                  │
└─────────────────────────────────────────────┘
```

---

## 5. Notification Strategy

| Event | In-App | Email | Push (later) |
|-------|--------|-------|------|
| New grade entered | ✅ student + parent | ✅ parent | ✅ |
| Absence recorded | ✅ parent | ✅ parent | ✅ |
| New message | ✅ recipient | ✅ (digest) | ✅ |
| Homework assigned | ✅ student | ❌ | ✅ |
| Invoice created | ✅ parent | ✅ parent | ❌ |
| Announcement posted | ✅ all targets | ✅ optional | ✅ |
| Session booked (tutoring) | ✅ tutor + student | ✅ both | ✅ |
| Session cancelled | ✅ tutor + student | ✅ both | ✅ |

---

## 6. Module / Plugin System

### Workspace Configuration
```json
{
  "workspace_type": "school",
  "enabled_modules": [
    "timetable",
    "attendance",
    "gradebook",
    "report_cards",
    "homework",
    "assignments",
    "quizzes",
    "school_life",
    "enrollment",
    "billing",
    "messaging",
    "files",
    "calendar"
  ],
  "disabled_modules": [
    "tutoring_booking",
    "packages",
    "learning_paths",
    "certifications",
    "ai_authoring"
  ]
}
```

### Module Registration
Each module provides:
- **Backend:** Models, API routes, background jobs, permissions
- **Frontend:** Pages, components, sidebar items, dashboard widgets
- **Config:** `module.yaml` with metadata, dependencies, required roles

### Feature Flag Check
```python
# Backend
@require_module("gradebook")
@require_permission("gradebook.grade.create")
async def create_grade(request):
    ...

# Frontend
{isModuleEnabled("gradebook") && <GradebookPage />}
```

---

## 7. Database Strategy

- **PostgreSQL** — single database per tenant (SaaS) or single DB (local)
- **Migrations** — Alembic for schema versioning
- **Naming:** `snake_case` tables, `id` as primary key (UUID v4)
- **Soft deletes:** `deleted_at` column on critical entities
- **Timestamps:** `created_at`, `updated_at` on all tables (UTC)
- **Indexes:** On all foreign keys, status fields, `tenant_id`

---

## 8. Security Baseline

- Passwords: bcrypt hashed, min 8 chars
- JWT: short-lived access tokens (15min), longer refresh (7d)
- RBAC: enforced server-side on every request
- CORS: configured per deployment
- Rate limiting: on auth endpoints
- File uploads: virus scan (ClamAV later), size limits, type validation
- Audit logs: for all sensitive operations
- Input validation: Pydantic models on all endpoints
- SQL injection: prevented by ORM (SQLAlchemy)
- XSS: sanitized rich text output
