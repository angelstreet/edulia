# Edulia — Installation Progress

Tracks the installation of Edulia on 3 dedicated VMs: database (121), storage (122), and app server (120). Once installed, the shared proxy (107) gets an Nginx vhost to expose the app. Each task maps to a section in the installation docs, with a verification command and expected output.

**Started:** 2026-03-01
**Last updated:** 2026-03-01

---

## Doc References

| Shorthand | Full path |
|-----------|-----------|
| INSTALL | `INSTALLATION-GUIDE.md` |
| INFRA | `10-INFRASTRUCTURE-PROXMOX.md` |

---

## Status Overview

| # | Task | VM | Ref | Status |
|---|------|----|-----|--------|
| 1 | Install PostgreSQL 16 | 121 | INSTALL §1.1 | Done |
| 2 | Tune PostgreSQL config | 121 | INSTALL §1.2 | Done |
| 3 | Configure pg_hba (firewall) | 121 | INSTALL §1.3 | Done |
| 4 | Create databases + extensions | 121 | INSTALL §1.4 | Done |
| 5 | Install Docker | 122 | INSTALL §2.1 | Done |
| 6 | Deploy MinIO + Redis (compose) | 122 | INSTALL §2.2–2.3 | Done |
| 7 | Create MinIO buckets | 122 | INSTALL §2.4 | Done |
| 8 | Verify Redis | 122 | INSTALL §2.5 | Done |
| 9 | Install system deps (Python, Node, Docker) | 120 | INSTALL §3.1 | Done |
| 10 | Clone project + venv | 120 | INSTALL §3.2 | Done |
| 11 | Write .env file | 120 | INSTALL §3.3 | Done |
| 12 | Deploy ClamAV + DocuSeal (compose) | 120 | INSTALL §3.4 | Done |
| 13 | Configure DocuSeal | 120 | INSTALL §3.5 | Done |
| 14 | Run DB migrations | 120 | INSTALL §3.6 | Done |
| 15 | Build frontend | 120 | INSTALL §3.7 | Done |
| 16 | Start PM2 services (3/5 online) | 120 | INSTALL §3.8 | Done |
| 17 | Seed initial data | 120 | INSTALL §3.9 | Done |
| 18 | Add Nginx vhost | 107 | INSTALL §4.1–4.2, INFRA §1 | Done |
| 19 | Install node_exporter (3 VMs) | 120/121/122 | INSTALL §5.1 | Done |
| 20 | Deploy Prometheus + Grafana | 122 | INSTALL §5.2 | Done |
| 21 | Run post-install checklist (8 checks) | all | INSTALL Post-Install | Done |

---

## VM 121 — Database (192.168.0.121)

- [x] **1. Install PostgreSQL 16**
  - Do: Install PostgreSQL 16 and contrib packages from apt
  - Ref: `INSTALLATION-GUIDE.md` §1.1
  - Test: `ssh edulia-db "psql --version"` → `psql (PostgreSQL) 16.x`

- [x] **2. Tune PostgreSQL config**
  - Do: Append performance settings to `postgresql.conf` (listen_addresses, shared_buffers 2GB, effective_cache_size 6GB, work_mem 32MB, WAL tuning)
  - Ref: `INSTALLATION-GUIDE.md` §1.2
  - Test: `ssh edulia-db "sudo -u postgres psql -c \"SHOW shared_buffers;\""` → `2GB`

- [x] **3. Configure pg_hba (firewall)**
  - Do: Restrict connections to edulia-app (192.168.0.120/32) only, reject all others
  - Ref: `INSTALLATION-GUIDE.md` §1.3
  - Test: `ssh edulia-db "sudo grep 'edulia' /etc/postgresql/16/main/pg_hba.conf"` → lines with `192.168.0.120/32 scram-sha-256`

- [x] **4. Create databases + extensions**
  - Do: Create user `edulia`, databases `edulia` + `docuseal`, enable extensions uuid-ossp, pgcrypto, unaccent
  - Ref: `INSTALLATION-GUIDE.md` §1.4
  - Test: `ssh edulia-db "sudo -u postgres psql -d edulia -c \"SELECT extname FROM pg_extension;\""` → uuid-ossp, pgcrypto, unaccent
  - Test: `ssh edulia-db "sudo -u postgres psql -c \"\\l\"" | grep -E "edulia|docuseal"` → both databases listed

---

## VM 122 — Storage (192.168.0.122)

- [x] **5. Install Docker**
  - Do: Install Docker via convenience script, enable on boot, add user to docker group
  - Ref: `INSTALLATION-GUIDE.md` §2.1
  - Test: `ssh edulia-storage "docker --version"` → `Docker version 2x.x`

- [x] **6. Deploy MinIO + Redis (compose)**
  - Do: Create `/opt/edulia/.env` with secrets, write `docker-compose.yml` (MinIO on 9000/9001, Redis on 6379), start services
  - Ref: `INSTALLATION-GUIDE.md` §2.2–2.3
  - Test: `ssh edulia-storage "docker compose -f /opt/edulia/docker-compose.yml ps"` → minio + redis running

- [x] **7. Create MinIO buckets**
  - Do: Install `mc` CLI, configure alias, create 3 buckets (edulia-uploads, edulia-avatars, edulia-documents)
  - Ref: `INSTALLATION-GUIDE.md` §2.4
  - Test: `ssh edulia-storage "mc ls edulia/"` → 3 buckets listed

- [x] **8. Verify Redis**
  - Do: Confirm Redis responds on all 3 DB numbers (0=cache+socketio, 1=celery broker, 2=celery results)
  - Ref: `INSTALLATION-GUIDE.md` §2.5
  - Test: `ssh edulia-storage "redis-cli -a REDIS_PASSWORD -n 0 PING"` → `PONG`
  - Test: `ssh edulia-storage "redis-cli -a REDIS_PASSWORD -n 1 PING"` → `PONG`
  - Test: `ssh edulia-storage "redis-cli -a REDIS_PASSWORD -n 2 PING"` → `PONG`

---

## VM 120 — App Server (192.168.0.120)

- [x] **9. Install system deps (Python, Node, Docker)**
  - Do: Install Python 3.11 + dev libs, WeasyPrint deps, Pillow deps, Docker, Node.js 20 LTS, PM2
  - Ref: `INSTALLATION-GUIDE.md` §3.1
  - Test: `ssh edulia-app "python3.11 --version"` → `Python 3.11.x`
  - Test: `ssh edulia-app "node -v"` → `v20.x`
  - Test: `ssh edulia-app "pm2 --version"` → version number
  - Test: `ssh edulia-app "docker --version"` → `Docker version 2x.x`

- [x] **10. Clone project + venv**
  - Do: Create `/opt/edulia/backend`, clone repo, create Python venv, install pip requirements
  - Ref: `INSTALLATION-GUIDE.md` §3.2
  - Test: `ssh edulia-app "ls /opt/edulia/backend/.venv/bin/activate"` → file exists
  - Test: `ssh edulia-app "source /opt/edulia/backend/.venv/bin/activate && pip list | wc -l"` → packages installed

- [x] **11. Write .env file**
  - Do: Create `/opt/edulia/backend/.env` with all config (DB, Redis, S3, JWT, SMTP, ClamAV, DocuSeal), chmod 600
  - Ref: `INSTALLATION-GUIDE.md` §3.3
  - Test: `ssh edulia-app "stat -c '%a' /opt/edulia/backend/.env"` → `600`
  - Test: `ssh edulia-app "grep DATABASE_URL /opt/edulia/backend/.env"` → connection string present

- [x] **12. Deploy ClamAV + DocuSeal (compose)**
  - Do: Write `/opt/edulia/docker-compose.yml` for ClamAV (port 3310) and DocuSeal (port 3002), start containers, wait for ClamAV to be ready
  - Ref: `INSTALLATION-GUIDE.md` §3.4
  - Test: `ssh edulia-app "docker exec edulia-clamav clamdscan --version"` → ClamAV version string
  - Test: `ssh edulia-app "docker compose -f /opt/edulia/docker-compose.yml ps"` → clamav + docuseal running

- [x] **13. Configure DocuSeal**
  - Do: SSH tunnel to DocuSeal admin (port 3002), create admin account, generate API key, add to `.env`
  - Ref: `INSTALLATION-GUIDE.md` §3.5
  - Test: `ssh edulia-app "curl -s http://127.0.0.1:3002/api/templates -H 'X-Auth-Token: YOUR_API_KEY'"` → JSON response (empty array initially)

- [ ] **14. Run DB migrations**
  - Do: Activate venv, run `alembic upgrade head` from `apps/api/`
  - Ref: `INSTALLATION-GUIDE.md` §3.6
  - Test: `ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && cd apps/api && python3 -c \"from app.db.database import engine; from sqlalchemy import inspect; tables = inspect(engine).get_table_names(); print(f'{len(tables)} tables created')\""` → `N tables created`

- [ ] **15. Build frontend**
  - Do: Create `.env.production` in `apps/web/`, run `npm ci && npm run build`, output to `dist/`
  - Ref: `INSTALLATION-GUIDE.md` §3.7
  - Test: `ssh edulia-app "ls /opt/edulia/backend/apps/web/dist/index.html"` → file exists

- [ ] **16. Start PM2 services (5 processes)**
  - Do: Start edulia-api (gunicorn+uvicorn :8000), edulia-socketio (:3001), edulia-worker (celery), edulia-beat (celery), edulia-frontend (pm2 serve :3000 --spa). Run `pm2 save` + `pm2 startup`
  - Ref: `INSTALLATION-GUIDE.md` §3.8
  - Test: `ssh edulia-app "pm2 list"` → 5 processes online (edulia-api, edulia-socketio, edulia-worker, edulia-beat, edulia-frontend)
  - Test: `ssh edulia-app "curl -s http://127.0.0.1:8000/api/health"` → `{"status": "healthy"}`

- [ ] **17. Seed initial data**
  - Do: Run `scripts/create_tenant.py` to create first tenant + admin user
  - Ref: `INSTALLATION-GUIDE.md` §3.9
  - Test: `ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && python3 -c \"from app.db.database import engine; from sqlalchemy import text; r = engine.execute(text('SELECT count(*) FROM tenants')); print(r.scalar())\""` → `1` (or more)

---

## VM 107 — Proxy (192.168.0.107)

- [x] **18. Add Nginx vhost**
  - Do: Create `/etc/nginx/sites-available/edulia` with upstreams (web :3000, api :8000, socketio :3001), rate limiting, SSL, security headers. Symlink to sites-enabled, test and reload
  - Ref: `INSTALLATION-GUIDE.md` §4.1–4.2, `10-INFRASTRUCTURE-PROXMOX.md` §1
  - Test: `ssh proxy "sudo nginx -t"` → `syntax is ok` / `test is successful`
  - Test: `ssh proxy "ls /etc/nginx/sites-enabled/edulia"` → file exists
  - Test: `ssh proxy "curl -s http://192.168.0.120:8000/api/health"` → `{"status": "healthy"}`

---

## VM 122 — Monitoring (on storage VM)

- [x] **19. Install node_exporter (3 VMs)**
  - Do: Download node_exporter v1.7.0 on VMs 120/121/122, install as systemd service, enable and start
  - Ref: `INSTALLATION-GUIDE.md` §5.1
  - Test: `for vm in edulia-app edulia-db edulia-storage; do ssh $vm "curl -s http://localhost:9100/metrics | head -1"; done` → each returns `# HELP ...`

- [x] **20. Deploy Prometheus + Grafana**
  - Do: Add Prometheus + Grafana containers to docker-compose on VM 122, configure scrape targets (node_exporter on 3 VMs + edulia-api)
  - Ref: `INSTALLATION-GUIDE.md` §5.2
  - Test: `ssh edulia-storage "curl -s http://localhost:9090/api/v1/targets"` → node targets up
  - Config: `/opt/edulia/prometheus/prometheus.yml`
  - Access Prometheus: `ssh -L 9090:127.0.0.1:9090 edulia-storage` → `http://localhost:9090`
  - Access Grafana: `ssh -L 3000:127.0.0.1:3000 edulia-storage` → `http://localhost:3000`

---

## Final Validation — Post-Install Checklist

All 8 checks from `INSTALLATION-GUIDE.md` Post-Install Checklist. Run after all VMs are set up.

- [ ] **Check 1: Database connectivity** (from VM 120)
  - Test: `ssh edulia-app "cd /opt/edulia/backend && source .venv/bin/activate && python3 -c \"from app.db.database import engine; print('DB OK')\""` → `DB OK`

- [ ] **Check 2: Redis connectivity** (from VM 120)
  - Test: `ssh edulia-app "redis-cli -h 192.168.0.122 -a REDIS_PASS -n 0 PING"` → `PONG`

- [ ] **Check 3: MinIO connectivity** (from VM 120)
  - Test: `ssh edulia-app "curl -s http://192.168.0.122:9000/minio/health/live"` → HTTP 200

- [ ] **Check 4: ClamAV** (from VM 120)
  - Test: `ssh edulia-app "docker exec edulia-clamav clamdscan --version"` → ClamAV version string

- [ ] **Check 5: DocuSeal** (from VM 120)
  - Test: `ssh edulia-app "curl -s http://127.0.0.1:3002/api/templates -H 'X-Auth-Token: KEY'"` → JSON response

- [ ] **Check 6: API health** (from VM 107)
  - Test: `ssh proxy "curl -s http://192.168.0.120:8000/api/health"` → `{"status": "healthy"}`

- [ ] **Check 7: Frontend** (from VM 107)
  - Test: `ssh proxy "curl -sI http://192.168.0.120:3000/"` → `HTTP/1.1 200 OK`

- [ ] **Check 8: Full stack** (from internet)
  - Test: `curl -s https://edulia.YOUR_DOMAIN.com/api/health` → `{"status": "healthy"}`
  - Test: `curl -sI https://edulia.YOUR_DOMAIN.com/` → `HTTP/2 200`
