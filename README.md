# Edulia

**One platform for teaching and learning.** Open-source, modular, self-hostable.

Two products, one codebase:

| | **Edulia** | **EduliaHub** |
|---|---|---|
| **What** | School & institution management | Learning marketplace & portfolio |
| **For** | Schools, tutoring centers, enterprises | Anyone who wants to learn |
| **Features** | Timetable, grades, attendance, messaging, billing | Course catalog, certificates, portfolio, curriculum |
| **Access** | Invitation-only (institution creates accounts) | Self-signup (free) |
| **URL** | [edulia.angelstreet.io](https://edulia.angelstreet.io) | [eduliahub.angelstreet.io](https://eduliahub.angelstreet.io) |

## Architecture

```
edulia/
├── apps/
│   ├── api/          # Shared FastAPI backend (Python 3.11)
│   ├── web/          # Edulia admin frontend (React + Vite + Tailwind)
│   ├── hub/          # EduliaHub frontend (React + Vite + Tailwind)
│   └── socketio/     # Real-time notifications (Socket.IO + Redis)
├── packages/
│   └── shared/       # Shared types and utilities
└── docs/
    └── dev/          # Architecture docs, module specs, roadmap
```

One backend serves both frontends. One database. Shared auth (SSO between both).

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis, Celery |
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS 4 |
| UI Components | shadcn/ui, Lucide icons |
| State | Zustand |
| i18n | i18next (French + English) |
| Files | S3-compatible (MinIO) |
| Real-time | Socket.IO + Redis Pub/Sub |
| Auth | JWT + RBAC |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 22+
- PostgreSQL 16
- Redis

### Backend

```bash
cd apps/api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your DB/Redis credentials
alembic upgrade head
python -m app.main
# API running at http://localhost:8000
```

### Edulia (admin frontend)

```bash
cd apps/web
npm install
npm run dev
# http://localhost:3000
```

### EduliaHub (learning hub frontend)

```bash
cd apps/hub
npm install
npm run dev
# http://localhost:3004
```

### Seed data

```bash
cd apps/api
python scripts/create_tenant.py  # Creates default tenant + admin user
```

## Infrastructure

Production runs on 3 dedicated VMs:

| VM | Role | Services |
|---|---|---|
| 120 | App server | Edulia (:3000), EduliaHub (:3004), API (:8000), Socket.IO (:3001) |
| 121 | Database | PostgreSQL 16 (:5432) |
| 122 | Storage/Cache | MinIO (:9000), Redis (:6379), Prometheus, Grafana |

## Documentation

| Doc | Description |
|---|---|
| [00-ARCHITECTURE.md](docs/dev/00-ARCHITECTURE.md) | Core architecture: one core + config wrappers |
| [01-MODULES.md](docs/dev/01-MODULES.md) | Module catalog (9 core + 15 toggleable) |
| [02-WORKSPACE-TEMPLATES.md](docs/dev/02-WORKSPACE-TEMPLATES.md) | School / tutoring / enterprise presets |
| [03-ROADMAP.md](docs/dev/03-ROADMAP.md) | What's built, what's next |
| [04-MISSING-FEATURES.md](docs/dev/04-MISSING-FEATURES.md) | Ecole Directe gap analysis |
| [05-COURSES-AND-PORTFOLIO.md](docs/dev/05-COURSES-AND-PORTFOLIO.md) | Courses, curriculum, certificates, portfolio |
| [06-EDULIAHUB-ARCHITECTURE.md](docs/dev/06-EDULIAHUB-ARCHITECTURE.md) | EduliaHub architecture & implementation plan |

## License

**AGPL-3.0** — free to self-host. Commercial license available for SaaS deployments.

## Contributing

PRs welcome. See the docs above for architecture context before diving in.
