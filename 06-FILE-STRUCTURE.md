# 06 — File Structure (Full Repo Map)

Monorepo. Clear boundaries: frontend, backend, shared, infra.

---

## Root

```
educore/
├── README.md
├── LICENSE                        # AGPL-3.0
├── .env.example
├── .gitignore
├── docker-compose.yml             # local dev
├── docker-compose.prod.yml        # production
├── Makefile                       # dev shortcuts (make dev, make test, make seed)
├── docs/                          # project documentation (00-07 markdown files)
├── packages/shared/               # shared types + constants
├── apps/web/                      # React frontend
├── apps/api/                      # FastAPI backend
├── apps/socketio/                 # Socket.IO real-time server
├── infra/                         # deployment configs
├── scripts/                      # utility scripts
├── e2e/                           # end-to-end browser tests
└── .github/workflows/             # CI/CD pipelines
```

---

## Shared Contracts: `packages/shared/`

```
packages/shared/src/
├── types/
│   ├── index.ts
│   ├── user.ts                 # User, Role, UserRole, Relationship
│   ├── group.ts                # Group, GroupMembership
│   ├── session.ts              # Session, Room, SessionException
│   ├── grade.ts                # Assessment, Grade, GradeCategory, ReportCard
│   ├── attendance.ts           # AttendanceRecord
│   ├── homework.ts             # SessionContent, Homework, Submission
│   ├── quiz.ts                 # Quiz, Question, Answer, QuizAttempt
│   ├── message.ts              # Thread, Message, ThreadParticipant
│   ├── notification.ts         # Notification
│   ├── file.ts                 # File
│   ├── billing.ts              # Invoice, Payment
│   ├── tutoring.ts             # TutoringSession, Package, LearningPlan
│   ├── school-life.ts          # Incident, Sanction, ExitAuthorization
│   ├── enrollment.ts           # EnrollmentForm, EnrollmentSubmission
│   ├── calendar.ts             # CalendarEvent
│   └── common.ts               # Pagination, ApiError, enums
├── constants/
│   ├── index.ts
│   ├── roles.ts                # ADMIN, TEACHER, STUDENT, PARENT, TUTOR...
│   ├── permissions.ts          # module.entity.action patterns
│   ├── modules.ts              # timetable, attendance, gradebook...
│   └── workspace-configs.ts    # school defaults, tutoring defaults
└── openapi/
    └── openapi.yaml
```

---

## Frontend: `apps/web/`

```
apps/web/src/
├── main.tsx
├── App.tsx
│
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   └── guards/
│       ├── AuthGuard.tsx
│       ├── RoleGuard.tsx
│       └── ModuleGuard.tsx
│
├── api/                            # API client functions
│   ├── client.ts                   # axios instance + interceptors
│   ├── auth.ts
│   ├── users.ts
│   ├── groups.ts
│   ├── sessions.ts
│   ├── attendance.ts
│   ├── grades.ts
│   ├── homework.ts
│   ├── quizzes.ts
│   ├── messages.ts
│   ├── notifications.ts
│   ├── files.ts
│   ├── billing.ts
│   ├── tutoring.ts
│   ├── tenant.ts
│   ├── enrollment.ts
│   ├── school_life.ts
│   ├── calendar.ts
│   ├── report_cards.ts
│   └── competencies.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useCurrentUser.ts
│   ├── usePermission.ts
│   ├── useModule.ts
│   ├── useNotifications.ts
│   ├── usePagination.ts
│   ├── useTimetable.ts
│   ├── useGrades.ts
│   ├── useAttendance.ts
│   ├── useMessages.ts
│   ├── useTutoringBooking.ts
│   └── useTenantBranding.ts       # CSS custom properties from tenant config
│
├── stores/
│   ├── authStore.ts
│   ├── notificationStore.ts
│   ├── uiStore.ts
│   └── tenantStore.ts
│
├── components/
│   ├── ui/                         # design system
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Tabs.tsx
│   │   ├── Toast.tsx
│   │   ├── Spinner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Pagination.tsx
│   │   └── RichTextEditor.tsx
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── MobileNav.tsx
│   │   ├── Breadcrumb.tsx
│   │   └── PoweredBy.tsx            # "Powered by EduCore" conditional footer
│   ├── common/
│   │   ├── NotificationPanel.tsx
│   │   ├── UserMenu.tsx
│   │   ├── ChildSelector.tsx
│   │   ├── FileUpload.tsx
│   │   ├── SearchBar.tsx
│   │   ├── CalendarWidget.tsx
│   │   └── RichTextDisplay.tsx      # DOMPurify-sanitized HTML renderer
│   └── charts/
│       ├── GradeChart.tsx
│       ├── AttendanceChart.tsx
│       └── ProgressChart.tsx
│
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   └── AcceptInvitePage.tsx
│   │   └── components/
│   │       └── LoginForm.tsx
│   │
│   ├── dashboard/
│   │   ├── pages/
│   │   │   └── DashboardPage.tsx
│   │   └── components/
│   │       ├── TeacherDashboard.tsx
│   │       ├── StudentDashboard.tsx
│   │       ├── ParentDashboard.tsx
│   │       ├── AdminDashboard.tsx
│   │       ├── TutorDashboard.tsx
│   │       └── widgets/
│   │           ├── TodaySchedule.tsx
│   │           ├── RecentGrades.tsx
│   │           ├── HomeworkDue.tsx
│   │           ├── UnreadMessages.tsx
│   │           └── AlertsWidget.tsx
│   │
│   ├── timetable/
│   │   ├── pages/
│   │   │   └── TimetablePage.tsx
│   │   └── components/
│   │       ├── WeekView.tsx
│   │       ├── MonthView.tsx
│   │       ├── SessionCard.tsx
│   │       └── SessionDetail.tsx
│   │
│   ├── attendance/
│   │   ├── pages/
│   │   │   ├── RollCallPage.tsx
│   │   │   └── AttendanceReportPage.tsx
│   │   └── components/
│   │       ├── RollCallGrid.tsx
│   │       ├── AbsenceJustifyForm.tsx
│   │       └── AttendanceSummary.tsx
│   │
│   ├── gradebook/
│   │   ├── pages/
│   │   │   ├── GradeEntryPage.tsx
│   │   │   ├── MyGradesPage.tsx
│   │   │   └── ChildGradesPage.tsx
│   │   └── components/
│   │       ├── GradeGrid.tsx
│   │       ├── GradeCard.tsx
│   │       ├── AverageDisplay.tsx
│   │       └── GradeStats.tsx
│   │
│   ├── homework/
│   │   ├── pages/
│   │   │   ├── CahierDeTextesPage.tsx
│   │   │   ├── HomeworkListPage.tsx
│   │   │   └── SubmissionPage.tsx
│   │   └── components/
│   │       ├── SessionContentForm.tsx
│   │       ├── HomeworkCard.tsx
│   │       ├── SubmissionForm.tsx
│   │       └── SubmissionReview.tsx
│   │
│   ├── quizzes/
│   │   ├── pages/
│   │   │   ├── QuizBuilderPage.tsx
│   │   │   ├── QuizTakePage.tsx
│   │   │   └── QuizResultsPage.tsx
│   │   └── components/
│   │       ├── QuestionEditor.tsx
│   │       ├── QuestionDisplay.tsx
│   │       └── QuizStats.tsx
│   │
│   ├── school-life/
│   │   ├── pages/
│   │   │   ├── VieScolarirePage.tsx
│   │   │   └── IncidentDetailPage.tsx
│   │   └── components/
│   │       ├── AbsenceList.tsx
│   │       ├── SanctionList.tsx
│   │       └── IncidentForm.tsx
│   │
│   ├── messaging/
│   │   ├── pages/
│   │   │   └── MessagesPage.tsx
│   │   └── components/
│   │       ├── ThreadList.tsx
│   │       ├── ThreadView.tsx
│   │       ├── ComposeMessage.tsx
│   │       └── MessageBubble.tsx
│   │
│   ├── files/
│   │   ├── pages/
│   │   │   └── FileBrowserPage.tsx
│   │   └── components/
│   │       ├── FolderTree.tsx
│   │       ├── FileGrid.tsx
│   │       └── FilePreview.tsx
│   │
│   ├── billing/
│   │   ├── pages/
│   │   │   ├── InvoicesPage.tsx
│   │   │   ├── PaymentPage.tsx
│   │   │   └── BillingAdminPage.tsx
│   │   └── components/
│   │       ├── InvoiceCard.tsx
│   │       ├── PaymentForm.tsx
│   │       └── BillingSummary.tsx
│   │
│   ├── enrollment/
│   │   ├── pages/
│   │   │   ├── EnrollmentFormPage.tsx
│   │   │   └── EnrollmentAdminPage.tsx
│   │   └── components/
│   │       ├── DynamicForm.tsx
│   │       ├── DocumentUploadChecklist.tsx
│   │       └── EnrollmentReview.tsx
│   │
│   ├── calendar/
│   │   ├── pages/
│   │   │   └── CalendarPage.tsx
│   │   └── components/
│   │       ├── MonthCalendar.tsx
│   │       └── EventCard.tsx
│   │
│   ├── report-cards/
│   │   ├── pages/
│   │   │   ├── ReportCardPage.tsx
│   │   │   └── ReportCardAdminPage.tsx
│   │   └── components/
│   │       ├── ReportCardView.tsx
│   │       ├── SubjectRow.tsx
│   │       └── ReportCardPDF.tsx
│   │
│   ├── tutoring/                   # tutoring-specific features
│   │   ├── pages/
│   │   │   ├── TutorCalendarPage.tsx
│   │   │   ├── BookingPage.tsx
│   │   │   ├── LearningPlanPage.tsx
│   │   │   ├── PackagesPage.tsx
│   │   │   └── TutoringBillingPage.tsx
│   │   └── components/
│   │       ├── AvailabilityGrid.tsx
│   │       ├── BookingForm.tsx
│   │       ├── SessionNotes.tsx
│   │       ├── ProgressTimeline.tsx
│   │       ├── PackageCard.tsx
│   │       └── PackageBalance.tsx
│   │
│   ├── admin/
│   │   ├── pages/
│   │   │   ├── UsersPage.tsx
│   │   │   ├── UserDetailPage.tsx
│   │   │   ├── ClassesPage.tsx
│   │   │   ├── SubjectsPage.tsx
│   │   │   ├── AcademicYearPage.tsx
│   │   │   ├── RolesPage.tsx
│   │   │   ├── TenantSettingsPage.tsx
│   │   │   └── AuditLogPage.tsx
│   │   └── components/
│   │       ├── UserForm.tsx
│   │       ├── ClassForm.tsx
│   │       ├── ImportCSV.tsx
│   │       └── AuditLogTable.tsx
│   │
│   └── settings/
│       └── pages/
│           └── SettingsPage.tsx
│
├── locales/                       # i18n translation files
│   ├── fr/
│   │   ├── common.json            # shared UI strings
│   │   ├── auth.json
│   │   ├── dashboard.json
│   │   ├── timetable.json
│   │   ├── attendance.json
│   │   ├── gradebook.json
│   │   ├── homework.json
│   │   ├── quizzes.json
│   │   ├── messaging.json
│   │   ├── billing.json
│   │   ├── tutoring.json
│   │   ├── admin.json
│   │   └── errors.json
│   └── en/
│       ├── common.json
│       ├── auth.json
│       └── ...                    # same structure as fr/
│
├── i18n.ts                        # i18next configuration
│
├── lib/
│   └── date.ts                    # date-fns-tz formatters (tenant timezone)
│
└── styles/
    ├── globals.css
    ├── brand.css                   # CSS custom properties for tenant branding
    └── theme.ts
```

---

## Backend: `apps/api/`

```
apps/api/
├── pyproject.toml
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/                   # migration files
│
├── app/
│   ├── main.py                     # FastAPI app, startup, middleware
│   ├── config.py                   # settings from env
│   │
│   ├── core/
│   │   ├── security.py             # JWT, password hashing
│   │   ├── permissions.py          # RBAC enforcement
│   │   ├── dependencies.py         # get_current_user, get_db, etc.
│   │   ├── exceptions.py           # custom exceptions + handlers
│   │   ├── pagination.py           # paginate helper
│   │   └── middleware.py           # tenant resolution, logging
│   │
│   ├── db/
│   │   ├── database.py             # engine, session factory
│   │   ├── base.py                 # Base model class
│   │   └── models/                 # SQLAlchemy models
│   │       ├── __init__.py
│   │       ├── user.py             # User, Role, UserRole, Relationship
│   │       ├── tenant.py           # Tenant, Campus, AcademicYear, Term
│   │       ├── group.py            # Group, GroupMembership
│   │       ├── subject.py          # Subject
│   │       ├── session.py          # Session, Room, SessionException
│   │       ├── attendance.py       # AttendanceRecord
│   │       ├── grade.py            # GradeCategory, Assessment, Grade
│   │       ├── report_card.py      # ReportCard, ReportCardSubject
│   │       ├── homework.py         # SessionContent, Homework, Submission
│   │       ├── quiz.py             # Quiz, Question, Answer, QuizAttempt
│   │       ├── message.py          # Thread, ThreadParticipant, Message
│   │       ├── notification.py     # Notification
│   │       ├── file.py             # File
│   │       ├── billing.py          # Invoice, Payment
│   │       ├── school_life.py      # Incident, Sanction, ExitAuthorization
│   │       ├── enrollment.py       # EnrollmentForm, EnrollmentSubmission
│   │       ├── calendar.py         # CalendarEvent
│   │       ├── tutoring.py         # TutoringSession, TutorProfile, etc.
│   │       ├── package.py          # Package, StudentPackage
│   │       ├── learning_plan.py    # LearningPlan, LearningPlanEntry
│   │       ├── competency.py      # Competency, CompetencyEvaluation (LSU/LSL)
│   │       └── audit.py            # AuditLog
│   │
│   ├── modules/                    # business logic + routes per module
│   │   ├── auth/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py          # Pydantic request/response
│   │   ├── users/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── groups/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── timetable/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── attendance/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── gradebook/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── calculator.py       # average calculation logic
│   │   ├── homework/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── quizzes/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── grader.py           # auto-grading logic
│   │   ├── school_life/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── messaging/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── notifications/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── engine.py           # notification dispatch logic
│   │   ├── files/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── storage.py          # S3/MinIO abstraction
│   │   ├── billing/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── stripe.py           # payment provider
│   │   ├── enrollment/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── calendar/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── report_cards/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── pdf_generator.py
│   │   ├── tutoring/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── booking_engine.py   # availability + conflict checks
│   │   ├── packages/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── learning_plans/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── tenant/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── competencies/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── gdpr/
│   │   │   ├── router.py             # export, delete, purge-check endpoints
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   └── audit/
│   │       ├── router.py
│   │       ├── service.py
│   │       └── schemas.py
│   │
│   ├── integrations/               # external service connectors
│   │   ├── microsoft/
│   │   │   ├── entra_sso.py       # OIDC SSO (later)
│   │   │   ├── scim.py            # user provisioning (later)
│   │   │   └── graph.py           # calendar sync (later)
│   │   ├── email/
│   │   │   └── sender.py          # Brevo (ex-Sendinblue) transactional email
│   │   ├── docuseal/
│   │   │   └── client.py          # e-signature API (create, check status)
│   │   ├── clamav/
│   │   │   └── scanner.py         # virus scan on file upload
│   │   ├── jitsi/
│   │   │   └── rooms.py           # generate video room URLs
│   │   ├── calendar/
│   │   │   └── ical.py            # iCal feed generation
│   │   ├── payments/
│   │   │   └── stripe.py          # Stripe checkout + webhooks
│   │   └── push/
│   │       └── webpush.py         # Web Push notifications (pywebpush)
│   │
│   ├── utils/
│   │   ├── sanitize.py            # bleach-based HTML sanitization
│   │   └── image.py               # avatar thumbnail generation (Pillow)
│   │
│   ├── templates/                  # Jinja2 templates (PDF + email)
│   │   ├── fr/
│   │   │   ├── report_card/
│   │   │   │   ├── bulletin.html
│   │   │   │   └── bulletin.css
│   │   │   ├── invoice/
│   │   │   │   ├── facture.html
│   │   │   │   └── facture.css
│   │   │   └── email/
│   │   │       ├── base.html          # email layout
│   │   │       ├── welcome.html
│   │   │       ├── password_reset.html
│   │   │       ├── invite.html
│   │   │       ├── absence_alert.html
│   │   │       ├── grade_notification.html
│   │   │       ├── session_reminder.html
│   │   │       └── invoice_sent.html
│   │   └── en/
│   │       └── ...                    # same structure
│   │
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_users.py
│       ├── test_attendance.py
│       ├── test_grades.py
│       └── ...
│
└── worker/
    ├── pyproject.toml
    ├── worker.py                   # Celery app
    └── jobs/
        ├── send_notification.py
        ├── generate_report_card_pdf.py
        ├── generate_invoice.py
        ├── send_reminder.py
        ├── export_data.py
        └── data_retention_purge.py   # GDPR auto-purge (daily cron)
```

---

## Socket.IO Server: `apps/socketio/`

```
apps/socketio/
├── package.json
├── Dockerfile
├── src/
│   ├── index.ts                   # Socket.IO server entry
│   ├── auth.ts                    # JWT validation for WebSocket connections
│   ├── redis.ts                   # Redis pub/sub subscriber
│   └── handlers/
│       ├── notifications.ts       # notification:new events
│       ├── messages.ts            # message:new events
│       └── presence.ts            # user online/offline tracking
```

---

## E2E Tests: `e2e/`

```
e2e/
├── playwright.config.ts
├── fixtures/
│   ├── auth.fixture.ts            # login helpers
│   └── seed.fixture.ts            # test data setup
├── tests/
│   ├── auth.spec.ts               # W1: login flow
│   ├── roll-call.spec.ts          # W4: teacher takes attendance
│   ├── grades.spec.ts             # W6+W7: enter + view grades
│   ├── homework.spec.ts           # W8+W9: assign + submit homework
│   ├── messaging.spec.ts          # W3: send + receive message
│   ├── booking.spec.ts            # W15: book tutoring session
│   ├── parent-portal.spec.ts      # parent dashboard + child view
│   └── admin-users.spec.ts        # user CRUD + invite flow
├── screenshots/                   # auto-captured on failure + for visual regression
└── reports/                       # HTML test reports
```

---

## Infrastructure: `infra/`

```
infra/
├── nginx/
│   ├── nginx.conf                 # reverse proxy config
│   ├── nginx.dev.conf             # local dev config
│   └── ssl/                       # SSL certs (gitignored)
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   ├── socketio.Dockerfile
│   └── worker.Dockerfile
├── monitoring/
│   ├── prometheus.yml             # metrics scrape config
│   ├── grafana/
│   │   ├── provisioning/
│   │   │   ├── dashboards/
│   │   │   │   ├── api-overview.json
│   │   │   │   ├── database.json
│   │   │   │   └── celery-tasks.json
│   │   │   └── datasources/
│   │   │       └── prometheus.yml
│   │   └── grafana.ini
│   └── alerting/
│       └── rules.yml              # alert rules (error rate, latency, disk)
├── backup/
│   ├── backup.sh                  # daily pg_dump + S3 upload
│   └── restore.sh                 # restore from backup
└── deploy/
    ├── setup-vm.sh                # initial VM setup (Docker, firewall, swap)
    └── update.sh                  # pull latest images + restart
```

---

## Scripts: `scripts/`

```
scripts/
├── seed.py                        # generate realistic test data
├── create-tenant.py               # CLI to create a new tenant
├── import-ecoledirecte.py         # import CSV data from Ecole Directe
├── generate-openapi.py            # export OpenAPI spec
├── migrate.sh                     # run Alembic migrations
└── reset-db.sh                    # drop + recreate DB (dev only)
```

---

## CI/CD: `.github/workflows/`

```
.github/workflows/
├── ci.yml                         # lint + typecheck + unit + integration tests
├── e2e.yml                        # E2E tests on Docker Compose stack
├── deploy-staging.yml             # auto-deploy to staging on main push
├── deploy-prod.yml                # manual deploy to production
└── security.yml                   # weekly dependency + container scan
```

---

## Key Architectural Rules

1. **Types in `packages/shared`** — single source of truth for frontend + API contract
2. **API client in `apps/web/src/api/`** — one file per module, thin wrappers
3. **Hooks in `apps/web/src/hooks/`** — business logic lives here, components stay dumb
4. **Features = vertical slices** — each feature folder has pages + components
5. **Backend modules = router + service + schemas** — router is thin, service has logic
6. **Models separate from modules** — all SQLAlchemy models in `db/models/`
7. **Guards for access control** — AuthGuard, RoleGuard, ModuleGuard wrap routes
8. **No cross-feature imports** — features only import from `components/`, `hooks/`, `api/`, `stores/`
9. **i18n keys, not hardcoded strings** — all user-facing text goes through i18next
10. **Every module has tests** — unit tests co-located with service, integration tests in `tests/`
11. **Docker-first** — everything runs in containers, no "works on my machine"
