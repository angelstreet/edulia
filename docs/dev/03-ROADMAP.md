# 03 — Roadmap: What's Built, What's Next

## What's Built (Core)

All core modules are implemented and deployed.

| Module | Backend | Frontend | Tests | Deployed |
|---|---|---|---|---|
| auth | JWT, refresh, reset, invite | Login, forgot password | 5 E2E + pytest | Yes |
| users | CRUD, roles, CSV import | Users page, user form | E2E + pytest | Yes |
| groups | CRUD, memberships | Classes page | E2E + pytest | Yes |
| structure | Academic years, terms, campuses | Academic year page | E2E + pytest | Yes |
| subjects | CRUD with color | Subjects page | E2E + pytest | Yes |
| messaging | Threads, messages, compose | Messages page, thread view | pytest | Yes |
| files | Upload, S3, ClamAV | File upload component | pytest | Yes |
| settings | Tenant config, branding | Settings page, module toggles | pytest | Yes |
| dashboards | Role-based widgets | Admin/teacher/student/parent dashboards | 7 E2E | Yes |

**Infrastructure:**
- 3 VMs (app/db/storage) behind Nginx reverse proxy
- CI/CD: Husky pre-push hook + GitHub Actions (build, pytest, Playwright E2E)
- 21 Playwright E2E tests + 52 pytest API tests — all passing

## What's Next

Modules ordered by priority. Each module is independent work that can be built one at a time.

### Priority 1 — School MVP (make it usable for a pilot school)

| # | Module | Key deliverables | Estimated effort |
|---|---|---|---|
| 1 | **timetable** | Session CRUD, weekly view, room booking, substitutions | Large |
| 2 | **attendance** | Roll call UI, parent justification, auto-notification | Medium |
| 3 | **gradebook** | Grade entry, averages, coefficients, student/parent view | Large |
| 4 | **homework** | Cahier de textes, homework with due dates, file attachments | Medium |

After these 4: a school can use Edulia for daily operations (schedule, attendance, grades, homework).

### Priority 2 — School Complete + École Directe Parity

| # | Module | Key deliverables |
|---|---|---|
| 5 | **report_cards** | Auto-generate from gradebook, teacher comments, PDF export |
| 6 | **qcm** | Quiz builder, question bank, auto-grading |
| 7 | **school_life** | Incidents, sanctions, study hall |
| 8 | **enrollment** | Online forms, document upload, review workflow |
| 9 | **billing** | Invoice generation, Stripe payment, receipts |
| 10 | **calendar** | School events, holidays, iCal export |
| 11 | **forms** | Surveys, consent forms, dynamic form builder (see [04-MISSING-FEATURES.md](04-MISSING-FEATURES.md)) |
| 12 | **document_categories** | Tabbed document view by category, auto-linking from modules |
| 13 | **wallet** | Prepaid balance, service catalog (cantine, garderie), auto-debit |
| 14 | **community** | School directory, parent delegates, privacy controls |

### Priority 3 — Tutoring

| # | Module | Key deliverables |
|---|---|---|
| 15 | **booking** | Tutor availability, slot booking, reschedule/cancel |
| 16 | **learning_plans** | Per-student goals, progress notes, milestones |
| 17 | **packages** | Hour bundles, credit tracking, monthly plans |

Billing (module 9) is shared — build it once, tutoring reuses it with different policies.

### Priority 4 — Polish

| # | Item | What |
|---|---|---|
| 18 | **Parent portal** | Per-child view aggregating grades, attendance, messages, payments |
| 19 | **Student portal** | Personal dashboard with grades, timetable, homework |
| 20 | **cloud** | Personal file storage, shared spaces, folder hierarchy |
| 21 | **Real-time** | Socket.IO notifications (currently polling only) |
| 22 | **PWA** | Service worker, offline, push notifications |

## How to Build a Module

Each module follows the same pattern:

1. **Database** — Add SQLAlchemy models in `apps/api/app/db/models/`
2. **Migration** — `alembic revision --autogenerate -m "add <module> tables"`
3. **Schemas** — Pydantic models in `apps/api/app/modules/<module>/schemas.py`
4. **Router** — FastAPI endpoints in `apps/api/app/modules/<module>/router.py`
5. **Service** — Business logic in `apps/api/app/modules/<module>/service.py`
6. **Frontend API** — Axios client in `apps/web/src/api/<module>.ts`
7. **Pages** — React pages in `apps/web/src/features/<module>/pages/`
8. **Route** — Add to `apps/web/src/app/Router.tsx`
9. **Sidebar** — Add nav item in `apps/web/src/components/layout/Sidebar.tsx`
10. **Tests** — pytest for API + Playwright E2E for pages
11. **Module guard** — Check `tenant.settings.enabled_modules` before showing UI / allowing API calls

## Reference

Detailed data models and UI wireframes for all modules are preserved in the archived docs:
- [archive/01-CORE-SHELL.md](archive/01-CORE-SHELL.md) — Core entity specs
- [archive/02-SCHOOL-SCOPE.md](archive/02-SCHOOL-SCOPE.md) — School module data models + wireframes
- [archive/03-TUTORING-SCOPE.md](archive/03-TUTORING-SCOPE.md) — Tutoring module data models
- [archive/08-BUILD-PHASES.md](archive/08-BUILD-PHASES.md) — Original 54 micro-steps with test criteria
- [04-MISSING-FEATURES.md](04-MISSING-FEATURES.md) — École Directe gap analysis (forms, document categories, wallet, community)
