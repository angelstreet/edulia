# Edulia

Open-source school management platform — a modern alternative to École Directe and Pronote. Unified support for K-12 schools and tutoring centers.

**Live demo:** https://edulia.angelstreet.io

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Lucide icons |
| State | Zustand |
| API | Python FastAPI |
| Database | PostgreSQL 16 + SQLAlchemy 2 + Alembic |
| Real-time | Socket.IO + Redis Pub/Sub |
| File storage | S3-compatible (MinIO) |
| Auth | JWT + RBAC + OIDC-ready |
| i18n | French / English (i18next) |
| Deploy | Docker + PM2 + Nginx |

## Features

**Implemented (Scope 0-2):**
- Multi-tenant architecture with row-level isolation
- Authentication (login, JWT refresh, password reset, invite flow)
- Role-based access control (admin, teacher, student, parent, tutor)
- User management with CSV import
- School structure (campuses, academic years, terms, classes/groups)
- Subjects with color coding
- Messaging (threaded conversations, compose, notifications)
- File upload with ClamAV virus scanning
- Role-based dashboards with widgets
- Admin settings (module toggles, grading scales)
- Responsive layout with mobile bottom nav

**Roadmap (Scope 3+):**
- Timetable, attendance, gradebook
- Homework diary, report cards, QCM/quizzes
- Parent/student portals
- Tutoring (calendar, bookings, learning plans)
- Billing, e-signatures (DocuSeal), PDF report cards

## Quick Start (Docker)

```bash
git clone https://github.com/angelstreet/edulia.git
cd edulia
cp .env.example .env
docker-compose up
```

- Frontend: http://localhost:5173
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Project Structure

```
edulia/
├── apps/
│   ├── api/                  # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/         # Security, middleware, permissions
│   │   │   ├── db/           # Models, migrations, database
│   │   │   └── modules/      # auth, users, groups, messaging,
│   │   │                     # subjects, academic_years, files,
│   │   │                     # notifications, tenant
│   │   ├── alembic/          # DB migrations
│   │   └── requirements.txt
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   │   ├── api/          # Axios client + service files
│   │   │   ├── app/          # Router, guards, providers
│   │   │   ├── components/   # ui/ (shadcn wrappers), layout/, common/
│   │   │   ├── features/     # auth, admin, dashboard, messaging, settings
│   │   │   ├── hooks/        # useAuth, useCurrentUser, usePermission
│   │   │   ├── stores/       # Zustand (auth, notifications)
│   │   │   ├── locales/      # fr/, en/
│   │   │   └── styles/       # Tailwind + brand variables
│   │   └── package.json
│   └── socketio/             # Real-time server (Node.js)
├── docs/dev/                 # Architecture & design docs
├── ecosystem.config.js       # PM2 production config
├── docker-compose.yml
└── Makefile
```

## Production Deployment

The app runs on 3 VMs behind an Nginx reverse proxy:

| VM | Role | Services |
|----|------|----------|
| 120 | App server | FastAPI (Gunicorn), React (PM2 serve), Socket.IO, Celery, ClamAV |
| 121 | Database | PostgreSQL 16 |
| 122 | Storage | MinIO, Redis |

See [docs/dev/INSTALLATION-GUIDE.md](docs/dev/INSTALLATION-GUIDE.md) for step-by-step setup.

**PM2 processes:**

```
edulia-api        Gunicorn + Uvicorn (4 workers, port 8000)
edulia-frontend   PM2 serve (port 3000, SPA mode)
edulia-socketio   Node.js (port 3001)
edulia-worker     Celery (4 concurrent tasks)
edulia-beat       Celery Beat scheduler
```

## Development

**Backend:**
```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd apps/web
npm install
npm run dev
```

**Run tests:**
```bash
cd apps/api
pytest
```

## Architecture

- **Multi-tenant:** Each tenant (school/center) has isolated data via `tenant_id` foreign keys
- **RBAC:** Roles (admin, teacher, student, parent, tutor) with granular permissions
- **JWT auth:** Access tokens (30min) + refresh tokens (7 days), stored in Zustand + localStorage
- **API design:** RESTful, versioned (`/api/v1/`), FastAPI auto-docs at `/docs`
- **Real-time:** Socket.IO with Redis adapter for horizontal scaling
- **File storage:** S3-compatible with 3 buckets (uploads, avatars, documents)

## GDPR Compliance

Built for French/EU data protection from day one:
- EU hosting required
- Data minimization + right to access/deletion/portability
- Configurable data retention (default 3 years)
- Audit logging
- No third-party trackers
- CNIL-compliant

## License

[AGPL-3.0](LICENSE) — free for self-hosted deployments. Commercial license available for SaaS and proprietary use.
