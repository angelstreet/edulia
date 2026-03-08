# Edulia — Handover Document

**Last updated:** 2026-03-08
**Repo:** https://github.com/angelstreet/edulia
**Live URL:** https://edulia.angelstreet.io
**Detailed roadmap:** `docs/dev/03-ROADMAP.md`

---

## Infrastructure

3 dedicated VMs on Proxmox (65.108.14.251) + shared proxy:

| VM | IP | Role | Components |
|----|-----|------|-----------|
| 120 | 192.168.0.120 | App server | Python 3.11, Node 20, PM2, ClamAV, DocuSeal |
| 121 | 192.168.0.121 | Database | PostgreSQL 16 (tuned, firewalled) |
| 122 | 192.168.0.122 | Storage | MinIO (3 buckets), Redis (3 DBs), Prometheus, Grafana |
| 107 | 192.168.0.107 | Proxy (shared) | Nginx reverse proxy |

- DNS: Cloudflare A record → 65.108.14.251
- SSL: Cloudflare edge + self-signed cert on nginx

### PM2 processes on VM 120

| Name | What | Port | Status |
|---|---|---|---|
| `edulia-api-dev` | uvicorn --reload | 8000 | ✅ online |
| `edulia-web-dev` | vite dev | 3000 | ✅ online |
| `edulia-hub` | vite dev (Hub app) | 3021 | ✅ online |
| `edulia-socketio` | Socket.IO server | 3001 | ✅ online |
| `edulia-worker` | Celery worker | — | ⚠️ errored |
| `edulia-beat` | Celery beat | — | ⚠️ errored |

Celery worker/beat are errored — background tasks (Stripe auto-debit, low-balance alerts) don't run in current dev mode. Not blocking for dev.

---

## Two Distinct Products

Edulia serves two different business models under one codebase. Tenant type drives which features are relevant:

### 1. School (`school` type) — "Ecole Molière" demo

Full academic management: timetable, attendance, gradebook, homework, report cards, school life, health records, forms, community, calendar, wallet, enrollment, messaging.

**Demo login:** `admin@demo.edulia.io` / `demo2026`

### 2. Private Tutoring Center (`tutoring_center` type) — "Cours Particuliers Rousseau"

Focused on: tutoring CRM (students, sessions, packages), billing (invoices with PDF, IBAN, sender/recipient addresses), wallet.

**Demo login:** `antoine.rousseau@coursprivesrousseau.fr` / `password123`

---

## What's Built (full module list)

### Core (all tenant types)
| Module | Backend | Frontend | Status |
|---|---|---|---|
| auth | JWT, refresh, reset, invite | Login, forgot/reset, accept invite | ✅ |
| users | CRUD, roles, parent-child links | Users page, invite flow | ✅ |
| groups | CRUD, memberships | Classes page | ✅ |
| structure | Academic years, terms | Academic year page | ✅ |
| subjects | CRUD (code, name, color, coeff) | Subjects page | ✅ |
| messaging | Threads, replies, read receipts | Messages page, thread view | ✅ |
| files | MinIO upload, presigned download | Documents page (tabbed) | ✅ |
| settings | Tenant config + branding fields | Settings page | ✅ |
| notifications | SSE + 30s polling fallback | Bell icon, unread count | ✅ |
| dashboard | Role-based widgets | 6 role dashboards | ✅ |

### School modules
| Module | Status | Notes |
|---|---|---|
| timetable | ✅ | Session CRUD, weekly grid, week nav |
| attendance | ✅ | Roll call, date/group/session selectors; filters non-student members |
| gradebook | ✅ | Manual grades + QCM bridge, term/subject filters, student names resolved |
| homework | ✅ | Assign with file/text, student submits, teacher grades |
| report_cards | ✅ | PDF export via ReportLab, per-subject averages per term |
| school_life | ✅ | Incidents (type, severity, status), resolve flow |
| calendar | ✅ | School events, role-filtered, admin CRUD |
| forms | ✅ | Dynamic builder, fill, results, target roles |
| community | ✅ | Directory + org chart (class tree, teachers per class) |
| health_records | ✅ | Allergies, meds, emergency contact, blood type |
| absence_justification | ✅ | Parent submits, admin/teacher reviews, Twilio SMS on status change |
| enrollment | ✅ | Parent submits, admin reviews, auto-creates student on approval |
| wallet | ✅ | Prepaid balance, Stripe top-up, service catalog, subscriptions |
| parent_portal | ✅ | /children + child selector in grades/dashboard |

### Interactive Teaching (all tenant types)
| Feature | Status |
|---|---|
| Async Activity Builder (QCM) | ✅ |
| Async Attempt + Auto-score | ✅ |
| Auto-reporting Dashboard | ✅ |
| Live Session (WebSocket + Redis) | ✅ |
| Live QCM Real-Time | ✅ |
| Replay Mode | ✅ |
| Gradebook ↔ Activity bridge | ✅ |

### Tutoring Center modules
| Module | Status | Notes |
|---|---|---|
| tutoring CRM | ✅ | Sessions, packages, invoice generation |
| billing (invoices) | ✅ | PDF with ReportLab; sender (name/SIRET/address/phone), recipient (name/address/phone); in-app viewer + download |
| billing (form pre-fill) | ✅ | IBAN, contact info from tenant settings auto-populate new invoice form |

### EduliaHub (separate app, port 3021)
| Module | Status |
|---|---|
| Course catalog | ✅ 31 courses, 15 platforms, filter/search |
| Ratings & reviews | ✅ |
| Certificates | ✅ |
| Portfolio | ✅ Public shareable page |

---

## Role / Permission Model

| Role | User management | Notes |
|---|---|---|
| admin | ✅ Full | School director / org admin |
| tutor | ✅ Can add tutees + parents | Private tutoring context |
| teacher | ❌ Read-only | In normal schools, admin manages users |
| student | ❌ | |
| parent | ❌ | |

---

## Dev Workflow

```bash
# Edit code locally, then deploy:
cd ~/shared/projects/edulia
./scripts/deploy-dev.sh            # git push → git pull on VM → restart
./scripts/deploy-dev.sh --migrate  # same + alembic upgrade head

# Run migrations manually on VM:
ssh edulia-app "cd /opt/edulia/backend/apps/api && \
  set -a && source /opt/edulia/backend/.env && set +a && \
  source /opt/edulia/backend/.venv/bin/activate && \
  alembic upgrade head"

# Seed demo data:
ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && \
  python3 scripts/seed_mon_ecole.py"
ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && \
  python3 scripts/seed_private_tutor.py"
ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && \
  python3 scripts/seed_private_tutor.py --reset"  # wipe + reseed
```

**Pre-push hook:** TypeScript check (`tsc --noEmit`) + production build (`npm run build`) — must pass before push.

---

## Known Issues / Tech Debt

| Issue | Where | Status |
|---|---|---|
| Celery worker/beat errored | PM2 | ⚠️ Stripe auto-debit + low-balance alerts don't fire; non-blocking for dev |
| Vite dev server in production | VM port 3000 | Replace with nginx serving dist/ + proxy /api before go-live |
| WS answer store in-memory | session_ws.py | Fine for single pod; move to Redis for multi-pod scale |
| Open questions score 0 | activity/scoring.py | Manual grading flow for open QCM is backlog |
| Cloudflare 100s WS idle timeout | Live sessions | Frontend reconnects on close — acceptable |
| ClamAV not wired | files upload | Scanner exists but not called in upload pipeline |

---

## Backlog

| Item | Priority | Notes |
|---|---|---|
| Interactive Teaching Phase D | P2 | Drag & match, ordering, fill-in-blank, parent-visible results |
| Tutoring booking calendar | P3 | Tutor availability, student books slot |
| Tutoring learning plans | P3 | Structured curriculum per student |
| Document auto-categorization | P2 | Invoices/report cards auto-filed to correct Documents tab |
| CI/CD pipeline | P2 | GitHub Actions: lint → test → build → deploy |
| DB-level tenant isolation audit | P1 | Verify all GET endpoints filter by tenant_id |
| OAuth / SSO | P3 | Google, Microsoft 365, SAML |

---

## Key Files

| File | Purpose |
|---|---|
| `apps/api/app/config.py` | Backend settings |
| `apps/api/app/core/dependencies.py` | Auth + permission dependencies |
| `apps/api/app/db/models/` | All SQLAlchemy models |
| `apps/api/app/modules/` | All API modules |
| `apps/web/src/app/router.tsx` | Frontend routing + guards |
| `apps/web/src/stores/authStore.ts` | Auth state (zustand) |
| `apps/web/src/components/layout/Sidebar.tsx` | Role-based nav |
| `scripts/seed_mon_ecole.py` | Seed school tenant |
| `scripts/seed_private_tutor.py` | Seed tutoring center tenant |
| `docs/dev/03-ROADMAP.md` | Detailed feature roadmap + sprint history |

## SSH Access

```bash
ssh edulia-app       # VM 120 — app server
ssh edulia-db        # VM 121 — database
ssh edulia-storage   # VM 122 — MinIO + Redis
ssh proxy            # VM 107 — nginx
```
