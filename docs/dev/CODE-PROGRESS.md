# Edulia — Code Development Progress

Tracks code development across scopes. Each task maps to a phase/step in `08-BUILD-PHASES.md`.

**Repo:** `https://github.com/angelstreet/edulia`
**Started:** 2026-03-01

---

## Doc References

| Shorthand | Full path |
|-----------|-----------|
| PHASES | `08-BUILD-PHASES.md` |
| CORE | `01-CORE-SHELL.md` |
| FILES | `06-FILE-STRUCTURE.md` |
| SCHOOL | `02-SCHOOL-SCOPE.md` |
| TUTOR | `03-TUTORING-SCOPE.md` |

---

## Scope 0 — Project Scaffold

| # | Task | Terminal | Ref | Status |
|---|------|----------|-----|--------|
| S0.1 | Backend scaffold (FastAPI + DB + Alembic) | 1 | PHASES §0.1–0.2 | Done |
| S0.2 | Frontend scaffold (Vite + React + i18n) | 2 | PHASES §0.3 | Done |
| S0.3 | Shared types + Socket.IO | 3 | PHASES §0.4 | Done |

### Terminal 1 — Backend scaffold

- [x] **S0.1a. Monorepo root structure** — Done
  - Do: Create Makefile, .env.example, .gitignore, LICENSE (AGPL-3.0), docker-compose.yml
  - Ref: `06-FILE-STRUCTURE.md` Root section
  - Test: `ls Makefile .env.example .gitignore LICENSE docker-compose.yml` → all exist

- [x] **S0.1b. FastAPI app + health endpoint** — Done
  - Do: Create apps/api/ with pyproject.toml, requirements.txt, app/main.py, app/config.py
  - Ref: `08-BUILD-PHASES.md` §0.1, `06-FILE-STRUCTURE.md` Backend section
  - Test: `curl http://localhost:8000/api/health` → `{"status": "healthy"}`

- [x] **S0.1c. Database connection + Alembic** — Done
  - Do: Create app/db/database.py (engine + session), app/db/base.py (TenantMixin), alembic.ini, alembic/env.py
  - Ref: `08-BUILD-PHASES.md` §0.2, `01-CORE-SHELL.md` §1 for TenantMixin fields
  - Test: `alembic upgrade head` → succeeds, DB connectable

- [x] **S0.1d. Core utilities** — Done
  - Do: Create app/core/exceptions.py, app/core/middleware.py (tenant resolution)
  - Ref: `06-FILE-STRUCTURE.md` Backend core section
  - Test: App starts without errors

### Terminal 2 — Frontend scaffold

- [x] **S0.2a. Vite + React + TypeScript project** — Done
  - Do: Create apps/web/ with Vite, main.tsx, App.tsx, tsconfig
  - Ref: `08-BUILD-PHASES.md` §0.3, `06-FILE-STRUCTURE.md` Frontend section
  - Test: `npm run dev` → serves at localhost:5173

- [x] **S0.2b. i18n setup** — Done
  - Do: Create i18n.ts, locales/fr/common.json, locales/en/common.json
  - Ref: `06-FILE-STRUCTURE.md` Frontend locales section
  - Test: `tsc --noEmit` → passes

- [x] **S0.2c. Router + placeholder pages** — Done
  - Do: Create app/router.tsx, LoginPage.tsx, DashboardPage.tsx, .env.production
  - Ref: `06-FILE-STRUCTURE.md` Frontend features/auth section
  - Test: Navigate to /login and /dashboard → pages render

- [x] **S0.2d. App shell layout components** — Done
  - Do: Create AppShell.tsx, Sidebar.tsx, Topbar.tsx (placeholder content), styles/globals.css
  - Ref: `06-FILE-STRUCTURE.md` Frontend components/layout section
  - Test: App shell visible with sidebar + topbar

### Terminal 3 — Shared types + Socket.IO

- [x] **S0.3a. Shared types package** — Done
  - Do: Create packages/shared/ with tsconfig.json, package.json, all type files from FILES doc
  - Ref: `06-FILE-STRUCTURE.md` Shared section, `01-CORE-SHELL.md` §1 for entity definitions
  - Test: `tsc --noEmit` → passes

- [x] **S0.3b. Shared constants** — Done
  - Do: Create constants/roles.ts, permissions.ts, modules.ts
  - Ref: `01-CORE-SHELL.md` §1.5 for roles/permissions
  - Test: Constants importable, `tsc --noEmit` passes

- [x] **S0.3c. Socket.IO server** — Done
  - Do: Create apps/socketio/ with package.json, src/index.ts, src/auth.ts, src/redis.ts, handlers/notifications.ts
  - Ref: `06-FILE-STRUCTURE.md` Socket.IO section
  - Test: Server starts and connects to Redis on 192.168.0.122:6379

---

## Scope 1 — Core Auth + RBAC

| # | Task | Terminal | Ref | Status |
|---|------|----------|-----|--------|
| S1.1 | Backend auth + RBAC + user CRUD | 1 | PHASES §1.1–1.4, §2.1–2.3 | Done |
| S1.2 | Frontend auth + admin UI | 2 | PHASES §1.3–1.4, §2.3–2.4, §4.1–4.2 | Done |

---

## Scope 2 — Core Structure + Dashboard

| # | Task | Terminal | Ref | Status |
|---|------|----------|-----|--------|
| S2.1 | Backend structure + messaging + files APIs | 1 | PHASES §3.1–3.5, §5.1+5.3, §6.1 | Done |
| S2.2 | Frontend structure + dashboard + messaging UI | 2 | PHASES §3.6, §4.3, §5.2+5.4, §6.2 | Done |

---

## Post Scope 2 — Deploy to VM 120

| # | Task | Ref | Status |
|---|------|-----|--------|
| D1 | Pull code + pip install | INSTALL §3.2 | Not started |
| D2 | Run alembic upgrade head | INSTALL §3.6 | Not started |
| D3 | npm ci + npm run build | INSTALL §3.7 | Not started |
| D4 | Start PM2 (5 processes) | INSTALL §3.8 | Not started |
| D5 | Seed initial data | INSTALL §3.9 | Not started |
| D6 | Run post-install checklist | INSTALL Post-Install | Not started |
