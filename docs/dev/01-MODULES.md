# 01 — Module Catalog

Every module is a self-contained feature set: UI pages + API endpoints + database tables. Modules are toggled ON/OFF per workspace via `Tenant.settings.enabled_modules`.

## Core (always on)

These are not toggleable — every workspace has them.

| Module | What it does | Status |
|---|---|---|
| **auth** | Login, JWT, password reset, invite flow | Built |
| **users** | User CRUD, roles, RBAC, CSV import | Built |
| **groups** | Classes/cohorts/teams, memberships | Built |
| **structure** | Campuses, academic years, terms | Built |
| **subjects** | Subject catalog with color coding | Built |
| **messaging** | Threaded conversations, compose, notifications | Built |
| **files** | Upload, storage, virus scan (ClamAV) | Built |
| **settings** | Tenant config, branding, module toggles | Built |
| **dashboards** | Role-based dashboard with widgets | Built |

## Toggleable Modules

### timetable — Scheduling

Weekly/monthly timetable with sessions, rooms, substitutions.

| Key | Detail |
|---|---|
| Tables | `Session`, `Room`, `SessionException` |
| Used by | School (emploi du temps), Tutoring (calendar) |
| Depends on | groups, subjects |

### attendance — Presence Tracking

Roll call per session, justifications, parent alerts.

| Key | Detail |
|---|---|
| Tables | `AttendanceRecord` |
| Used by | School (appel), Tutoring (session attendance) |
| Depends on | timetable |

### gradebook — Evaluation

Grade entry, averages, coefficients, competency tracking.

| Key | Detail |
|---|---|
| Tables | `GradeCategory`, `Assessment`, `Grade` |
| Used by | School (notes /20), Tutoring (progress ratings) |
| Depends on | groups, subjects |

### homework — Content & Assignments

Session content diary, homework with due dates, online submission.

| Key | Detail |
|---|---|
| Tables | `SessionContent`, `Homework`, `Submission` |
| Used by | School (cahier de textes), Tutoring (exercises) |
| Depends on | timetable, files |

### report_cards — Periodic Reports

Auto-generated from gradebook, teacher/council comments, PDF export.

| Key | Detail |
|---|---|
| Tables | `ReportCard`, `ReportCardSubject` |
| Used by | School (bulletins) |
| Depends on | gradebook |

### qcm — Quizzes

Quiz builder, question bank, shared library, auto-grading.

| Key | Detail |
|---|---|
| Tables | `Quiz`, `Question`, `Answer`, `QuizAttempt`, `QuestionBank` |
| Used by | School, Tutoring |
| Depends on | subjects |

### school_life — Discipline & Incidents

Incidents, sanctions, exit authorizations, study hall.

| Key | Detail |
|---|---|
| Tables | `Incident`, `Sanction`, `ExitAuthorization`, `StudyHall` |
| Used by | School (vie scolaire) |
| Depends on | attendance |

### enrollment — Registration

Online enrollment forms, document upload, review workflow.

| Key | Detail |
|---|---|
| Tables | `EnrollmentForm`, `EnrollmentSubmission` |
| Used by | School (inscription) |
| Depends on | files |

### booking — Session Booking

Availability, booking slots, reschedule, cancel.

| Key | Detail |
|---|---|
| Tables | `TutoringSession`, `AvailabilityOverride` |
| Used by | Tutoring (séances) |
| Depends on | — |

### learning_plans — Individual Plans

Per-student goals, tutor notes, progress milestones.

| Key | Detail |
|---|---|
| Tables | `LearningPlan`, `PlanMilestone`, `ProgressNote` |
| Used by | Tutoring |
| Depends on | — |

### packages — Hour Packages & Credits

Prepaid hour bundles, monthly plans, credit tracking.

| Key | Detail |
|---|---|
| Tables | `Package`, `PackagePurchase`, `CreditLog` |
| Used by | Tutoring (forfaits) |
| Depends on | billing |

### billing — Invoicing & Payments

Invoice generation, online payment (Stripe), receipts, dunning.

| Key | Detail |
|---|---|
| Tables | `Invoice`, `Payment` |
| Used by | School (scolarité), Tutoring (facturation) |
| Depends on | — |

### calendar — Events & Holidays

School-wide calendar, events, exam periods, iCal export.

| Key | Detail |
|---|---|
| Tables | `CalendarEvent` |
| Used by | School, Tutoring |
| Depends on | — |

### cloud — Document Storage

Personal cloud per user, shared spaces, folder structure.

| Key | Detail |
|---|---|
| Tables | Uses existing `File` model with folder hierarchy |
| Used by | School (ENT), Tutoring |
| Depends on | files |

## Module Dependency Graph

```
auth ─── users ─── groups ─── subjects
                      │
              ┌───────┴────────┐
              │                │
          timetable        gradebook
              │                │
        ┌─────┤            report_cards
        │     │
   attendance homework
        │
   school_life

booking ─── learning_plans
                │
            packages ─── billing

calendar    cloud    qcm    enrollment
```

## Data Model Details

Full data model specs for each module are preserved in the archived docs:
- School modules: [archive/02-SCHOOL-SCOPE.md](archive/02-SCHOOL-SCOPE.md)
- Tutoring modules: [archive/03-TUTORING-SCOPE.md](archive/03-TUTORING-SCOPE.md)
- Core entities: [archive/01-CORE-SHELL.md](archive/01-CORE-SHELL.md)
