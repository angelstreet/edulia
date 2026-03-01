# Edulia — Installation Guide

Step-by-step setup for each VM (excluding proxy, which only needs an Nginx vhost).

**Prerequisites:** SSH access configured, all VMs running Debian 12, `sudo` available.

```bash
# SSH aliases (already in ~/.ssh/config)
ssh frontend     # VM 105 — 192.168.0.105
ssh server       # VM 103 — 192.168.0.103
ssh database     # VM 101 — 192.168.0.101
```

---

## VM 101 — Database (192.168.0.101)

This VM already runs Supabase PostgreSQL, Redis, and MinIO. We add Edulia databases and buckets.

### 1.1 PostgreSQL — Create databases & user

```bash
ssh database
```

```bash
sudo -u postgres psql << 'EOF'
-- Create user
CREATE USER edulia WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

-- Main database
CREATE DATABASE edulia OWNER edulia;

-- DocuSeal database (e-signature service)
CREATE DATABASE docuseal OWNER edulia;

-- Grant permissions
\c edulia
GRANT ALL PRIVILEGES ON SCHEMA public TO edulia;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- for French search without accents

-- Verify
\l
EOF
```

**Verify:**
```bash
psql -U edulia -h 127.0.0.1 -d edulia -c "SELECT version();"
# Should return PostgreSQL 15+ version
```

### 1.2 Redis — Reserve DB numbers

Redis is already running. Edulia uses 3 separate DB numbers to avoid collisions with other apps.

```bash
# Check which DBs are in use
redis-cli -a REDIS_PASS INFO keyspace

# Test Edulia DBs are empty
redis-cli -a REDIS_PASS -n 3 DBSIZE   # cache → should be 0
redis-cli -a REDIS_PASS -n 4 DBSIZE   # celery broker → should be 0
redis-cli -a REDIS_PASS -n 5 DBSIZE   # celery results → should be 0
```

| DB | Purpose |
|----|---------|
| 3 | App cache + Socket.IO |
| 4 | Celery broker |
| 5 | Celery result backend |

**Verify:**
```bash
redis-cli -a REDIS_PASS -n 3 PING
# Should return PONG
```

### 1.3 MinIO — Create buckets

```bash
# If mc (MinIO client) not installed:
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && sudo mv mc /usr/local/bin/

# Configure alias
mc alias set local http://127.0.0.1:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# Create Edulia buckets
mc mb local/edulia-uploads      # homework, documents, general uploads
mc mb local/edulia-avatars      # user profile pictures (sm/md/lg)
mc mb local/edulia-documents    # generated PDFs (report cards, invoices)

# Verify
mc ls local/
```

### 1.4 Check disk space

```bash
df -h /
# ⚠ VM 101 was at 80% — clean up before proceeding
docker system prune -a --volumes   # remove unused Docker artifacts
sudo journalctl --vacuum-size=200M # trim logs
```

**VM 101 is done.** No new services to install — just databases and buckets on existing infra.

---

## VM 103 — Backend Server (192.168.0.103)

This VM runs the FastAPI API, Celery workers, Socket.IO server, and ClamAV (Docker sidecar).

### 2.1 System dependencies

```bash
ssh server
```

```bash
sudo apt update && sudo apt install -y \
  python3.11 python3.11-venv python3.11-dev \
  build-essential libpq-dev libffi-dev \
  libcairo2-dev libpango1.0-dev libgdk-pixbuf2.0-dev \
  libjpeg-dev libwebp-dev \
  docker.io docker-compose-plugin \
  git curl

# WeasyPrint dependencies (PDF generation)
sudo apt install -y \
  libharfbuzz-dev libfribidi-dev

# Add current user to docker group (avoid sudo for docker)
sudo usermod -aG docker $USER
newgrp docker
```

**Why these packages:**
- `python3.11-dev`, `build-essential`, `libpq-dev` — compile Python C extensions (psycopg2, etc.)
- `libcairo2-dev`, `libpango1.0-dev` — WeasyPrint (HTML→PDF)
- `libjpeg-dev`, `libwebp-dev` — Pillow (avatar thumbnail generation)
- `docker.io` — for ClamAV sidecar

### 2.2 Project setup

```bash
# Create project directory
sudo mkdir -p /opt/edulia/backend
sudo chown $USER:$USER /opt/edulia/backend

# Clone repo (backend only)
cd /opt/edulia/backend
git clone --depth 1 https://github.com/YOUR_ORG/edulia.git .

# Python virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r apps/api/requirements.txt
pip install -r worker/requirements.txt
```

### 2.3 Environment file

```bash
cat > /opt/edulia/backend/.env << 'EOF'
# === Core ===
APP_NAME=EduCore
APP_ENV=production
APP_URL=https://edulia.YOUR_DOMAIN.com
APP_PORT=8200

# === Database ===
DATABASE_URL=postgresql://edulia:CHANGE_ME@192.168.0.101:5432/edulia
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# === Redis ===
REDIS_URL=redis://:REDIS_PASS@192.168.0.101:6379/3
CELERY_BROKER_URL=redis://:REDIS_PASS@192.168.0.101:6379/4
CELERY_RESULT_BACKEND=redis://:REDIS_PASS@192.168.0.101:6379/5
SOCKETIO_REDIS_URL=redis://:REDIS_PASS@192.168.0.101:6379/3

# === Auth ===
JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# === Storage (MinIO on VM 101) ===
S3_ENDPOINT=http://192.168.0.101:9000
S3_BUCKET=edulia-uploads
S3_ACCESS_KEY=MINIO_ACCESS_KEY
S3_SECRET_KEY=MINIO_SECRET_KEY
S3_REGION=us-east-1

# === Email (Brevo) ===
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=YOUR_BREVO_LOGIN
SMTP_PASSWORD=YOUR_BREVO_KEY
EMAIL_FROM=noreply@edulia.YOUR_DOMAIN.com

# === ClamAV (local Docker sidecar) ===
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310

# === DocuSeal (VM 102) ===
DOCUSEAL_URL=http://192.168.0.102:3001
DOCUSEAL_API_KEY=GENERATE_AFTER_DOCUSEAL_SETUP

# === Payments (optional — enable when ready) ===
# STRIPE_SECRET_KEY=sk_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# === Push Notifications ===
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
# VAPID_MAILTO=mailto:admin@edulia.YOUR_DOMAIN.com

# === RGPD ===
DATA_RETENTION_YEARS=3
GDPR_DPO_EMAIL=dpo@YOUR_DOMAIN.com
EOF

# Secure the file
chmod 600 /opt/edulia/backend/.env
```

**Generate JWT secret:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2.4 Run database migrations

```bash
cd /opt/edulia/backend
source .venv/bin/activate
cd apps/api

# Run Alembic migrations
alembic upgrade head

# Verify tables created
python3 -c "
from app.db.database import engine
from sqlalchemy import inspect
tables = inspect(engine).get_table_names()
print(f'{len(tables)} tables created: {tables[:5]}...')
"
```

### 2.5 ClamAV (Docker sidecar)

```bash
# Create compose file for ClamAV
mkdir -p /opt/edulia/docker
cat > /opt/edulia/docker/docker-compose.yml << 'EOF'
version: "3.8"
services:
  clamav:
    image: clamav/clamav:stable
    container_name: edulia-clamav
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
EOF

# Start ClamAV
cd /opt/edulia/docker
docker compose up -d

# Wait for virus definitions to download (~2-3 minutes on first start)
docker compose logs -f clamav
# Wait until you see "ClamAV daemon is ready"
# Ctrl+C to exit logs
```

**Verify ClamAV:**
```bash
# Test connection
python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(('127.0.0.1', 3310))
s.send(b'PING\n')
print(s.recv(1024))  # Should print b'PONG\n'
s.close()
"
```

### 2.6 Start services with PM2

```bash
# Install PM2 if not present
which pm2 || npm install -g pm2

cd /opt/edulia/backend

# 1. FastAPI (Gunicorn + Uvicorn workers)
pm2 start "source .venv/bin/activate && cd apps/api && gunicorn app.main:app \
  -w 4 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8200 \
  --timeout 120 \
  --access-logfile /opt/edulia/backend/logs/access.log \
  --error-logfile /opt/edulia/backend/logs/error.log" \
  --name edulia-api

# 2. Celery Worker
pm2 start "source .venv/bin/activate && cd apps/api && celery -A worker.worker worker \
  -l warning -c 4 \
  -Q default,notifications,pdf,email \
  --max-tasks-per-child=100" \
  --name edulia-worker

# 3. Celery Beat (scheduler — one instance only)
pm2 start "source .venv/bin/activate && cd apps/api && celery -A worker.worker beat \
  -l warning \
  --schedule /opt/edulia/backend/celerybeat-schedule" \
  --name edulia-beat

# 4. Socket.IO server
pm2 start "source .venv/bin/activate && cd apps/socketio && python server.py" \
  --name edulia-socketio

# Create logs directory
mkdir -p /opt/edulia/backend/logs

# Save PM2 process list (survives reboot)
pm2 save

# Enable PM2 startup on boot
pm2 startup systemd
# Run the command it outputs
```

**Verify all services:**
```bash
pm2 list
# Should show: edulia-api (online), edulia-worker (online), edulia-beat (online), edulia-socketio (online)

# Test API health
curl http://127.0.0.1:8200/api/health
# Should return: {"status": "healthy"}

# Test from proxy VM
ssh proxy "curl -s http://192.168.0.103:8200/api/health"
```

### 2.7 Seed initial data (first time only)

```bash
cd /opt/edulia/backend
source .venv/bin/activate

# Create first tenant + admin user
python3 scripts/create_tenant.py \
  --name "My School" \
  --slug "my-school" \
  --type school \
  --admin-email admin@my-school.fr \
  --admin-password "CHANGE_ME"
```

---

## VM 105 — Frontend (192.168.0.105)

This VM serves the React SPA via PM2.

### 3.1 System dependencies

```bash
ssh frontend
```

```bash
# Node.js 20 LTS (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Verify
node -v   # v20.x
npm -v    # 10.x

# PM2 (if not already installed)
which pm2 || sudo npm install -g pm2
```

### 3.2 Build and deploy

```bash
# Create project directory
sudo mkdir -p /opt/edulia/frontend
sudo chown $USER:$USER /opt/edulia/frontend

# Clone and build
cd /opt/edulia
git clone --depth 1 https://github.com/YOUR_ORG/edulia.git repo
cd repo/apps/web

# Create production env
cat > .env.production << 'EOF'
VITE_API_URL=https://edulia.YOUR_DOMAIN.com/api
VITE_SOCKETIO_URL=https://edulia.YOUR_DOMAIN.com
VITE_APP_NAME=EduCore
EOF

# Install and build
npm ci
npm run build
# Output goes to dist/

# Copy build output
cp -r dist/* /opt/edulia/frontend/
```

### 3.3 Serve with PM2

```bash
# Serve static SPA on port 5200
pm2 serve /opt/edulia/frontend 5200 --name edulia-frontend --spa

# Save and enable startup
pm2 save
pm2 startup systemd
# Run the command it outputs
```

**The `--spa` flag** makes PM2 return `index.html` for all routes (React Router needs this).

**Verify:**
```bash
pm2 list
# Should show: edulia-frontend (online)

curl -s http://127.0.0.1:5200/ | head -5
# Should return HTML with React app

# Test from proxy
ssh proxy "curl -sI http://192.168.0.105:5200/"
# Should return 200 OK
```

### 3.4 Update process (for future deployments)

```bash
# On frontend VM:
cd /opt/edulia/repo
git pull origin main
cd apps/web
npm ci && npm run build
cp -r dist/* /opt/edulia/frontend/
pm2 restart edulia-frontend
```

---

## VM 102 — DocuSeal (192.168.0.102)

E-signature service. Runs as a Docker container.

### 4.1 Setup

```bash
ssh storage
```

```bash
# Install Docker if not present
which docker || (sudo apt update && sudo apt install -y docker.io docker-compose-plugin)
sudo usermod -aG docker $USER && newgrp docker

# Create directory
sudo mkdir -p /opt/edulia/docuseal
sudo chown $USER:$USER /opt/edulia/docuseal

# Docker Compose
cat > /opt/edulia/docuseal/docker-compose.yml << 'EOF'
version: "3.8"
services:
  docuseal:
    image: docuseal/docuseal:latest
    container_name: edulia-docuseal
    ports:
      - "127.0.0.1:3001:3000"
    volumes:
      - docuseal_data:/data
    environment:
      DATABASE_URL: postgresql://edulia:CHANGE_ME@192.168.0.101:5432/docuseal
      SECRET_KEY_BASE: GENERATE_64_CHAR_SECRET
    restart: always

volumes:
  docuseal_data:
EOF

# Generate secret
python3 -c "import secrets; print(secrets.token_hex(32))"
# Paste into SECRET_KEY_BASE above

# Start
cd /opt/edulia/docuseal
docker compose up -d

# Check logs
docker compose logs -f
# Wait for "Listening on http://0.0.0.0:3000"
# Ctrl+C
```

### 4.2 Initial configuration

```bash
# Access DocuSeal admin (via SSH tunnel for first setup)
# From your local machine:
ssh -L 3001:192.168.0.102:3001 storage

# Open http://localhost:3001 in browser
# Create admin account
# Go to Settings → API → Generate API key
# Copy the API key → paste into VM 103's .env as DOCUSEAL_API_KEY
```

**Verify:**
```bash
curl -s http://127.0.0.1:3001/api/templates \
  -H "X-Auth-Token: YOUR_API_KEY" | head
# Should return JSON (empty array initially)
```

---

## Post-Install Checklist

Run this after all VMs are set up:

```bash
# 1. Database connectivity (from VM 103)
ssh server "cd /opt/edulia/backend && source .venv/bin/activate && \
  python3 -c \"from app.db.database import engine; print('DB OK')\" "

# 2. Redis connectivity (from VM 103)
ssh server "redis-cli -h 192.168.0.101 -a REDIS_PASS -n 3 PING"

# 3. MinIO connectivity (from VM 103)
ssh server "curl -s http://192.168.0.101:9000/minio/health/live"

# 4. ClamAV (from VM 103)
ssh server "docker exec edulia-clamav clamdscan --version"

# 5. DocuSeal (from VM 102)
ssh storage "curl -s http://127.0.0.1:3001/api/templates -H 'X-Auth-Token: KEY'"

# 6. API health (from VM 107)
ssh proxy "curl -s http://192.168.0.103:8200/api/health"

# 7. Frontend (from VM 107)
ssh proxy "curl -sI http://192.168.0.105:5200/"

# 8. Full stack (from internet)
curl -s https://edulia.YOUR_DOMAIN.com/api/health
curl -sI https://edulia.YOUR_DOMAIN.com/
```

All 8 checks should pass before going live.

---

## Quick Reference

| What | Where | Command |
|------|-------|---------|
| View API logs | VM 103 | `pm2 logs edulia-api` |
| View worker logs | VM 103 | `pm2 logs edulia-worker` |
| Restart API | VM 103 | `pm2 restart edulia-api` |
| Restart all backend | VM 103 | `pm2 restart edulia-api edulia-worker edulia-beat edulia-socketio` |
| Restart frontend | VM 105 | `pm2 restart edulia-frontend` |
| Run migrations | VM 103 | `cd /opt/edulia/backend/apps/api && source ../.venv/bin/activate && alembic upgrade head` |
| ClamAV logs | VM 103 | `docker logs edulia-clamav` |
| DocuSeal logs | VM 102 | `cd /opt/edulia/docuseal && docker compose logs` |
| DB console | VM 101 | `psql -U edulia -h 127.0.0.1 -d edulia` |
| Redis console | VM 101 | `redis-cli -a REDIS_PASS -n 3` |
| Check disk | VM 101 | `df -h /` |
| PM2 monitor | any VM | `pm2 monit` |
