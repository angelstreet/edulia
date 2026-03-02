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
├── subscription_plan (enum: free | pro | enterprise) — SaaS only
├── settings (jsonb) — see below
├── branding (jsonb) — see White-Label Branding section
├── custom_domain (text, nullable) — e.g. "ecole.saint-joseph.fr"
├── created_at
└── updated_at
```

**Settings JSONB structure:**
```json
{
  "timezone": "Europe/Paris",
  "locale": "fr",
  "currency": "EUR",
  "enabled_modules": ["timetable", "attendance", "gradebook", ...],
  "academic_structure": "trimester",
  "grading_scale": 20,
  "grading_type": "numeric",
  "show_rank": true,
  "show_class_average": true,
  "attendance_mode": "per_session",
  "cancellation_policy_hours": 24,
  "file_upload_max_mb": 50,
  "personal_cloud_quota_mb": 2048,
  "data_retention_years": 3,
  "auto_purge_enabled": false,
  "virus_scan_mode": "blocking"
}
```

**Branding JSONB structure:**
```json
{
  "display_name": "École Saint-Joseph",
  "logo_url": "/files/tenant-logo.png",
  "favicon_url": "/files/favicon.ico",
  "primary_color": "#1B4F72",
  "secondary_color": "#F39C12",
  "accent_color": "#27AE60",
  "login_background_url": "/files/login-bg.jpg",
  "login_welcome_text": "Bienvenue sur l'espace numérique de l'École Saint-Joseph",
  "footer_text": "École Saint-Joseph — 12 rue des Lilas, 75005 Paris",
  "show_powered_by": true,
  "email_header_logo_url": "/files/email-logo.png"
}
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

### Tenant Resolution

Every API request is scoped to a tenant. Resolution order:

1. **JWT claim** (primary) — `tenant_id` is embedded in the access token at login
2. **Subdomain** (SaaS) — `saint-joseph.edulia.app` → resolve `saint-joseph` slug → tenant_id
3. **Header** (API integrations) — `X-Tenant-ID` header for service-to-service calls

```python
# apps/api/app/core/middleware.py
async def tenant_middleware(request: Request, call_next):
    # From JWT (already validated by auth dependency)
    if hasattr(request.state, 'user'):
        request.state.tenant_id = request.state.user.tenant_id
    # From subdomain (public routes like login)
    elif host := request.headers.get('host'):
        slug = host.split('.')[0]
        tenant = await get_tenant_by_slug(slug)
        request.state.tenant_id = tenant.id if tenant else None
    return await call_next(request)
```

**Rule:** Every database query includes `tenant_id` filter. No exceptions. If `tenant_id` is missing, the request fails with 400.

### Pagination: Offset-Based

**Why offset over cursor:** Simpler, users can jump to page N, good enough for our scale (< 100k rows per table per tenant). Cursor pagination is only needed for infinite-scroll feeds with millions of rows.

```python
# apps/api/app/core/pagination.py
from pydantic import BaseModel

class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20  # max 100

class PaginatedResponse(BaseModel):
    data: list
    meta: dict  # { page, per_page, total, total_pages }

async def paginate(query, params: PaginationParams):
    total = await query.count()
    items = await query.offset((params.page - 1) * params.per_page).limit(params.per_page).all()
    return PaginatedResponse(
        data=items,
        meta={
            "page": params.page,
            "per_page": params.per_page,
            "total": total,
            "total_pages": ceil(total / params.per_page),
        }
    )
```

### Optimistic Locking (Concurrent Edits)

Two teachers editing the same assessment, a parent and vie scolaire updating attendance simultaneously — we use `updated_at` as a version field.

```python
# Every PATCH/PUT includes the last-known updated_at
class GradeUpdate(BaseModel):
    score: float
    updated_at: datetime  # client sends this

async def update_grade(grade_id: UUID, data: GradeUpdate, db: Session):
    grade = await db.get(Grade, grade_id)
    if grade.updated_at != data.updated_at:
        raise ConflictError("Ce enregistrement a été modifié par quelqu'un d'autre. Veuillez rafraîchir.")
    grade.score = data.score
    grade.updated_at = datetime.utcnow()
    await db.commit()
```

Frontend handles the 409 Conflict by showing a toast: "Data was modified by someone else — refreshing..." and auto-refetches via React Query.

### Celery Task Retry Strategy

```python
# apps/api/worker/jobs/send_notification.py
from celery import shared_task

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # 1 min, then 2 min, then 4 min (exponential)
    retry_backoff=True,
    retry_jitter=True,
    acks_late=True,          # re-queue if worker crashes mid-task
)
def send_email_notification(self, notification_id: str):
    try:
        notification = get_notification(notification_id)
        send_email(notification.user.email, notification.title, notification.body)
        notification.sent_at = datetime.utcnow()
        save(notification)
    except SMTPError as e:
        self.retry(exc=e)  # retries with backoff
    except Exception as e:
        # Log to Sentry, mark notification as failed
        notification.status = "failed"
        save(notification)
        raise

# Per-task retry config:
# Email:          3 retries, 60s backoff — SMTP can be flaky
# PDF generation: 2 retries, 30s — usually OOM, retry helps
# Stripe webhook: 0 retries — Stripe retries itself
# Data export:    1 retry, 120s — large query might timeout
```

### Celery Queues

```python
# Separate queues to prevent slow tasks from blocking fast ones
CELERY_TASK_ROUTES = {
    'jobs.send_email_notification': {'queue': 'email'},
    'jobs.send_push_notification': {'queue': 'notifications'},
    'jobs.generate_report_card_pdf': {'queue': 'pdf'},
    'jobs.generate_invoice_pdf': {'queue': 'pdf'},
    'jobs.export_data': {'queue': 'pdf'},        # heavy, same queue
    'jobs.scan_file': {'queue': 'default'},
    'jobs.daily_*': {'queue': 'default'},
}

# Worker command runs all queues:
# celery -A worker.worker worker -Q default,email,notifications,pdf
```

### API Conventions
- Pagination: `?page=1&per_page=20` (max 100)
- Filtering: `?status=active&role=teacher`
- Sorting: `?sort=created_at&order=desc`
- Search: `?q=search+term`
- All responses: `{ data: T, meta: { page, per_page, total, total_pages } }`
- Errors: `{ error: { code: string, message: string, details?: any } }`
- Conflict: `409` with `{ error: { code: "CONFLICT", message: "..." } }` + `updated_at` of current version

---

## 4. Frontend Technology Decisions

### UI Components: Tailwind CSS + shadcn/ui

**Why:** Zero-runtime CSS (Tailwind compiles away), accessible components via Radix primitives, full ownership of component code (copy-paste, not npm dependency), dominant ecosystem, excellent TypeScript support.

**Setup:**
```bash
# Tailwind
npm install -D tailwindcss postcss autoprefixer
# shadcn/ui (CLI to add components)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input select dialog table card badge tabs toast
```

**Component mapping:**
| Our component | shadcn/ui base | Customization |
|---------------|----------------|---------------|
| `Button.tsx` | `@/components/ui/button` | Edulia brand colors |
| `Input.tsx` | `@/components/ui/input` | French labels, validation |
| `Table.tsx` | `@/components/ui/table` | Pagination, sorting built-in |
| `Modal.tsx` | `@/components/ui/dialog` | Standard sizes (sm/md/lg) |
| `Select.tsx` | `@/components/ui/select` | Searchable variant |
| `Toast.tsx` | `@/components/ui/toast` | Success/error/warning variants |
| `Card.tsx` | `@/components/ui/card` | Dashboard widget styling |
| `Badge.tsx` | `@/components/ui/badge` | Status colors (active/inactive/pending) |

### State Management: Zustand

**Why:** Minimal boilerplate (no Provider wrappers, no reducers), excellent TypeScript inference, tiny bundle (1KB), works outside React components (useful for API interceptors).

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: async (email, password) => {
        const { data } = await authApi.login(email, password);
        set({ accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user });
      },
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'edulia-auth' }
  )
);
```

**Stores needed (4 total):**
| Store | Purpose | Persisted? |
|-------|---------|------------|
| `authStore` | Tokens, current user, login/logout | Yes (localStorage) |
| `tenantStore` | Tenant config, enabled modules, settings | Yes (sessionStorage) |
| `notificationStore` | Unread count, notification list | No (refreshed on connect) |
| `uiStore` | Sidebar open/closed, theme, locale | Yes (localStorage) |

### Rich Text Editor: Tiptap

**Why:** Headless (style with Tailwind, no CSS conflicts), extensible (add image upload, mentions, tables), ProseMirror-based (battle-tested), supports collaborative editing later.

```typescript
// components/ui/RichTextEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

const RichTextEditor = ({ content, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  return <EditorContent editor={editor} className="prose max-w-none" />;
};
```

**Used in:** Cahier de textes, messaging, homework descriptions, teacher comments, session notes.

### PWA (Progressive Web App)

**Why:** Install-to-homescreen on mobile, push notifications without native app, offline grade viewing, no app store submission/review needed.

**Files:**
```
apps/web/public/
├── manifest.json              # app name, icons, theme color
├── sw.js                      # service worker (cache + push)
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
```

```json
// manifest.json
{
  "name": "Edulia",
  "short_name": "Edulia",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1e3a5f",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Capabilities:**
| Feature | Support |
|---------|---------|
| Install to homescreen | All modern browsers |
| Push notifications | Chrome, Firefox, Edge (not Safari iOS yet) |
| Offline grade viewing | Service worker caches last-viewed data |
| Background sync | Queue homework submissions when offline |

---

### Data Fetching: TanStack Query (React Query)

**Why:** Automatic caching, background refetch, optimistic updates (critical for grade entry), request deduplication, loading/error states built-in. Far superior to raw `useEffect` + `fetch`.

```typescript
// hooks/useGrades.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesApi } from '@/api/grades';

// Fetch grades — cached, auto-refetches on window focus
export const useStudentGrades = (termId: string) =>
  useQuery({
    queryKey: ['grades', 'me', termId],
    queryFn: () => gradesApi.getMyGrades(termId),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

// Create grade — optimistic update
export const useCreateGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gradesApi.createBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['averages'] });
    },
  });
};
```

**Query key convention:** `['entity', scope, id, filters]`
- `['grades', 'me', termId]` — student's own grades
- `['grades', 'class', groupId, termId]` — teacher's class view
- `['attendance', sessionId]` — roll call for a session
- `['threads']` — messaging inbox
- `['notifications', { unread: true }]` — unread notifications

### Router: React Router v6

**Why:** Most mature, nested layouts (AppShell > Feature > Page), lazy loading via `React.lazy`, route guards for auth/role/module, data loaders for prefetching.

```typescript
// app/router.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: () => import('@/features/auth/pages/LoginPage'),
  },
  {
    path: '/',
    element: <AuthGuard><AppShell /></AuthGuard>,
    children: [
      { index: true, lazy: () => import('@/features/dashboard/pages/DashboardPage') },
      {
        path: 'timetable',
        element: <ModuleGuard module="timetable" />,
        lazy: () => import('@/features/timetable/pages/TimetablePage'),
      },
      {
        path: 'grades',
        element: <ModuleGuard module="gradebook" />,
        children: [
          { index: true, lazy: () => import('@/features/gradebook/pages/MyGradesPage') },
          {
            path: 'entry/:groupId',
            element: <RoleGuard roles={['teacher', 'admin']} />,
            lazy: () => import('@/features/gradebook/pages/GradeEntryPage'),
          },
        ],
      },
      // ... all other routes
    ],
  },
]);
```

### Forms: React Hook Form + Zod

**Why React Hook Form:** Uncontrolled inputs (fast, no re-renders), great TypeScript support, tiny bundle. **Why Zod:** Schema validation that mirrors Pydantic on the backend, composes well, generates TypeScript types.

```typescript
// Shared validation schema (used by both frontend form and API contract)
// packages/shared/src/schemas/grade.ts
import { z } from 'zod';

export const gradeSchema = z.object({
  assessment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  score: z.number().min(0).max(20).nullable(),
  is_absent: z.boolean().default(false),
  comment: z.string().max(500).optional(),
});

export type GradeInput = z.infer<typeof gradeSchema>;
```

```typescript
// Component usage
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const GradeForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<GradeInput>({
    resolver: zodResolver(gradeSchema),
  });

  const onSubmit = (data: GradeInput) => createGrade.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('score', { valueAsNumber: true })} error={errors.score?.message} />
      <Input {...register('comment')} />
      <Button type="submit">Enregistrer</Button>
    </form>
  );
};
```

### Date/Time: date-fns

**Why:** Tree-shakeable (only import what you use), immutable, supports French locale, no prototype pollution (unlike Moment.js). Lighter than dayjs for our use case since we need heavy date arithmetic (timetable, recurring sessions).

```typescript
import { format, addWeeks, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

// Display: "Lundi 3 mars 2026"
format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });

// Timetable: get Mon-Fri of current week
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
const weekDays = eachDayOfInterval({
  start: weekStart,
  end: addWeeks(weekStart, 0) // same week, 5 days
}).slice(0, 5); // Mon-Fri
```

### Tables: TanStack Table

**Why:** Headless (style with Tailwind/shadcn), sorting, filtering, pagination, column resizing, row selection — all needed for gradebook grid, user admin, billing tables.

```typescript
// Gradebook grid uses TanStack Table with inline editing
const columns = [
  columnHelper.accessor('student_name', { header: 'Élève', enableSorting: true }),
  columnHelper.accessor('score', {
    header: 'Note /20',
    cell: ({ getValue, row, column }) => (
      <Input
        type="number"
        defaultValue={getValue()}
        onBlur={(e) => updateGrade(row.original.id, Number(e.target.value))}
        className="w-16"
      />
    ),
  }),
  columnHelper.accessor('comment', { header: 'Commentaire' }),
];
```

### Error Propagation (API → Frontend)

```typescript
// API client interceptor — catches all errors, normalizes them
// apps/web/src/api/client.ts
import axios from 'axios';

const client = axios.create({ baseURL: '/api/v1' });

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try refresh token
      const refreshed = await tryRefreshToken();
      if (!refreshed) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
      return client.request(error.config); // retry original request
    }
    if (error.response?.status === 403) {
      toast.error(t('errors.forbidden'));
    }
    if (error.response?.status === 429) {
      toast.error(t('errors.rate_limited'));
    }
    // Surface API error message
    const message = error.response?.data?.error?.message || t('errors.generic');
    return Promise.reject({ ...error, userMessage: message });
  }
);
```

---

## 5. UI Shell

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR                                             │
│  [☰ Menu]  [Tenant Logo]  [🔍 Search]  [🔔 3] [👤] │
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

## 5b. Notification Strategy

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

Each module is a self-contained unit. Registration is explicit — no magic auto-discovery.

**Backend — module manifest:**
```python
# apps/api/app/modules/gradebook/__init__.py
from app.core.module_registry import ModuleDefinition

module = ModuleDefinition(
    name="gradebook",
    display_name="Notes & Évaluations",
    description="Grade entry, averages, competencies",
    workspace_types=["school"],           # only available for school workspaces
    dependencies=["groups", "subjects"],  # requires these modules
    permissions=[
        "gradebook.assessment.create",
        "gradebook.assessment.edit",
        "gradebook.assessment.delete",
        "gradebook.assessment.publish",
        "gradebook.grade.create",
        "gradebook.grade.edit",
        "gradebook.grade.view",
        "gradebook.average.view",
    ],
    default_roles={
        "teacher": ["gradebook.assessment.*", "gradebook.grade.*"],
        "student": ["gradebook.grade.view", "gradebook.average.view"],
        "parent":  ["gradebook.grade.view", "gradebook.average.view"],
        "admin":   ["gradebook.*"],
    },
)
```

```python
# apps/api/app/main.py — explicit registration
from app.modules.auth import router as auth_router
from app.modules.gradebook import router as gradebook_router, module as gradebook_module

# Register routes (always loaded, but guarded by @require_module)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(gradebook_router, prefix="/api/v1", tags=["gradebook"])

# Register module metadata
module_registry.register(gradebook_module)
```

**Frontend — module-aware routing and sidebar:**
```typescript
// app/modules.ts — central module registry
export const modules = {
  timetable:   { icon: Calendar, label: 'timetable.title', path: '/timetable', workspaces: ['school'] },
  attendance:  { icon: ClipboardCheck, label: 'attendance.title', path: '/attendance', workspaces: ['school'] },
  gradebook:   { icon: BookOpen, label: 'gradebook.title', path: '/grades', workspaces: ['school'] },
  homework:    { icon: FileText, label: 'homework.title', path: '/homework', workspaces: ['school'] },
  tutoring:    { icon: Users, label: 'tutoring.title', path: '/tutoring', workspaces: ['tutoring'] },
  booking:     { icon: CalendarPlus, label: 'booking.title', path: '/booking', workspaces: ['tutoring'] },
  messaging:   { icon: MessageSquare, label: 'messaging.title', path: '/messages', workspaces: ['school', 'tutoring'] },
  billing:     { icon: CreditCard, label: 'billing.title', path: '/billing', workspaces: ['school', 'tutoring'] },
};

// Sidebar filters by tenant config
const enabledModules = useTenantStore(s => s.settings.enabled_modules);
const sidebarItems = Object.entries(modules)
  .filter(([key]) => enabledModules.includes(key));
```

### Feature Flag Check
```python
# Backend — decorator checks tenant's enabled_modules
@require_module("gradebook")
@require_permission("gradebook.grade.create")
async def create_grade(request):
    ...

# If module not enabled for this tenant → 404 (not 403 — module doesn't "exist" for them)
```

```typescript
// Frontend — ModuleGuard component wraps routes
const ModuleGuard = ({ module, children }) => {
  const enabled = useTenantStore(s => s.settings.enabled_modules);
  if (!enabled.includes(module)) return <Navigate to="/" />;
  return children;
};

// Router usage
{ path: 'grades', element: <ModuleGuard module="gradebook"><Outlet /></ModuleGuard>, ... }
```

---

## 7. Database Strategy

### Multi-Tenancy: Row-Level Isolation (Shared Database)

**Decision:** Single shared PostgreSQL database with `tenant_id` on every table. Not database-per-tenant.

**Why:**
- Simpler migrations (one schema to maintain)
- Simpler backups and monitoring
- Lower infrastructure cost (one DB instance)
- Good enough until a single tenant exceeds millions of rows
- Scales to hundreds of tenants without operational overhead

**Implementation:**
```python
# Every query automatically filtered by tenant
class TenantMixin:
    tenant_id = Column(UUID, ForeignKey("tenants.id"), nullable=False, index=True)

# Middleware sets tenant context from JWT
@app.middleware("http")
async def tenant_middleware(request, call_next):
    tenant_id = request.state.user.tenant_id
    request.state.tenant_id = tenant_id
    return await call_next(request)

# Service layer always filters
async def get_users(db, tenant_id, filters):
    return db.query(User).filter(User.tenant_id == tenant_id).all()
```

**Safety rules:**
- `tenant_id` is **NOT NULL** on every table (except `tenants` itself)
- Composite unique constraints include `tenant_id` (e.g., `UNIQUE(tenant_id, email)` on users)
- No cross-tenant joins — ever
- Row-Level Security (RLS) enabled in PostgreSQL as defense-in-depth:
  ```sql
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
  ```

### General DB Rules

- **Migrations** — Alembic for schema versioning
- **Naming:** `snake_case` tables, `id` as primary key (UUID v4)
- **Soft deletes:** `deleted_at` column on critical entities (users, groups, invoices)
- **Hard deletes:** Supported for RGPD right-to-deletion (with anonymized audit trail)
- **Timestamps:** `created_at`, `updated_at` on all tables (UTC)
- **Indexes:** On all foreign keys, status fields, `tenant_id`, composite indexes for common queries
- **Connection pooling:** PgBouncer in transaction mode for production

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
- XSS: sanitized rich text output (Tiptap output sanitized via DOMPurify)

---

## 9. PDF Generation: WeasyPrint

**Why:** HTML/CSS → PDF. Design templates with Jinja2 + CSS (skills any web developer has), renders pixel-perfect PDFs. Much simpler than ReportLab. Runs in Celery worker (heavy operation offloaded from API).

### Usage

```python
# apps/api/app/modules/report_cards/pdf_generator.py
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("app/templates"))

def generate_report_card_pdf(report_card: ReportCard) -> bytes:
    template = env.get_template("report_card/bulletin.html")
    html_content = template.render(
        student=report_card.student,
        subjects=report_card.subjects,
        averages=report_card.averages,
        comments=report_card.comments,
        school=report_card.tenant,
    )
    return HTML(string=html_content).write_pdf()
```

### Templates

```
apps/api/app/templates/
├── fr/
│   ├── report_card/
│   │   ├── bulletin.html          # French bulletin scolaire format
│   │   └── bulletin.css
│   ├── invoice/
│   │   ├── facture.html           # Factur-X compliant
│   │   └── facture.css
│   └── email/
│       ├── welcome.html
│       ├── password_reset.html
│       ├── absence_alert.html
│       ├── grade_notification.html
│       └── invoice_sent.html
└── en/
    └── ... (same structure)
```

**PDFs generated:**
| Document | Trigger | Template |
|----------|---------|----------|
| Report card (bulletin) | Admin publishes term report | `bulletin.html` |
| Invoice | Invoice created or paid | `facture.html` |
| Payment receipt | Payment completed | `receipt.html` |
| Enrollment confirmation | Enrollment accepted | `enrollment_confirm.html` |
| Attendance report | Admin exports | `attendance_report.html` |

---

## 10. Search: PostgreSQL Full-Text Search

**Why:** No extra infrastructure (no Elasticsearch/Meilisearch to maintain), built into PostgreSQL, supports French stemming, good enough for < 100k users.

### Implementation

```sql
-- Add search vectors to key tables
ALTER TABLE users ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, ''))
  ) STORED;

CREATE INDEX idx_users_search ON users USING GIN(search_vector);

-- Query
SELECT * FROM users
WHERE tenant_id = :tenant_id
  AND search_vector @@ plainto_tsquery('french', :query)
ORDER BY ts_rank(search_vector, plainto_tsquery('french', :query)) DESC
LIMIT 20;
```

### Search API

```python
# GET /api/v1/search?q=dupont
# Returns grouped results scoped by role
{
  "data": {
    "users": [{"id": "...", "name": "DUPONT Emma", "role": "student"}],
    "groups": [{"id": "...", "name": "6ème A"}],
    "messages": [{"id": "...", "subject": "Re: Dupont Lucas"}],
    "files": [{"id": "...", "name": "dupont_bulletin.pdf"}]
  }
}
```

**Tables with search vectors:** `users`, `groups`, `threads`, `files`, `homework`

### Search Permission Scoping

Results are filtered by the current user's role:

| Role | Users | Groups | Messages | Files |
|------|-------|--------|----------|-------|
| Admin | All in tenant | All | All | All |
| Teacher | Own students + colleagues | Own classes | Own threads | Own + shared |
| Student | Own teachers + classmates | Own class | Own threads | Own + shared |
| Parent | Own children's teachers | Own children's classes | Own threads | Own children's files |

Frontend debounces search input by 300ms. Backend applies role-based `WHERE` clauses alongside tenant isolation.

---

## 11. E-Signature: DocuSeal (Open-Source)

**What:** [DocuSeal](https://www.docuseal.co/) is an open-source document signing platform. Self-hosted in Docker, full API, PDF form fields, audit trail, legally valid signatures.

**Why not DocuSign:** DocuSign is closed-source, expensive ($10+/user/month), US-hosted. DocuSeal is free, open-source (AGPL), self-hosted in EU, and provides the same core functionality.

### Docker Setup

```yaml
# In docker-compose.yml
docuseal:
  image: docuseal/docuseal:latest
  ports: ["3000:3000"]
  volumes:
    - docuseal_data:/data
  environment:
    DATABASE_URL: postgresql://edulia:${DB_PASSWORD}@db:5432/docuseal
    SECRET_KEY_BASE: ${DOCUSEAL_SECRET}
```

### Integration

```python
# apps/api/app/integrations/docuseal/client.py
import httpx

DOCUSEAL_URL = "http://docuseal:3000/api"

async def create_signing_request(
    template_id: int,
    signer_email: str,
    signer_name: str,
    fields: dict
) -> dict:
    """Create a document signing request via DocuSeal API"""
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{DOCUSEAL_URL}/submissions", json={
            "template_id": template_id,
            "send_email": True,
            "submitters": [{
                "email": signer_email,
                "name": signer_name,
                "fields": fields
            }]
        }, headers={"X-Auth-Token": DOCUSEAL_API_KEY})
        return response.json()

async def get_signing_status(submission_id: int) -> str:
    """Check if document has been signed"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{DOCUSEAL_URL}/submissions/{submission_id}",
            headers={"X-Auth-Token": DOCUSEAL_API_KEY})
        return response.json()["status"]  # "pending" | "completed"
```

### Use Cases

| Document | When | Signers |
|----------|------|---------|
| Enrollment authorization | Parent submits enrollment | Parent(s) |
| Exit authorization | Parent authorizes early dismissal | Parent |
| Photo consent | Start of year | Parent |
| Tutoring contract | New tutoring student | Parent + center admin |
| RGPD consent | Account creation | Parent (for minor) or user |

---

## 12. Virus Scanning: ClamAV

**Why:** Schools upload medical certificates, student documents, homework files. Scanning for malware is a security requirement and builds trust.

### Docker Setup

```yaml
# In docker-compose.yml
clamav:
  image: clamav/clamav:stable
  ports: ["3310:3310"]
  volumes:
    - clamav_data:/var/lib/clamav    # virus definition cache
  deploy:
    resources:
      limits: { memory: "1G" }       # ClamAV needs ~500MB for definitions
```

### Integration

```python
# apps/api/app/modules/files/storage.py
import clamd

cd = clamd.ClamdNetworkSocket(host="clamav", port=3310)

async def scan_file(file_bytes: bytes) -> bool:
    """Returns True if file is clean, raises if infected"""
    result = cd.instream(io.BytesIO(file_bytes))
    status = result["stream"][0]
    if status == "FOUND":
        raise MalwareDetectedError(f"Malware detected: {result['stream'][1]}")
    return True

# In upload endpoint:
async def upload_file(file: UploadFile):
    content = await file.read()
    await scan_file(content)          # scan BEFORE storing
    key = await store_to_s3(content)  # only store if clean
    ...
```

### Flow
```
User uploads file → API receives → ClamAV scans → Clean? → Store in MinIO/S3
                                                 → Infected? → 400 error, file rejected, audit log
```

**Scanning mode** (configurable per tenant via `settings.virus_scan_mode`):
- `blocking` (default): Upload waits for scan result. File rejected immediately if infected. Best for schools handling sensitive documents.
- `async`: Upload stored immediately, scan runs via Celery job. If infected, file is quarantined and uploader notified. Better for large file uploads where latency matters.

---

## 13. Two-Factor Authentication (TOTP)

**Implementation:** TOTP (Time-based One-Time Password) via `pyotp`. Compatible with Google Authenticator, Authy, Microsoft Authenticator.

### Setup Flow

```python
# POST /api/v1/auth/2fa/setup
import pyotp
import qrcode

def setup_2fa(user: User) -> dict:
    secret = pyotp.random_base32()
    user.totp_secret = encrypt(secret)  # store encrypted
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="Edulia")
    qr = generate_qr_code(uri)  # PNG bytes
    return {"qr_code": base64(qr), "secret": secret, "uri": uri}

# POST /api/v1/auth/2fa/verify — confirm setup with first code
def verify_2fa_setup(user: User, code: str) -> bool:
    secret = decrypt(user.totp_secret)
    totp = pyotp.TOTP(secret)
    if totp.verify(code):
        user.totp_enabled = True
        generate_backup_codes(user)  # 10 one-time backup codes
        return True
    return False
```

### Login Flow with 2FA

```
1. POST /auth/login {email, password} → 200 {requires_2fa: true, temp_token: "..."}
2. POST /auth/2fa/login {temp_token, code} → 200 {access_token, refresh_token}
```

### Priority
- **Not in MVP** — add before any production school deployment
- **Optional per tenant** — admin can require 2FA for staff roles (teachers, admins)
- **Backup codes** — 10 one-time codes generated on setup, for recovery

---

## 14. Video Conferencing: Jitsi Meet

**Why:** Open-source, self-hosted or free hosted (meet.jit.si), no per-user costs, no API keys needed for basic usage, iframe embeddable.

### Integration

```typescript
// apps/web/src/features/tutoring/components/VideoSession.tsx
const VideoSession = ({ sessionId, roomName }: Props) => {
  const domain = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
  const options = {
    roomName: `edulia-${sessionId}`,
    parentNode: document.getElementById("jitsi-container"),
    userInfo: { displayName: currentUser.display_name },
    configOverwrite: {
      startWithAudioMuted: true,
      startWithVideoMuted: false,
      disableDeepLinking: true,
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      TOOLBAR_BUTTONS: ["microphone", "camera", "desktop", "chat", "hangup"],
    },
  };

  useEffect(() => {
    const api = new JitsiMeetExternalAPI(domain, options);
    return () => api.dispose();
  }, []);

  return <div id="jitsi-container" className="w-full h-[600px]" />;
};
```

### Deployment Options

| Option | Cost | Latency | Control |
|--------|------|---------|---------|
| **meet.jit.si (hosted)** | Free | Variable | Low (shared infra) |
| **Self-hosted Jitsi** | VM cost (~€15/month) | Low | Full |
| **8x8 JaaS** | Free tier (25 users) | Low | Medium |

**Recommendation:** Start with `meet.jit.si` (free), self-host later if quality or privacy matters.

### Flow
```
Tutoring session starts → Generate room URL → Embed Jitsi iframe
                       → Both tutor and student join same room
                       → Session ends → Room auto-destroys
```

---

## 15. Calendar Sync (iCal)

### Implementation

```python
# apps/api/app/modules/calendar/ical.py
from icalendar import Calendar, Event

def generate_ical_feed(user: User, sessions: list) -> bytes:
    cal = Calendar()
    cal.add("prodid", "-//Edulia//EN")
    cal.add("version", "2.0")
    cal.add("x-wr-calname", f"Edulia - {user.display_name}")

    for session in sessions:
        event = Event()
        event.add("summary", f"{session.subject.name} - {session.group.name}")
        event.add("dtstart", session.start_datetime)
        event.add("dtend", session.end_datetime)
        event.add("location", session.room.name if session.room else "")
        event.add("description", f"Enseignant: {session.teacher.display_name}")
        event.add("uid", f"{session.id}@edulia")
        cal.add_component(event)

    return cal.to_ical()
```

### Endpoint

```
GET /api/v1/calendar/ical?token={personal_feed_token}
Content-Type: text/calendar

# No JWT auth — uses a personal, non-expiring feed token
# User generates token from Settings → Calendar sync
# Paste URL into Google Calendar / Outlook / Apple Calendar
```

**Feeds available:**
| Role | Feed content |
|------|-------------|
| Student | Timetable + homework due dates + exam periods |
| Teacher | Teaching schedule + meetings + deadlines |
| Tutor | Booked sessions + availability blocks |
| Parent | Children's timetables + meetings + payment due dates |

---

## 16. Competency Tracking (LSU/LSL)

French national competency framework for primary (LSU) and lycée (LSL).

### Data Model

```
Competency
├── id (uuid)
├── tenant_id (fk)
├── code (e.g. "D1.1", "D2")
├── name (e.g. "Comprendre, s'exprimer en utilisant la langue française")
├── domain (e.g. "Domaine 1 — Les langages")
├── cycle (enum: cycle_2 | cycle_3 | cycle_4 | lycee)
├── parent_id (fk, nullable) — for sub-competencies
├── order (int)
├── created_at
└── updated_at

CompetencyEvaluation
├── id (uuid)
├── tenant_id (fk)
├── student_id (fk → User)
├── competency_id (fk)
├── term_id (fk)
├── level (enum: insufficient | fragile | satisfactory | very_good)
├── teacher_id (fk)
├── subject_id (fk)
├── comment (text, nullable)
├── created_at
└── updated_at
```

### Features
- Pre-seeded with French national competency framework (Socle commun)
- Teachers evaluate per student per term
- Integrated into report cards (alongside numeric grades)
- Export to LSU XML format for ministry reporting
- **Priority:** P1 (after core gradebook works)

---

## 17. Real-Time Communication

### Decision: WebSocket via Socket.IO + Redis Pub/Sub

**Why not polling:** Polling wastes bandwidth and adds latency. With attendance alerts needing < 5 min delivery and messaging needing near-instant display, WebSocket is the right choice.

**Why Socket.IO over raw WebSocket:** Auto-reconnection, room support (per tenant, per user), fallback to long-polling on restrictive networks (school firewalls), and mature client libraries for React.

### Architecture

```
Browser ←→ Socket.IO Server ←→ Redis Pub/Sub ←→ FastAPI Workers
                                      ↕
                               Celery Workers (background jobs)
```

### Events

| Event | Channel | Payload | Recipients |
|-------|---------|---------|------------|
| `notification:new` | `user:{id}` | Notification object | Single user |
| `message:new` | `thread:{id}` | Message object | Thread participants |
| `attendance:recorded` | `user:{parent_id}` | Absence/late summary | Parent |
| `grade:published` | `user:{student_id}` | Grade summary | Student + parent |
| `session:updated` | `user:{tutor_id}` | Session change | Tutor |

### Implementation

```python
# Backend: emit via Redis pub/sub (any worker can trigger)
import redis
r = redis.Redis()

def notify_user(user_id: str, event: str, data: dict):
    r.publish(f"user:{user_id}", json.dumps({"event": event, "data": data}))

# Socket.IO server subscribes to Redis and forwards to connected clients
```

```typescript
// Frontend: React hook
const useRealTime = () => {
  const socket = useSocket(); // Socket.IO client
  useEffect(() => {
    socket.on("notification:new", (data) => {
      addNotification(data);
      updateBadgeCount();
    });
    socket.on("message:new", (data) => {
      addMessage(data);
    });
  }, []);
};
```

### Deployment

- Socket.IO server runs as a separate process alongside FastAPI
- Shares Redis instance with Celery (different DB number)
- Sticky sessions via Nginx `ip_hash` if horizontally scaled
- Max connections: ~10k per Socket.IO instance (sufficient for single-school deploy)

---

## 18. Internationalization (i18n)

### Decision: i18next (frontend) + gettext-style (backend)

Default language: **French (fr)**. English (en) from day 1. Additional languages community-contributed.

### Frontend (i18next + react-i18next)

```typescript
// Translation files: apps/web/src/locales/{lang}/{namespace}.json
// e.g., apps/web/src/locales/fr/gradebook.json
{
  "grade_entry": "Saisie de notes",
  "average": "Moyenne",
  "publish": "Publier",
  "save_draft": "Enregistrer le brouillon",
  "class_average": "Moyenne de classe"
}

// Usage in components
const { t } = useTranslation("gradebook");
<h1>{t("grade_entry")}</h1>
```

**Namespace per module:** `common`, `auth`, `gradebook`, `attendance`, `tutoring`, etc.
**Interpolation:** `t("hello", { name: "Lucas" })` → "Bonjour Lucas !"
**Plurals:** Handled by i18next ICU format.
**Date/number formatting:** `Intl.DateTimeFormat` and `Intl.NumberFormat` with locale from tenant settings.

### Backend (API responses)

- Error messages use translation keys, not hardcoded strings: `{"error": {"code": "GRADE_NOT_FOUND", "message_key": "errors.grade_not_found"}}`
- Frontend resolves the key to the user's locale
- Email templates: Jinja2 templates per locale in `apps/api/app/templates/{lang}/`
- PDF generation (report cards, invoices): locale-aware templates

### Locale Resolution

1. User preference (stored in `User.metadata.locale`)
2. Tenant default (stored in `Tenant.settings.locale`)
3. Browser `Accept-Language` header
4. Fallback: `fr`

---

## 19. Testing Strategy

### Test Pyramid

| Layer | Tool | What | Coverage Target |
|-------|------|------|-----------------|
| **Unit** | pytest | Service functions, calculators, validators | 80%+ |
| **Integration** | pytest + httpx (TestClient) | API endpoints with real DB | Every endpoint |
| **E2E** | Puppeteer / Playwright | Full user workflows via browser | Critical paths (P0 workflows) |
| **API contract** | pytest | Request/response schema validation | All endpoints |
| **RBAC** | pytest | Permission checks (can/cannot access) | Every role x every endpoint |

### Backend Testing (pytest)

```python
# conftest.py — test fixtures
@pytest.fixture
def test_db():
    """Fresh PostgreSQL database per test session (via testcontainers)"""

@pytest.fixture
def tenant(test_db):
    """Default tenant with school workspace config"""

@pytest.fixture
def teacher(tenant):
    """Teacher user with standard permissions"""

@pytest.fixture
def student(tenant):
    """Student user linked to a class"""

@pytest.fixture
def parent(tenant, student):
    """Parent user linked to student via Relationship"""
```

```python
# test_grades.py
async def test_teacher_can_create_grade(client, teacher, student, assessment):
    response = await client.post("/api/v1/grades", json={
        "assessment_id": assessment.id,
        "student_id": student.id,
        "score": 15.0
    }, headers=auth_headers(teacher))
    assert response.status_code == 201
    assert response.json()["data"]["score"] == 15.0

async def test_student_cannot_create_grade(client, student, assessment):
    response = await client.post("/api/v1/grades", json={...},
        headers=auth_headers(student))
    assert response.status_code == 403

async def test_teacher_cannot_access_other_tenant(client, teacher, other_tenant_assessment):
    response = await client.post("/api/v1/grades", json={
        "assessment_id": other_tenant_assessment.id, ...
    }, headers=auth_headers(teacher))
    assert response.status_code == 404  # tenant isolation
```

### Frontend Testing

| Tool | Scope |
|------|-------|
| Vitest | Unit tests for hooks, utils, calculators |
| React Testing Library | Component rendering + interaction |
| MSW (Mock Service Worker) | API mocking for integration tests |
| Playwright | E2E browser tests |

### E2E Test Scenarios (mapped to workflows)

| Test | Workflow | What it validates |
|------|----------|-------------------|
| `e2e/auth.spec.ts` | W1 | Login → dashboard → correct role sidebar |
| `e2e/roll-call.spec.ts` | W4 | Teacher opens session → marks absent → parent gets alert |
| `e2e/grades.spec.ts` | W6, W7 | Teacher enters grades → publishes → student sees them |
| `e2e/booking.spec.ts` | W15 | Parent books tutoring session → tutor sees it |
| `e2e/messaging.spec.ts` | W3 | Send message → recipient sees it in inbox |

### CI Pipeline

```yaml
# .github/workflows/ci.yml
- name: Lint (ruff + eslint)
- name: Type check (mypy + tsc)
- name: Unit tests (pytest + vitest) — parallel
- name: Integration tests (pytest with test DB)
- name: E2E tests (Playwright against Docker Compose stack)
- name: Security scan (trivy for Docker images, bandit for Python)
- name: Build Docker images
```

### Test Data Seeding

- `scripts/seed.py` — creates a realistic school with:
  - 1 tenant, 1 campus, 1 academic year, 3 terms
  - 8 classes (6e to 3e, 2 sections each)
  - 15 teachers, 200 students, 150 parents
  - Subjects, timetable, sample grades, attendance records
- Used for: development, demos, E2E tests, screenshots

---

## 20. API Versioning & Rate Limiting

### API Versioning

- **URL-based:** `/api/v1/...` (current), `/api/v2/...` (future)
- **Policy:** v1 supported for 12 months after v2 launch
- **Breaking changes** require new version; additive changes (new fields, new endpoints) are non-breaking
- **OpenAPI spec** auto-generated from Pydantic schemas: `/api/v1/docs` (Swagger UI)

### Rate Limiting

Implemented via Redis + `slowapi` (or custom middleware).

| Endpoint Group | Limit | Window | Reason |
|----------------|-------|--------|--------|
| `POST /auth/login` | 5 requests | 1 minute | Brute-force protection |
| `POST /auth/forgot-password` | 3 requests | 15 minutes | Abuse prevention |
| `POST /files/upload` | 10 requests | 1 minute | Storage abuse |
| All authenticated endpoints | 100 requests | 1 minute | General protection |
| Webhook/callback endpoints | 30 requests | 1 minute | Integration abuse |

Response on limit exceeded: `429 Too Many Requests` with `Retry-After` header.

---

## 21. Monitoring & Observability

### Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Metrics** | Prometheus + Grafana | API latency, error rates, DB pool, queue depth |
| **Logging** | Structured JSON logs → Loki (or stdout for Docker) | Request tracing, error debugging |
| **Tracing** | OpenTelemetry (optional, for production) | Cross-service request tracking |
| **Uptime** | Health check endpoint `/api/health` | Load balancer + external monitoring |
| **Alerting** | Grafana alerts → email/Slack | Error rate spikes, DB connection exhaustion, queue backup |

### Health Check

```json
GET /api/health
{
  "status": "healthy",
  "version": "1.2.0",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok",
    "celery": "ok"
  }
}
```

### Key Metrics

- `http_requests_total` — by method, path, status code
- `http_request_duration_seconds` — p50, p95, p99
- `db_pool_size` / `db_pool_checkedout` — connection pool health
- `celery_tasks_total` — by task name, status (success/failure)
- `active_websocket_connections` — per tenant

---

## 22. Deployment

### Local Development (Docker Compose)

```yaml
# docker-compose.yml
services:
  web:          # React dev server (Vite, hot reload)
    build: ./apps/web
    ports: ["5173:5173"]
    volumes: ["./apps/web/src:/app/src"]

  api:          # FastAPI with uvicorn --reload
    build: ./apps/api
    ports: ["8000:8000"]
    volumes: ["./apps/api/app:/app/app"]
    environment:
      DATABASE_URL: postgresql://edulia:edulia@db:5432/edulia
      REDIS_URL: redis://redis:6379/0
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: edulia
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      JWT_SECRET: dev-secret-change-in-prod

  db:           # PostgreSQL 16
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: edulia
      POSTGRES_USER: edulia
      POSTGRES_PASSWORD: edulia

  redis:        # Redis 7
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:        # S3-compatible storage
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]

  worker:       # Celery worker
    build: ./apps/api
    command: celery -A worker.worker worker -l info
    environment: *api-env  # same env as api

  socketio:     # Socket.IO server for real-time
    build: ./apps/socketio
    ports: ["3001:3001"]
    environment:
      REDIS_URL: redis://redis:6379/1

volumes:
  pgdata:
  miniodata:
```

**One command:** `docker compose up` → full stack running at `localhost:5173`

### Production — Cloud / Dedicated VM

#### Option A: Single VM (small school, < 500 users)

```
VM (4 vCPU, 8 GB RAM, 100 GB SSD) — OVH/Scaleway/Hetzner (~€30/month)
├── Docker Compose (production config)
├── Nginx (reverse proxy + SSL via Let's Encrypt)
├── PostgreSQL (in Docker or managed)
├── Redis (in Docker)
├── MinIO (in Docker, data on attached volume)
├── Certbot (auto-renew SSL)
└── Watchtower (auto-update Docker images)
```

```yaml
# docker-compose.prod.yml additions
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infra/nginx/ssl:/etc/nginx/ssl
      - certbot-data:/var/www/certbot

  api:
    environment:
      DATABASE_URL: postgresql://edulia:${DB_PASSWORD}@db:5432/edulia
      JWT_SECRET: ${JWT_SECRET}  # from .env, long random string
      CORS_ORIGINS: https://school.example.com
      SENTRY_DSN: ${SENTRY_DSN}  # error tracking
    deploy:
      resources:
        limits: { cpus: "2", memory: "2G" }
```

**Nginx config highlights:**
```nginx
server {
    listen 443 ssl http2;
    server_name school.example.com;

    # SSL
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://web:80;
    }

    # API
    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://socketio:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # File uploads — increase limit
    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}
```

#### Option B: Cloud SaaS (multi-tenant, managed services)

```
Cloud Provider (AWS eu-west-3 Paris / Scaleway / OVH)
├── Container orchestration: Docker Swarm or K3s (lightweight Kubernetes)
├── Database: Managed PostgreSQL (RDS / Scaleway Managed DB)
├── Cache: Managed Redis (ElastiCache / Scaleway Managed Redis)
├── Storage: S3 (native) or Scaleway Object Storage
├── CDN: CloudFront or Cloudflare (static assets)
├── Email: Brevo (ex-Sendinblue) — EU-based, GDPR compliant
├── Monitoring: Grafana Cloud or self-hosted Prometheus + Grafana
├── CI/CD: GitHub Actions → build → push to registry → deploy
└── DNS: Cloudflare (wildcard *.edulia.app for tenant subdomains)
```

**Tenant routing:**
- Each tenant gets: `{slug}.edulia.app` (e.g., `saint-joseph.edulia.app`)
- Nginx resolves slug → tenant_id via Redis cache
- Or custom domain: school sets CNAME `ecole.saint-joseph.fr → saint-joseph.edulia.app`

#### Backup Strategy

| What | How | Frequency | Retention |
|------|-----|-----------|-----------|
| PostgreSQL | `pg_dump` → compressed → S3 | Daily (2 AM) | 30 days |
| PostgreSQL | WAL archiving for point-in-time recovery | Continuous | 7 days |
| File storage (MinIO/S3) | Cross-region replication | Continuous | Indefinite |
| Redis | RDB snapshots | Hourly | 24 hours |
| Full system | Docker volumes backup | Weekly | 4 weeks |

**Disaster recovery:**
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 1 hour (WAL archiving)
- Restore procedure documented and tested quarterly

---

## 23. Environment Variables

```env
# .env.example — all required configuration
# === Core ===
APP_NAME=Edulia
APP_ENV=production          # development | staging | production
APP_URL=https://school.example.com
APP_PORT=8000

# === Database ===
DATABASE_URL=postgresql://edulia:password@db:5432/edulia
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# === Redis ===
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
SOCKETIO_REDIS_URL=redis://redis:6379/2

# === Auth ===
JWT_SECRET=change-me-to-64-char-random-string
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# === Storage ===
S3_ENDPOINT=https://s3.eu-west-3.amazonaws.com  # or http://minio:9000
S3_BUCKET=edulia-files
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_REGION=eu-west-3

# === Email ===
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=noreply@edulia.app

# === Payments (optional) ===
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# === Monitoring (optional) ===
SENTRY_DSN=https://...@sentry.io/...
PROMETHEUS_ENABLED=true

# === DocuSeal (e-signature) ===
DOCUSEAL_URL=http://docuseal:3000
DOCUSEAL_API_KEY=...

# === ClamAV (virus scanning) ===
CLAMAV_HOST=clamav
CLAMAV_PORT=3310

# === Jitsi (video conferencing) ===
JITSI_DOMAIN=meet.jit.si           # or self-hosted domain
JITSI_APP_ID=                       # optional, for JWT auth on self-hosted

# === Push Notifications ===
VAPID_PUBLIC_KEY=...                # generated with pywebpush
VAPID_PRIVATE_KEY=...
VAPID_MAILTO=mailto:admin@edulia.app

# === RGPD ===
DATA_RETENTION_YEARS=3
GDPR_DPO_EMAIL=dpo@school.example.com
```

---

## 24. White-Label Branding

Tenants see their own identity (name, logo, colors) — not "Edulia". The `branding` JSONB on the Tenant model (section 1.1) drives everything below.

### 24.1 Frontend: CSS Custom Properties

On app load, the `useTenantBranding()` hook reads `tenant.branding` and injects CSS custom properties on `<html>`:

```typescript
// src/hooks/useTenantBranding.ts
export function useTenantBranding(branding: TenantBranding) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primary_color);
    root.style.setProperty('--brand-secondary', branding.secondary_color);
    root.style.setProperty('--brand-accent', branding.accent_color);

    // Favicon
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (link && branding.favicon_url) link.href = branding.favicon_url;

    // Document title
    document.title = branding.display_name || 'Edulia';
  }, [branding]);
}
```

shadcn/ui components already use CSS variables — map brand vars into the Tailwind theme:

```css
/* src/styles/brand.css */
:root {
  --primary: var(--brand-primary, #1B4F72);
  --secondary: var(--brand-secondary, #F39C12);
  --accent: var(--brand-accent, #27AE60);
}
```

### 24.2 "Powered by Edulia" Logic

Visibility depends on `subscription_plan`:

| Plan | `show_powered_by` default | Can override? |
|------|--------------------------|---------------|
| free | `true` (forced) | No |
| pro | `true` | Yes — admin can hide |
| enterprise | `false` | Already hidden |

```tsx
// src/components/layout/PoweredBy.tsx
function PoweredBy() {
  const { subscription_plan, branding } = useTenant();

  if (subscription_plan === 'enterprise') return null;
  if (subscription_plan === 'pro' && !branding.show_powered_by) return null;

  return (
    <footer className="text-xs text-muted-foreground text-center py-2">
      Powered by <a href="https://edulia.app">Edulia</a>
    </footer>
  );
}
```

### 24.3 Login Page Theming

The login page renders tenant branding before authentication:

1. Resolve tenant from subdomain or custom domain (see 24.4)
2. Fetch `GET /api/tenants/branding` (public, unauthenticated endpoint)
3. Render: tenant logo, `login_welcome_text`, `login_background_url`, branded colors

```
┌─────────────────────────────────────────────────┐
│                                                 │
│        [Tenant Logo]                            │
│                                                 │
│   "Bienvenue sur l'espace numérique de          │
│    l'École Saint-Joseph"                        │
│                                                 │
│   ┌───────────────────────────┐                 │
│   │  Email                    │                 │
│   ├───────────────────────────┤                 │
│   │  Password                 │                 │
│   ├───────────────────────────┤                 │
│   │  [Se connecter]  (brand)  │                 │
│   └───────────────────────────┘                 │
│                                                 │
│   Mot de passe oublié ?                         │
│                                                 │
│   ─── Powered by Edulia ───                    │
└─────────────────────────────────────────────────┘
```

Backend endpoint:
```
GET /api/tenants/branding
→ Resolved from Host header (subdomain or custom_domain)
→ Returns: { display_name, logo_url, primary_color, login_background_url, login_welcome_text }
→ No auth required — this is the only public tenant endpoint
```

### 24.4 Custom Domain Routing

Tenants on `pro` or `enterprise` plans can set a custom domain (e.g. `ecole.saint-joseph.fr`).

**Nginx routing:**
```nginx
# Default: subdomain routing
server {
    server_name ~^(?<tenant_slug>[^.]+)\.edulia\.app$;
    # proxy_pass to app with X-Tenant-Slug header
    proxy_set_header X-Tenant-Slug $tenant_slug;
    proxy_pass http://app:8000;
}

# Custom domains: catch-all, resolve via DB lookup
server {
    server_name _;
    listen 443 ssl;

    # Backend resolves tenant from Host header against custom_domain column
    proxy_set_header X-Forwarded-Host $host;
    proxy_pass http://app:8000;
}
```

**Backend resolution order (middleware):**
1. JWT `tenant_id` claim (authenticated requests)
2. `X-Tenant-Slug` header (subdomain routing via Nginx)
3. `Host` header lookup against `Tenant.custom_domain` (custom domain)
4. Fail → 404

**SSL for custom domains:** Use Let's Encrypt with wildcard cert for `*.edulia.app`. For custom domains, use Caddy or certbot with DNS-01 challenge, provisioned on first request.

### 24.5 Email Branding

All transactional emails use the tenant's branding:

```html
<!-- templates/email/base.html (Jinja2) -->
<table style="max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="background: {{ branding.primary_color }}; padding: 20px; text-align: center;">
      <img src="{{ branding.email_header_logo_url or branding.logo_url }}" height="40" />
    </td>
  </tr>
  <tr>
    <td style="padding: 24px;">
      {% block content %}{% endblock %}
    </td>
  </tr>
  <tr>
    <td style="padding: 12px; text-align: center; font-size: 12px; color: #999;">
      {{ branding.footer_text }}
      {% if show_powered_by %}
        <br/>Propulsé par <a href="https://edulia.app">Edulia</a>
      {% endif %}
    </td>
  </tr>
</table>
```

### 24.6 Admin Branding Settings Page

Admin → Settings → Branding:
- Upload logo (max 500KB, PNG/SVG)
- Upload favicon (max 100KB, ICO/PNG)
- Pick primary / secondary / accent colors (color picker)
- Edit display name, footer text, login welcome text
- Upload login background image (max 2MB, JPG/PNG)
- Toggle "Powered by Edulia" (pro plan only — grayed out for free)
- Set custom domain (pro/enterprise — triggers SSL provisioning)

Live preview shown alongside the form.

---

## 25. Cross-Cutting Concerns

### 25.1 Timezone Strategy

**Rule:** Store everything in UTC. Display in tenant's timezone.

| Layer | Behavior |
|-------|----------|
| Database | All `timestamp` columns are `TIMESTAMP WITH TIME ZONE`, stored as UTC |
| Backend | All `datetime` objects are timezone-aware UTC (`datetime.now(UTC)`) |
| API | All dates serialized as ISO 8601 with `Z` suffix: `2026-03-01T14:30:00Z` |
| Frontend | Convert to tenant timezone on display using `date-fns-tz` |

```typescript
// src/lib/date.ts
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

export function formatDateTime(iso: string, tz: string = 'Europe/Paris') {
  return formatInTimeZone(new Date(iso), tz, 'dd/MM/yyyy HH:mm', { locale: fr });
}
```

The tenant's timezone comes from `tenant.settings.timezone` (default: `Europe/Paris`). Users can optionally override in their profile settings.

### 25.2 Avatar & Image Handling

**Upload flow:**
1. User uploads image via `POST /api/files/upload` (max 5MB, JPG/PNG/WebP)
2. ClamAV scans the file
3. Backend generates thumbnails using Pillow:
   - `avatar_sm`: 64×64 (sidebar, lists)
   - `avatar_md`: 128×128 (profile card)
   - `avatar_lg`: 256×256 (profile page)
4. All variants stored in S3 under `tenants/{tenant_id}/avatars/{user_id}/`
5. `User.avatar_url` stores the base path; frontend appends size suffix

```python
# backend/app/services/image.py
from PIL import Image
import io

AVATAR_SIZES = {"sm": (64, 64), "md": (128, 128), "lg": (256, 256)}

def generate_avatars(file_bytes: bytes) -> dict[str, bytes]:
    results = {}
    img = Image.open(io.BytesIO(file_bytes))
    img = img.convert("RGB")
    for suffix, size in AVATAR_SIZES.items():
        resized = img.copy()
        resized.thumbnail(size, Image.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format="WEBP", quality=80)
        results[suffix] = buf.getvalue()
    return results
```

**Default avatars:** Generated using initials + deterministic background color (hash of user ID).

```python
def default_avatar_color(user_id: str) -> str:
    colors = ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C"]
    return colors[hash(user_id) % len(colors)]
```

### 25.3 Rich Text Sanitization

Tiptap outputs HTML. All user-generated HTML is sanitized before storage **and** before rendering.

**Backend (on write):**
```python
# backend/app/utils/sanitize.py
import bleach

ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
    "h1", "h2", "h3", "blockquote", "code", "pre", "img", "table",
    "thead", "tbody", "tr", "th", "td", "hr",
]
ALLOWED_ATTRS = {
    "a": ["href", "title", "target"],
    "img": ["src", "alt", "width", "height"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan"],
}

def sanitize_html(html: str) -> str:
    return bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)
```

**Frontend (on render):**
```typescript
// src/components/RichTextDisplay.tsx
import DOMPurify from 'dompurify';

export function RichTextDisplay({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'img', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'width', 'height',
      'colspan', 'rowspan'],
  });
  return <div className="prose" dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**Rule:** Double sanitization (backend + frontend) is intentional — defense in depth. The backend is the authority; the frontend is a safety net for any data that bypassed the API.

---

## 26. Behavioral Conventions

Clarifications for recurring questions across modules.

### 26.1 Late Submission Logic

Submissions are auto-flagged `late` if `submitted_at > homework.due_date`. No manual intervention needed. Backend sets status on create:
```python
status = "late" if datetime.now(UTC) > homework.due_date else "submitted"
```

### 26.2 Grading Scale

`tenant.settings.grading_scale` (default: `20`) and `grading_type` (default: `"numeric"`) control all grade entry and display.

| `grading_type` | Scale | Display | Average calculation |
|----------------|-------|---------|---------------------|
| `numeric` | `/20` (configurable) | `14.5/20` | Weighted arithmetic mean |
| `letter` | A-F | `B+` | Mapped to GPA: A=4, B=3, C=2, D=1, F=0 |
| `competency` | LSU levels | `Satisfaisant` | No numeric average; per-domain summary |

If a school changes grading scale mid-year, existing grades are **not** retroactively converted. New grades use the new scale. Reports show the scale used at time of entry.

### 26.3 Rich Text vs Plain Text Fields

| Field | Type | Why |
|-------|------|-----|
| Message body | Rich text (Tiptap HTML) | Teachers send formatted instructions |
| Homework description | Rich text | Embedded images, lists, links |
| Grade comment | **Plain text** | Short teacher notes (1-2 sentences) |
| Report card comment | **Plain text** | Formal, printed on PDF |
| Session content (cahier de textes) | Rich text | Lesson summaries with formatting |
| Learning plan notes | Rich text | Tutor notes with structure |

### 26.4 Tenant Defaults on Creation

When a new tenant is created, the system seeds:
- Default branding (Edulia logo, blue theme, `show_powered_by: true`)
- Default settings (France timezone, French locale, EUR currency, grading /20)
- Default roles (admin, teacher, student, parent) with preset permissions
- Competency framework (Socle commun) if `type = school`
- The creating user gets the `admin` role

### 26.5 Recurrence Format

Recurring events (timetable sessions, tutoring slots) use **iCalendar RRULE** format:
```
RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260630T235959Z
```
Stored as text in `recurrence_rule` column. Parsed with `python-dateutil.rrule` (backend) and `rrule` npm package (frontend). Individual exceptions stored in `SessionException` table.

### 26.6 Multi-Campus Rules

- A student belongs to **one campus** at a time (via `Group.campus_id`)
- A teacher can teach across campuses (sessions reference rooms, rooms reference campus)
- Student transfer between campuses = admin moves student to new group. Grade history follows the student (grade → student_id, not group-dependent)
- Each campus can have its own rooms, but subjects and academic years are tenant-wide

### 26.7 Cancellation & Refund Policy (Tutoring)

| Scenario | Hours credited? | Invoice impact |
|----------|----------------|----------------|
| Cancelled ≥ 24h before (configurable) | Yes, credited back | Not invoiced |
| Cancelled < 24h before | No | Invoiced |
| No-show (student) | No | Invoiced |
| No-show (tutor) | Yes, credited back | Not invoiced |
| Session completed | Deducted from package | Invoiced |

Hours are deducted from package **on session completion** (not on booking). This prevents overbooking edge cases. If no package exists, session is billed individually at the tutor's hourly rate.
