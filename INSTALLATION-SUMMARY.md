# Edulia — Installation Summary

**Date:** 2026-03-01

---

## What's installed

### VM 121 — Database (192.168.0.121)

| Component | Version | Status |
|-----------|---------|--------|
| PostgreSQL | 16.13 | Running, tuned, locked down |
| Database `edulia` | — | Created, extensions enabled (uuid-ossp, pgcrypto, unaccent) |
| Database `docuseal` | — | Created |
| DB user `edulia` | — | Created, owns both databases |

**Config tuning applied:** shared_buffers 2GB, effective_cache_size 6GB, work_mem 32MB, max_connections 200, WAL tuned.
**Firewall:** pg_hba allows only 192.168.0.120 (edulia-app), rejects all others.

### VM 122 — Storage (192.168.0.122)

| Component | Version | Status |
|-----------|---------|--------|
| Docker | 29.2.1 | Running, enabled on boot |
| MinIO | minio/minio (latest) | Running on ports 9000 (API) / 9001 (console, localhost only) |
| Redis | redis:7-alpine | Running on port 6379, 3 DBs configured |
| Prometheus | prom/prometheus:latest | Running on port 9090 (localhost only), scraping 3 node_exporters + API |
| Grafana | grafana/grafana:latest | Running on port 3000 (localhost only) |
| node_exporter | 1.7.0 | Running on all 3 VMs (120/121/122), port 9100 |

**MinIO buckets:** `edulia-uploads`, `edulia-avatars`, `edulia-documents`
**Redis DBs:** 0 = app cache + Socket.IO, 1 = Celery broker, 2 = Celery result backend
**Prometheus config:** `/opt/edulia/prometheus/prometheus.yml`
**Compose file:** `/opt/edulia/docker-compose.yml`

### VM 120 — App Server (192.168.0.120)

| Component | Version | Status |
|-----------|---------|--------|
| Python | 3.11.2 | Installed with dev libs + WeasyPrint/Pillow deps |
| Node.js | 20.20.0 | Installed |
| Docker | 29.2.1 | Running, enabled on boot |
| PM2 | installed | Not yet started (no app code) |
| ClamAV | clamav/clamav:stable | Running, healthy, port 3310 (localhost) |
| DocuSeal | docuseal/docuseal:latest | Running, port 3002 (localhost) |
| .env | — | Written, permissions 600 |

**Repo cloned to:** `/opt/edulia/backend` (docs only — app code not yet written)
**Venv:** `/opt/edulia/backend/.venv`
**Compose file:** `/opt/edulia/docker-compose.yml`

---

## Credentials & secrets location

All secrets are stored on the VMs — **never in this document**.

| What | Where to find it |
|------|-----------------|
| PostgreSQL password (user `edulia`) | `ssh edulia-app "grep DATABASE_URL /opt/edulia/backend/.env"` |
| MinIO access/secret keys | `ssh edulia-storage "cat /opt/edulia/.env"` |
| Redis password | `ssh edulia-storage "cat /opt/edulia/.env"` |
| JWT secret | `ssh edulia-app "grep JWT_SECRET /opt/edulia/backend/.env"` |
| DocuSeal API key | `ssh edulia-app "grep DOCUSEAL_API_KEY /opt/edulia/backend/.env"` |
| SMTP credentials (Brevo) | `ssh edulia-app "grep SMTP /opt/edulia/backend/.env"` |
| Full app .env | `ssh edulia-app "cat /opt/edulia/backend/.env"` |
| Grafana admin password | `ssh edulia-storage "grep GRAFANA /opt/edulia/.env"` |
| Full storage .env | `ssh edulia-storage "cat /opt/edulia/.env"` |

---

## .env keys configured on VM 120

```
APP_NAME, APP_ENV, APP_URL, APP_PORT
DATABASE_URL, DB_POOL_SIZE, DB_MAX_OVERFLOW
REDIS_URL, CELERY_BROKER_URL, CELERY_RESULT_BACKEND, SOCKETIO_REDIS_URL
JWT_SECRET, JWT_ACCESS_TOKEN_EXPIRE_MINUTES, JWT_REFRESH_TOKEN_EXPIRE_DAYS
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
CLAMAV_HOST, CLAMAV_PORT
DOCUSEAL_URL, DOCUSEAL_API_KEY
DATA_RETENTION_YEARS, GDPR_DPO_EMAIL
```

Missing (optional, add when ready): `STRIPE_*`, `VAPID_*`

---

## SSH access

```bash
ssh edulia-app       # VM 120 — 192.168.0.120
ssh edulia-db        # VM 121 — 192.168.0.121
ssh edulia-storage   # VM 122 — 192.168.0.122
ssh proxy            # VM 107 — 192.168.0.107 (shared)
ssh monitoring       # VM 106 — 192.168.0.106
```

All via ProxyJump through `proxmox` (65.108.14.251).

---

## Admin access

| Service | How to access |
|---------|--------------|
| MinIO console | `ssh -L 9001:127.0.0.1:9001 edulia-storage` then open `http://localhost:9001` |
| DocuSeal admin | `ssh -L 3002:127.0.0.1:3002 edulia-app` then open `http://localhost:3002` |
| Prometheus | `ssh -L 9090:127.0.0.1:9090 edulia-storage` then open `http://localhost:9090` |
| Grafana | `ssh -L 3030:127.0.0.1:3000 edulia-storage` then open `http://localhost:3030` (admin / see .env) |
| PostgreSQL | `ssh edulia-db` then `sudo -u postgres psql -d edulia` |
| Redis CLI | `ssh edulia-storage` then `source /opt/edulia/.env && redis-cli -a $REDIS_PASSWORD` |

---

## What's left before coding can start

Nothing. Infrastructure is ready. Write the app code, push to `https://github.com/angelstreet/edulia`, then:

1. `alembic upgrade head` (task 14)
2. `npm ci && npm run build` (task 15)
3. Start PM2 (task 16)
4. Seed data (task 17)

## What's left (needs app code)

| Task | What | When |
|------|------|------|
| 14 | Run DB migrations (`alembic upgrade head`) | After DB models + migrations written |
| 15 | Build frontend (`npm ci && npm run build`) | After frontend code written |
| 16 | Start PM2 (5 processes) | After 14 + 15 |
| 17 | Seed initial data | After 16 |
| 21 | Post-install checklist (8 checks) | After 14–17 done |
