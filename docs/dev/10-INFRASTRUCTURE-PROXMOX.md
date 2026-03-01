# 10 — Infrastructure (Our Proxmox — Edulia Deployment)

This document describes how Edulia is deployed on **our actual Proxmox infrastructure** at `65.108.14.251`. It replaces and overrides the generic `09-INFRASTRUCTURE.md` for production deployment purposes.

> **Context:** We already run multiple apps (PikaBoard, Konto, Kozy, etc.) on this Proxmox host. Edulia slots into the existing shared fleet rather than provisioning from scratch.

---

## Architecture Overview

```
                         INTERNET
                            │
                     65.108.14.251
                    (Proxmox host)
                            │
         ┌──────────────────▼───────────────────┐
         │        VM 107 — proxy                │
         │        192.168.0.107                 │
         │        Nginx + SSL (Let's Encrypt)   │
         │        Single public entry point     │
         │        for ALL apps incl. Edulia     │
         └────┬──────────┬──────────┬───────────┘
              │          │          │
     ┌────────▼──┐  ┌────▼──────┐  ┌▼──────────────────┐
     │ VM 105    │  │ VM 103    │  │ VM 101             │
     │ frontend  │  │ server    │  │ database           │
     │ .105      │  │ .103      │  │ .101               │
     │ React /   │  │ FastAPI + │  │ Supabase PG        │
     │ Next.js   │  │ Celery    │  │ MinIO + Redis      │
     └───────────┘  └───────────┘  └────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │ VM 106 — monitoring  │
                              │ 192.168.0.106        │
                              │ Grafana + Prometheus │
                              └─────────────────────┘
```

**Network:** Flat private LAN `192.168.0.0/24` — all VMs on Proxmox bridge `vmbr0`.  
**Public access:** Only via Nginx on `proxy` VM (107). SSL terminated here.  
**SSH access:** All VMs via ProxyJump through `proxmox` (65.108.14.251).

---

## VM Inventory

| VM ID | Alias | IP | RAM | Disk | Current Role |
|-------|-------|----|-----|------|--------------|
| 107 | proxy | 192.168.0.107 | 2 GB | 31 GB | Nginx reverse proxy + SSL — **shared** |
| 105 | frontend | 192.168.0.105 | 2 GB | 31 GB | React frontends via PM2 — **shared** |
| 103 | backend-server | 192.168.0.103 | 2 GB | 31 GB | Flask/FastAPI backends via PM2 — **shared** |
| 101 | database | 192.168.0.101 | 8 GB | 31 GB | Supabase PostgreSQL + MinIO + Redis |
| 102 | storage | 192.168.0.102 | 2 GB | 31 GB | Additional Docker services |
| 106 | monitoring | 192.168.0.106 | 2 GB | 31 GB | Grafana + Prometheus — **shared** |
| 133 | openclaw | 192.168.0.133 | 16 GB | — | OpenClaw gateway + agents |

---

## Where Edulia Deploys

| Edulia Component | Target VM | IP | Method |
|-----------------|-----------|-----|--------|
| Frontend (React/Next.js) | VM 105 (frontend) | 192.168.0.105 | PM2 serve / Next.js |
| Backend API (FastAPI) | VM 103 (backend-server) | 192.168.0.103 | Gunicorn via PM2 |
| Celery Worker | VM 103 (backend-server) | 192.168.0.103 | PM2 (split to own VM later if needed) |
| Celery Beat | VM 103 (backend-server) | 192.168.0.103 | PM2 |
| PostgreSQL | VM 101 (database) | 192.168.0.101 | Supabase-managed PG |
| Redis (cache + broker) | VM 101 (database) | 192.168.0.101 | Existing Redis instance (new DBs) |
| File Storage (S3) | VM 101 (database) | 192.168.0.101 | MinIO — new bucket |
| ClamAV (virus scan) | VM 103 (backend-server) | 192.168.0.103 | Docker sidecar |
| DocuSeal (contracts) | VM 102 (storage) | 192.168.0.102 | Docker container |
| Nginx routing | VM 107 (proxy) | 192.168.0.107 | New vhost block |
| Monitoring | VM 106 (monitoring) | 192.168.0.106 | Grafana dashboards + Prometheus scrape |

---

## Port Registry

> Confirm no conflicts before assigning. Existing apps use ports 5073, 5109, 3000, 3001, 8081, 9000, 9001.

| Service | VM | Port | Notes |
|---------|-----|------|-------|
| Edulia Frontend | 105 | TBD (e.g. 5200) | PM2 serve |
| Edulia API | 103 | TBD (e.g. 8200) | Gunicorn |
| Edulia Socket.IO | 103 | TBD (e.g. 3200) | |
| ClamAV | 103 | 3310 (localhost) | Docker — internal only |
| DocuSeal | 102 | 3000 (localhost) | Docker — proxied via Nginx |

---

## 1. Nginx (VM 107 — proxy)

Add new vhost to `/etc/nginx/sites-available/edulia` on `192.168.0.107`:

```nginx
upstream edulia_web {
    server 192.168.0.105:5200;  # adjust port
}

upstream edulia_api {
    server 192.168.0.103:8200;  # adjust port
}

upstream edulia_socketio {
    server 192.168.0.103:3200;  # adjust port
}

limit_req_zone $binary_remote_addr zone=edulia_login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=edulia_api:10m rate=100r/m;

server {
    listen 80;
    server_name edulia.YOUR_DOMAIN.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name edulia.YOUR_DOMAIN.com;

    ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 50M;

    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend SPA
    location / {
        proxy_pass http://edulia_web;
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        limit_req zone=edulia_api burst=20 nodelay;
        proxy_pass http://edulia_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth (strict rate limit)
    location /api/v1/auth/ {
        limit_req zone=edulia_login burst=3 nodelay;
        proxy_pass http://edulia_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://edulia_socketio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health
    location /api/health { proxy_pass http://edulia_api; }

    location ~ /\. { deny all; }
}
```

```bash
# Enable
ssh proxy "sudo ln -s /etc/nginx/sites-available/edulia /etc/nginx/sites-enabled/edulia \
  && sudo nginx -t && sudo systemctl reload nginx"
```

---

## 2. Frontend (VM 105 — frontend)

```bash
# Deploy
ssh frontend "
  mkdir -p /opt/edulia/frontend
  # rsync or git pull frontend build
"

# Serve via PM2
ssh frontend "
  pm2 serve /opt/edulia/frontend/dist 5200 --name edulia-frontend --spa
  # OR for Next.js:
  # pm2 start 'node server.js' --name edulia-frontend --cwd /opt/edulia/frontend
  pm2 save
"
```

---

## 3. Backend API + Workers (VM 103 — backend-server)

```bash
# Setup
ssh server "
  mkdir -p /opt/edulia/backend
  cd /opt/edulia/backend
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
"

# PM2 processes
ssh server "
  pm2 start 'source .venv/bin/activate && gunicorn app.main:app -w 4 \
    -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8200' \
    --name edulia-api --cwd /opt/edulia/backend

  pm2 start 'source .venv/bin/activate && celery -A worker.worker worker \
    -l warning -c 4 -Q default,notifications,pdf,email' \
    --name edulia-worker --cwd /opt/edulia/backend

  pm2 start 'source .venv/bin/activate && celery -A worker.worker beat -l warning' \
    --name edulia-beat --cwd /opt/edulia/backend

  pm2 save
"
```

Docker sidecars on VM 103:

```yaml
# /opt/edulia/docker-compose.yml on VM 103

version: "3.8"
services:
  clamav:
    image: clamav/clamav:stable
    ports:
      - "127.0.0.1:3310:3310"
    volumes:
      - clamav_data:/var/lib/clamav
    deploy:
      resources:
        limits:
          memory: 1G
    restart: always

volumes:
  clamav_data:
```

---

## 4. DocuSeal (VM 102 — storage)

```yaml
# /opt/edulia/docuseal/docker-compose.yml on VM 102

version: "3.8"
services:
  docuseal:
    image: docuseal/docuseal:latest
    ports:
      - "127.0.0.1:3001:3000"
    volumes:
      - docuseal_data:/data
    environment:
      DATABASE_URL: postgresql://edulia:${DB_PASSWORD}@192.168.0.101:5432/docuseal
      SECRET_KEY_BASE: ${DOCUSEAL_SECRET}
    restart: always

volumes:
  docuseal_data:
```

Add to Nginx proxy vhost:
```nginx
upstream edulia_docuseal { server 192.168.0.102:3001; }
location /sign/ { proxy_pass http://edulia_docuseal; }
```

---

## 5. Database (VM 101 — database)

Using Supabase PostgreSQL already running on VM 101:

```bash
ssh database "sudo -u postgres psql << 'EOF'
CREATE USER edulia WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE edulia OWNER edulia;
CREATE DATABASE docuseal OWNER edulia;

\c edulia
-- RLS applied via migrations
EOF"
```

`.env` on VM 103:
```env
DATABASE_URL=postgresql://edulia:PASSWORD@192.168.0.101:5432/edulia
REDIS_URL=redis://:REDIS_PASS@192.168.0.101:6379/3
CELERY_BROKER_URL=redis://:REDIS_PASS@192.168.0.101:6379/4
CELERY_RESULT_BACKEND=redis://:REDIS_PASS@192.168.0.101:6379/5
S3_ENDPOINT=http://192.168.0.101:9000
S3_ACCESS_KEY=MINIO_ACCESS_KEY
S3_SECRET_KEY=MINIO_SECRET_KEY
S3_BUCKET=edulia
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
DOCUSEAL_URL=http://192.168.0.102:3001
```

> ⚠️ **VM 101 disk is at 80% (24G/31G).** Run cleanup before Edulia adds data (`docker system prune`, check large dirs). Consider Proxmox disk expand if needed.

---

## 6. MinIO (VM 101)

Create Edulia buckets using `mc` CLI:

```bash
mc alias set proxmox http://192.168.0.101:9000 $ACCESS_KEY $SECRET_KEY
mc mb proxmox/edulia-uploads
mc mb proxmox/edulia-documents
mc mb proxmox/edulia-avatars
```

---

## 7. Monitoring (VM 106)

Add Edulia scrape targets to Prometheus on VM 106:

```yaml
# Append to /opt/monitoring/prometheus.yml on VM 106
scrape_configs:
  - job_name: "edulia-api"
    static_configs:
      - targets: ["192.168.0.103:8200"]
    metrics_path: /metrics
```

Then reload: `ssh monitoring "docker compose -f /opt/monitoring/docker-compose.yml exec prometheus kill -HUP 1"`

Import Grafana dashboards for FastAPI + Celery.

---

## SSH Quick Reference

```bash
# Access pattern (already configured in ~/.ssh/config)
ssh proxy        # VM 107 — Nginx
ssh frontend     # VM 105 — React apps
ssh server       # VM 103 — APIs + workers
ssh database     # VM 101 — PostgreSQL + MinIO + Redis
ssh storage      # VM 102 — DocuSeal + extra Docker
ssh monitoring   # VM 106 — Grafana

# Sudo (all VMs)
echo 'Tizen2023' | sudo -S <command>
```

---

## CI/CD (GitHub Actions)

```yaml
name: Deploy Edulia

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd apps/web && npm ci && npm run build
      - uses: appleboy/ssh-action@v1
        with:
          host: 65.108.14.251
          username: jndoye
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            rsync -az --delete apps/web/dist/ /opt/edulia/frontend/dist/
            pm2 restart edulia-frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: appleboy/ssh-action@v1
        with:
          host: 65.108.14.251
          username: jndoye
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/edulia/backend
            git pull origin main
            source .venv/bin/activate
            pip install -r requirements.txt
            alembic upgrade head
            pm2 restart edulia-api edulia-worker edulia-beat
```

---

## Scale-Up Triggers

Start on shared VMs. Create dedicated VMs when:

| Trigger | Action |
|---------|--------|
| VM 103 CPU > 70% sustained | Clone VM 103 → dedicated `edulia-server` |
| VM 105 RAM > 80% | Clone VM 105 → dedicated `edulia-frontend` |
| VM 101 disk > 85% | Expand VM disk (`qm resize 101 scsi0 +50G`) |
| Celery queue depth > 1000 | Add dedicated `edulia-worker` VM (clone from template 100) |

Cloning from `template-debian12` (VM 100) takes ~2 min on our Proxmox.
