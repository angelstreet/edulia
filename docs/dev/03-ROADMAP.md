# 03 — Roadmap: What's Built, What's Next

## What's Built (Core)

| Module | Backend | Frontend | Notes |
|---|---|---|---|
| auth | JWT, refresh, reset, invite | Login, forgot/reset password, accept invite | |
| users | CRUD, roles, CSV import | Users page, user form | |
| groups | CRUD, memberships | Classes page | |
| structure | Academic years, terms, campuses | Academic year page | |
| subjects | CRUD with color | Subjects page | |
| messaging | Threads, messages, compose | Messages page, thread view | |
| files | Upload, S3, ClamAV, categories | Documents page (tabbed, upload, delete) | |
| settings | Tenant config, branding | Settings page | |
| dashboards | Role-based widgets | Admin/Teacher/Student/Parent dashboards | |

**Infrastructure:**
- 3 VMs (app/db/storage) behind Nginx reverse proxy
- CI/CD: Husky pre-push hook + GitHub Actions (build, pytest, Playwright E2E)
- 21 Playwright E2E tests + 52 pytest API tests

---

## Priority 1 — School MVP ✅ COMPLETE

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | **timetable** | ✅ Done | Session CRUD, weekly grid view |
| 2 | **attendance** | ✅ Done | Roll call UI, date/group/session selectors |
| 3 | **gradebook** | ✅ Done | Grade entry, averages, coefficients, student/parent view, PDF report cards |
| 4 | **homework** | ✅ Done | Assign, submit, teacher grading with feedback |

A school can use Edulia for daily operations: schedule, attendance, grades, homework.

---

## Priority 2 — School Complete + École Directe Parity

| # | Module | Status | Notes |
|---|---|---|---|
| 5 | **report_cards** | ✅ Done | PDF export from gradebook, per-subject averages |
| 6 | **qcm** | ❌ Not started | Quiz builder, question bank, auto-grading |
| 7 | **school_life** | ✅ Done | Incidents (type, severity, status), admin/teacher create, resolve flow |
| 8 | **enrollment** | ❌ Not started | Online forms, document upload, review workflow |
| 9 | **billing / Stripe** | ⚠️ Partial | Wallet + service catalog done; Stripe top-up and auto-debit recurring not implemented |
| 10 | **calendar** | ✅ Done | School events (type, color), role-filtered, admin CRUD |
| 11 | **forms** | ✅ Done | Dynamic form builder, fill, results view, target roles |
| 12 | **document_categories** | ✅ Done | Tabbed view, category filter, upload with category |
| 13 | **wallet** | ✅ Done | Prepaid balance, top-up, service catalog, subscriptions, transaction history |
| 14 | **community** | ✅ Done | Directory + school organigramme (class tree, members) |
| — | **notifications UI** | ⚠️ Partial | Backend API complete; no bell/dropdown in app shell yet |
| — | **parent children page** | ✅ Done | Dedicated /children page with per-child stats + quick links |

---

## Priority 3 — Tutoring

| # | Module | Status |
|---|---|---|
| 15 | **booking** | ❌ Not started |
| 16 | **learning_plans** | ❌ Not started |
| 17 | **packages** | ❌ Not started |

---

## Priority 4 — Polish

| # | Item | Status | Notes |
|---|---|---|---|
| 18 | **Parent portal** | ✅ Done | /children page + ParentDashboard + StudentGradesPage child selector |
| 19 | **Student portal** | ✅ Done | Dashboard + grades + homework + timetable |
| 20 | **cloud** | ❌ Not started | Personal file storage, folder hierarchy |
| 21 | **Real-time notifications** | ❌ Not started | Socket.IO / SSE (currently no polling) |
| 22 | **PWA** | ❌ Not started | Service worker, offline, push notifications |
| 23 | **iCal export** | ❌ Not started | Calendar events export |

---

## What's Left for Pilot Launch

### Must-have before going live with a school
| Item | Effort | Why |
|---|---|---|
| Notifications bell UI | Small | Backend ready, users need to see alerts |

### Nice-to-have for pilot (can launch without)
| Item | Effort | Why |
|---|---|---|
| QCM / Quizzes | Large | Useful but not blocking |
| Enrollment module | Large | Schools can use paper enrollment initially |
| Stripe real payment | Medium | Top-up is recorded manually for now |
| Auto-debit recurring services | Medium | Needs Celery/cron scheduler |

### Post-pilot
- Tutoring module suite (booking, plans, packages)
- Real-time notifications (Socket.IO)
- PWA / offline
- Cloud file storage

---

## How to Build a Module

1. **Database** — Add SQLAlchemy models in `apps/api/app/db/models/`
2. **Migration** — Write Alembic migration in `alembic/versions/`
3. **Schemas** — Pydantic models in `apps/api/app/modules/<module>/schemas.py`
4. **Service** — Business logic in `apps/api/app/modules/<module>/service.py`
5. **Router** — FastAPI endpoints in `apps/api/app/modules/<module>/router.py`
6. **Register** — Import router in `app/main.py`, import model in `app/db/models/__init__.py`
7. **Frontend API** — Axios client in `apps/web/src/api/<module>.ts`
8. **Pages** — React pages in `apps/web/src/features/<module>/pages/`
9. **Route** — Add to `apps/web/src/app/router.tsx`
10. **Sidebar** — Add nav item in `apps/web/src/components/layout/Sidebar.tsx`
11. **i18n** — Add keys to `src/locales/en/common.json` and `fr/common.json`

## Reference

- [archive/01-CORE-SHELL.md](archive/01-CORE-SHELL.md) — Core entity specs
- [archive/02-SCHOOL-SCOPE.md](archive/02-SCHOOL-SCOPE.md) — School module data models + wireframes
- [archive/03-TUTORING-SCOPE.md](archive/03-TUTORING-SCOPE.md) — Tutoring module data models
- [archive/08-BUILD-PHASES.md](archive/08-BUILD-PHASES.md) — Original 54 micro-steps with test criteria
- [04-MISSING-FEATURES.md](04-MISSING-FEATURES.md) — École Directe gap analysis
