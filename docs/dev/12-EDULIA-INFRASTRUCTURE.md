# 12 — Edulia Infrastructure (Dedicated VMs)

> Replaces `10-INFRASTRUCTURE-PROXMOX.md` which incorrectly described Edulia
> on shared VMs. Edulia and EduliaHub run on their **own dedicated VMs**,
> isolated from the shared app fleet (VM 103/105 etc.).

---

## VM Layout

```
                        INTERNET
                           │
                    65.108.14.251
                  (Proxmox host)
                           │
        ┌──────────────────▼──────────────────┐
        │  VM 107 — proxy (192.168.0.107)     │
        │  Nginx + Let's Encrypt SSL           │
        │  Shared reverse proxy for ALL apps   │
        └───────────┬─────────────────────────┘
                    │
        ┌───────────▼─────────────────────────┐
        │  VM 120 — edulia-app                │
        │  192.168.0.120                      │
        │  FastAPI (uvicorn/gunicorn)          │
        │  React frontend (vite dev / PM2)    │
        │  EduliaHub frontend (port 3021)     │
        └───────────┬─────────────────────────┘
                    │
        ┌───────────▼─────────────────────────┐
        │  VM 121 — edulia-db                 │
        │  192.168.0.121                      │
        │  PostgreSQL (native, not Docker)    │
        └─────────────────────────────────────┘
                    │
        ┌───────────▼─────────────────────────┐
        │  VM 122 — edulia-storage            │
        │  192.168.0.122                      │
        │  MinIO (file storage)               │
        │  Redis (cache + pub/sub + broker)   │
        └─────────────────────────────────────┘
```

---

## VM Inventory

| VM | Alias | IP | Role | SSH alias |
|----|-------|----|------|-----------|
| 120 | edulia-app | 192.168.0.120 | FastAPI API + React web + EduliaHub | `ssh edulia-app` |
| 121 | edulia-db | 192.168.0.121 | PostgreSQL (native) | `ssh edulia-db` |
| 122 | edulia-storage | 192.168.0.122 | MinIO + Redis | `ssh edulia-storage` |
| 107 | proxy | 192.168.0.107 | Nginx + SSL (shared) | `ssh proxy` |

---

## VM 120 — edulia-app

### Services

| Service | Mode | Port | Process |
|---------|------|------|---------|
| FastAPI (dev) | uvicorn --reload | 8000 | PM2: `edulia-api-dev` |
| FastAPI (prod) | gunicorn 4w | 8000 | PM2: `edulia-api` |
| Web frontend (dev) | vite dev + HMR | 3000 | PM2: `edulia-web-dev` |
| Web frontend (prod) | PM2 serve dist | 3000 | PM2: `edulia-frontend` |
| EduliaHub frontend (dev) | vite dev + HMR | 3021 | PM2: `edulia-hub` |
| WebSocket server | uvicorn (same process as API) | 8000 | — (FastAPI native WS) |

**Current mode: dev** (uvicorn --reload + vite dev). Auto-reloads on git pull.

### Code location

```
/opt/edulia/backend/
├── apps/
│   ├── api/          ← FastAPI backend
│   └── web/          ← React web app
├── .env              ← environment variables (DB, Redis, MinIO)
├── .venv/            ← Python virtualenv
└── scripts/
    └── deploy-dev.sh ← push + pull deploy script
```

### Environment (.env)

```env
DATABASE_URL=postgresql://edulia:PASSWORD@192.168.0.121:5432/edulia
REDIS_URL=redis://192.168.0.122:6379/0
REDIS_PUBSUB_URL=redis://192.168.0.122:6379/1
CELERY_BROKER_URL=redis://192.168.0.122:6379/2
S3_ENDPOINT=http://192.168.0.122:9000
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=edulia-uploads
JWT_SECRET=...
```

### Deploy (dev workflow)

```bash
# From local machine (~/shared/projects/edulia)
./scripts/deploy-dev.sh           # push + pull, servers auto-reload
./scripts/deploy-dev.sh --migrate # same + run alembic upgrade head on VM
```

---

## VM 121 — edulia-db

### PostgreSQL (native, not Docker)

- **Version:** PostgreSQL 15/16
- **Host:** 192.168.0.121, port 5432
- **Database:** `edulia`
- **Access:** from VM 120 only

```bash
ssh edulia-db
sudo -u postgres psql edulia

# Run migrations from VM 120:
ssh edulia-app "
  cd /opt/edulia/backend/apps/api
  set -a && source /opt/edulia/backend/.env && set +a
  source /opt/edulia/backend/.venv/bin/activate
  alembic upgrade head
"
```

---

## VM 122 — edulia-storage

### Redis

- **Port:** 6379
- **DB 0:** cache / session store
- **DB 1:** pub/sub for live sessions (WebSocket fan-out)
- **DB 2:** Celery broker

### MinIO

- **Port:** 9000 (API), 9001 (console — local only)
- **Bucket:** `edulia-uploads`

```bash
ssh edulia-storage
# MinIO console: http://192.168.0.122:9001
```

---

## Nginx (VM 107 — shared proxy)

Add to `/etc/nginx/sites-available/edulia` on VM 107:

```nginx
upstream edulia_api    { server 192.168.0.120:8000; }
upstream edulia_web    { server 192.168.0.120:3000; }
upstream edulia_hub    { server 192.168.0.120:3021; }

server {
    listen 443 ssl http2;
    server_name edulia.angelstreet.io;

    ssl_certificate /etc/letsencrypt/live/angelstreet.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/angelstreet.io/privkey.pem;

    client_max_body_size 50M;

    # SPA
    location / { proxy_pass http://edulia_web; proxy_set_header Host $host; }

    # API
    location /api/ {
        proxy_pass http://edulia_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (live sessions)
    location /ws/ {
        proxy_pass http://edulia_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;  # keep WS alive
    }
}

server {
    listen 443 ssl http2;
    server_name hub.angelstreet.io;
    # same ssl certs
    location / { proxy_pass http://edulia_hub; proxy_set_header Host $host; }
    location /api/ { proxy_pass http://edulia_api; proxy_set_header Host $host; }
}
```

---

## What Does NOT Live Here

- VM 103/105 (shared backend/frontend fleet) — **not used by Edulia**
- VM 133 (OpenClaw agents) — **not used by Edulia**
- OpenClaw infrastructure (65.108.14.251:8080 proxy) — **Edulia has its own domain routing via VM 107**
