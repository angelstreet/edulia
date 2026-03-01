# 06 — File Structure (Full Repo Map)

Monorepo. Clear boundaries: frontend, backend, shared, infra.

---

## Root

```
educore/
├── README.md
├── LICENSE
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── docs/
├── packages/shared/
├── apps/web/                   # React frontend
├── apps/api/                   # FastAPI backend
├── infra/
├── scripts/
└── .github/workflows/
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
│   └── tenant.ts
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
│   └── useTutoringBooking.ts
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
│   │   └── Breadcrumb.tsx
│   ├── common/
│   │   ├── NotificationPanel.tsx
│   │   ├── UserMenu.tsx
│   │   ├── ChildSelector.tsx
│   │   ├── FileUpload.tsx
│   │   ├── SearchBar.tsx
│   │   └── CalendarWidget.tsx
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
└── styles/
    ├── globals.css
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
│   │   └── audit/
│   │       ├── router.py
│   │       ├── service.py
│   │       └── schemas.py
│   │
│   ├── integrations/               # external services (later)
│   │   ├── microsoft/
│   │   │   ├── entra_sso.py
│   │   │   ├── scim.py
│   │   │   └── graph.py
│   │   └── email/
│   │       └── sender.py           # SMTP / SendGrid / SES
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
        └── export_data.py
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
