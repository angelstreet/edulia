# 09 — Infrastructure (Proxmox)

Production runs on a Proxmox hypervisor with isolated VMs and LXC containers, segmented VLANs, and a clear migration path to cloud when scaling requires it.

Local development still uses Docker Compose on the developer's machine.

---

## Architecture Overview

```
                         INTERNET
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        PROXMOX HOST                                      │
│                                                                          │
│  ┌─── VLAN 10 — DMZ (public-facing) ──────────────────────────────────┐  │
│  │                                                                    │  │
│  │   ┌──────────────────────────┐                                     │  │
│  │   │  VM: edge-proxy          │  Nginx reverse proxy + Let's        │  │
│  │   │  Ubuntu 22.04 LTS        │  Encrypt SSL + WAF (ModSecurity)    │  │
│  │   │  1 vCPU / 512 MB / 10 GB │  Only host with public IP           │  │
│  │   │  Public IP: x.x.x.x     │  Forwards to VLAN 20                │  │
│  │   └──────────┬───────────────┘                                     │  │
│  └──────────────┼─────────────────────────────────────────────────────┘  │
│                 │ (proxy_pass to VLAN 20)                                │
│  ┌──────────────┼─────────────────────────────────────────────────────┐  │
│  │  VLAN 20 — APP (application tier) ─────────────────────────────────│  │
│  │              │                                                     │  │
│  │   ┌──────────▼───────────────┐   ┌─────────────────────────────┐   │  │
│  │   │  LXC: app-server         │   │  LXC: worker                │   │  │
│  │   │  Ubuntu 22.04             │   │  Ubuntu 22.04               │   │  │
│  │   │  4 vCPU / 4 GB / 30 GB   │   │  2 vCPU / 2 GB / 20 GB     │   │  │
│  │   │                           │   │                             │   │  │
│  │   │  Docker Compose:          │   │  Docker Compose:            │   │  │
│  │   │  ├── api (FastAPI ×4w)    │   │  ├── celery-worker (×4)     │   │  │
│  │   │  ├── socketio             │   │  ├── celery-beat            │   │  │
│  │   │  └── web (React static)   │   │  └── clamav                 │   │  │
│  │   └──────────────────────────┘   └─────────────────────────────┘   │  │
│  │                                                                     │  │
│  │   ┌──────────────────────────┐                                     │  │
│  │   │  LXC: services           │                                     │  │
│  │   │  Ubuntu 22.04             │                                     │  │
│  │   │  2 vCPU / 2 GB / 20 GB   │                                     │  │
│  │   │                           │                                     │  │
│  │   │  Docker Compose:          │                                     │  │
│  │   │  ├── docuseal             │                                     │  │
│  │   │  └── jitsi (optional)     │                                     │  │
│  │   └──────────────────────────┘                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  VLAN 30 — DATA (database tier, no internet access) ───────────────│  │
│  │                                                                    │  │
│  │   ┌──────────────────────────┐   ┌─────────────────────────────┐   │  │
│  │   │  VM: db-server            │   │  LXC: cache                │   │  │
│  │   │  Ubuntu 22.04             │   │  Ubuntu 22.04               │   │  │
│  │   │  4 vCPU / 8 GB / 200 GB  │   │  1 vCPU / 1 GB / 10 GB     │   │  │
│  │   │  SSD / ZFS               │   │                             │   │  │
│  │   │                           │   │  Docker:                    │   │  │
│  │   │  PostgreSQL 16 (bare)     │   │  └── redis                  │   │  │
│  │   │  Not in Docker — native   │   │      (3 DBs: cache,broker,  │   │  │
│  │   │  for max I/O performance  │   │       pubsub)               │   │  │
│  │   └──────────────────────────┘   └─────────────────────────────┘   │  │
│  │                                                                    │  │
│  │   ┌──────────────────────────┐                                     │  │
│  │   │  LXC: storage            │                                     │  │
│  │   │  Ubuntu 22.04             │                                     │  │
│  │   │  1 vCPU / 1 GB / 500 GB  │                                     │  │
│  │   │  HDD (bulk storage)      │                                     │  │
│  │   │                           │                                     │  │
│  │   │  Docker:                   │                                     │  │
│  │   │  └── minio                │                                     │  │
│  │   └──────────────────────────┘                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  VLAN 40 — MGMT (monitoring, backups, admin access only) ──────────│  │
│  │                                                                    │  │
│  │   ┌──────────────────────────┐   ┌─────────────────────────────┐   │  │
│  │   │  LXC: monitoring         │   │  LXC: backup                │   │  │
│  │   │  Ubuntu 22.04             │   │  Ubuntu 22.04               │   │  │
│  │   │  2 vCPU / 2 GB / 50 GB   │   │  1 vCPU / 512 MB / 1 TB    │   │  │
│  │   │                           │   │  HDD (backup storage)      │   │  │
│  │   │  Docker Compose:          │   │                             │   │  │
│  │   │  ├── prometheus           │   │  ├── pg_dump cron           │   │  │
│  │   │  ├── grafana              │   │  ├── minio backup sync     │   │  │
│  │   │  ├── loki                 │   │  └── rclone (offsite S3)   │   │  │
│  │   │  └── alertmanager         │   │                             │   │  │
│  │   └──────────────────────────┘   └─────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## VLAN Design

| VLAN | Name | Subnet | Purpose | Internet Access |
|------|------|--------|---------|-----------------|
| 10 | DMZ | 10.10.10.0/24 | Reverse proxy only | Yes (public IP) |
| 20 | APP | 10.10.20.0/24 | Application servers | Outbound only (for email, Stripe, Jitsi) |
| 30 | DATA | 10.10.30.0/24 | Databases, cache, storage | **No** — fully isolated |
| 40 | MGMT | 10.10.40.0/24 | Monitoring, backups, admin SSH | Outbound only (for offsite backup) |

### Firewall Rules

```
# VLAN 10 (DMZ) → VLAN 20 (APP)
ALLOW  10.10.10.0/24 → 10.10.20.10:80    (proxy → web)
ALLOW  10.10.10.0/24 → 10.10.20.10:8000  (proxy → api)
ALLOW  10.10.10.0/24 → 10.10.20.10:3001  (proxy → socketio)
DENY   10.10.10.0/24 → 10.10.30.0/24     (DMZ cannot reach DATA)

# VLAN 20 (APP) → VLAN 30 (DATA)
ALLOW  10.10.20.0/24 → 10.10.30.10:5432  (app → postgres)
ALLOW  10.10.20.0/24 → 10.10.30.11:6379  (app → redis)
ALLOW  10.10.20.0/24 → 10.10.30.12:9000  (app → minio)
ALLOW  10.10.20.20 → 10.10.30.10:5432    (worker → postgres)
ALLOW  10.10.20.20 → 10.10.30.11:6379    (worker → redis)
ALLOW  10.10.20.20 → 10.10.30.12:9000    (worker → minio)

# VLAN 20 (APP) → Internet (outbound only)
ALLOW  10.10.20.0/24 → 0.0.0.0:443       (Brevo email, Stripe, Jitsi)
DENY   0.0.0.0 → 10.10.20.0/24           (no inbound from internet)

# VLAN 30 (DATA) — isolated
DENY   10.10.30.0/24 → 0.0.0.0           (no internet)
DENY   10.10.30.0/24 → 10.10.10.0/24     (no access to DMZ)

# VLAN 40 (MGMT) → everything (monitoring)
ALLOW  10.10.40.0/24 → 10.10.20.0/24     (scrape metrics)
ALLOW  10.10.40.0/24 → 10.10.30.0/24     (DB backups, metrics)
ALLOW  10.10.40.10 → 0.0.0.0:443         (offsite backup upload)
```

---

## VM/LXC Inventory

### Why LXC for most, VM for database

- **LXC containers** — lightweight (shared kernel), fast startup, less overhead. Perfect for stateless app servers and small services.
- **VM for PostgreSQL** — full kernel isolation, dedicated I/O scheduler, ZFS/LVM snapshots for instant backup, can tune kernel parameters (huge pages, swappiness). Database performance is critical.

| Name | Type | VLAN | IP | vCPU | RAM | Disk | OS |
|------|------|------|----|------|-----|------|----|
| **edge-proxy** | LXC | 10 | 10.10.10.10 + Public | 1 | 512 MB | 10 GB SSD | Ubuntu 22.04 |
| **app-server** | LXC | 20 | 10.10.20.10 | 4 | 4 GB | 30 GB SSD | Ubuntu 22.04 |
| **worker** | LXC | 20 | 10.10.20.20 | 2 | 2 GB | 20 GB SSD | Ubuntu 22.04 |
| **services** | LXC | 20 | 10.10.20.30 | 2 | 2 GB | 20 GB SSD | Ubuntu 22.04 |
| **db-server** | VM | 30 | 10.10.30.10 | 4 | 8 GB | 200 GB SSD (ZFS) | Ubuntu 22.04 |
| **cache** | LXC | 30 | 10.10.30.11 | 1 | 1 GB | 10 GB SSD | Ubuntu 22.04 |
| **storage** | LXC | 30 | 10.10.30.12 | 1 | 1 GB | 500 GB HDD | Ubuntu 22.04 |
| **monitoring** | LXC | 40 | 10.10.40.10 | 2 | 2 GB | 50 GB SSD | Ubuntu 22.04 |
| **backup** | LXC | 40 | 10.10.40.20 | 1 | 512 MB | 1 TB HDD | Ubuntu 22.04 |

**Total Proxmox host requirements:** 18 vCPU, 21 GB RAM, ~850 GB storage

**Recommended Proxmox hardware:** 32 GB RAM, 8-core CPU (Ryzen 7 / Xeon), 2× 1TB NVMe (ZFS mirror for VMs) + 2× 2TB HDD (backup/storage)

---

## Per-Node Setup

### 1. edge-proxy (VLAN 10 — DMZ)

The only node with a public IP. Runs Nginx with SSL and proxies everything into VLAN 20.

```bash
# Install on LXC
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx

# Enable firewall
ufw default deny incoming
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 10.10.40.0/24 to any port 22  # SSH from MGMT only
ufw enable
```

```nginx
# /etc/nginx/sites-available/edulia.conf

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

upstream app_api {
    server 10.10.20.10:8000;
}

upstream app_web {
    server 10.10.20.10:80;
}

upstream app_socketio {
    server 10.10.20.10:3001;
}

server {
    listen 80;
    server_name edulia.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name edulia.example.com;

    # SSL (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/edulia.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/edulia.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' wss:" always;

    # File upload limit
    client_max_body_size 50M;

    # Frontend (React SPA)
    location / {
        proxy_pass http://app_web;
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://app_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Login rate limiting (stricter)
    location /api/v1/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://app_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://app_socketio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check (unauthenticated, for uptime monitoring)
    location /api/health {
        proxy_pass http://app_api;
    }

    # Block sensitive paths
    location ~ /\. { deny all; }
    location ~ /(\.env|docker-compose|Makefile) { deny all; }
}
```

### 2. app-server (VLAN 20 — APP)

Runs the application stack in Docker.

```yaml
# /opt/edulia/docker-compose.yml on app-server

version: "3.8"

services:
  web:
    image: edulia/web:latest
    ports:
      - "80:80"
    restart: always

  api:
    image: edulia/api:latest
    ports:
      - "8000:8000"
    env_file: /opt/edulia/.env
    environment:
      DATABASE_URL: postgresql://edulia:${DB_PASSWORD}@10.10.30.10:5432/edulia
      REDIS_URL: redis://10.10.30.11:6379/0
      CELERY_BROKER_URL: redis://10.10.30.11:6379/1
      S3_ENDPOINT: http://10.10.30.12:9000
      CLAMAV_HOST: 10.10.20.20           # worker node runs ClamAV
      DOCUSEAL_URL: http://10.10.20.30:3000
    command: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
    restart: always

  socketio:
    image: edulia/socketio:latest
    ports:
      - "3001:3001"
    environment:
      REDIS_URL: redis://10.10.30.11:6379/2
      JWT_SECRET: ${JWT_SECRET}
    restart: always
```

### 3. worker (VLAN 20 — APP)

Background jobs + virus scanning.

```yaml
# /opt/edulia/docker-compose.yml on worker

version: "3.8"

services:
  celery-worker:
    image: edulia/api:latest
    env_file: /opt/edulia/.env
    environment:
      DATABASE_URL: postgresql://edulia:${DB_PASSWORD}@10.10.30.10:5432/edulia
      REDIS_URL: redis://10.10.30.11:6379/0
      CELERY_BROKER_URL: redis://10.10.30.11:6379/1
      S3_ENDPOINT: http://10.10.30.12:9000
      CLAMAV_HOST: localhost
      CLAMAV_PORT: 3310
    command: celery -A worker.worker worker -l warning -c 4 -Q default,notifications,pdf,email
    restart: always

  celery-beat:
    image: edulia/api:latest
    env_file: /opt/edulia/.env
    environment:
      CELERY_BROKER_URL: redis://10.10.30.11:6379/1
    command: celery -A worker.worker beat -l warning
    restart: always

  clamav:
    image: clamav/clamav:stable
    ports:
      - "3310:3310"
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

### 4. services (VLAN 20 — APP)

DocuSeal and optionally self-hosted Jitsi.

```yaml
# /opt/edulia/docker-compose.yml on services

version: "3.8"

services:
  docuseal:
    image: docuseal/docuseal:latest
    ports:
      - "3000:3000"
    volumes:
      - docuseal_data:/data
    environment:
      DATABASE_URL: postgresql://edulia:${DB_PASSWORD}@10.10.30.10:5432/docuseal
      SECRET_KEY_BASE: ${DOCUSEAL_SECRET}
    restart: always

  # Uncomment to self-host Jitsi
  # jitsi-web:
  #   image: jitsi/web:stable
  #   ports:
  #     - "8443:443"
  #   environment:
  #     ENABLE_AUTH: 1
  #     AUTH_TYPE: jwt
  #   volumes:
  #     - jitsi_web:/config
  #   restart: always

volumes:
  docuseal_data:
```

### 5. db-server (VLAN 30 — DATA)

**PostgreSQL installed natively** (not Docker) for maximum I/O performance and ZFS snapshot support.

```bash
# Install PostgreSQL 16 natively
apt-get install -y postgresql-16 postgresql-contrib-16

# Configure for performance
cat >> /etc/postgresql/16/main/postgresql.conf << 'EOF'

# === Edulia tuning ===
listen_addresses = '10.10.30.10'
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 32MB
maintenance_work_mem = 512MB
wal_level = replica
archive_mode = on
archive_command = 'gzip < %p > /var/backups/postgresql/wal/%f.gz'
max_wal_size = 2GB
min_wal_size = 512MB
random_page_cost = 1.1         # SSD
effective_io_concurrency = 200  # SSD
log_min_duration_statement = 200  # log slow queries (>200ms)
EOF

# pg_hba.conf — allow from VLAN 20 only
cat >> /etc/postgresql/16/main/pg_hba.conf << 'EOF'
# App servers (VLAN 20)
host  edulia   edulia   10.10.20.0/24   scram-sha-256
# Backup server (VLAN 40)
host  edulia   backup    10.10.40.20/32  scram-sha-256
# DocuSeal
host  docuseal  edulia   10.10.20.30/32  scram-sha-256
# Deny everything else
host  all       all       0.0.0.0/0       reject
EOF

systemctl restart postgresql

# Create databases
sudo -u postgres psql << 'EOF'
CREATE USER edulia WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE edulia OWNER edulia;
CREATE DATABASE docuseal OWNER edulia;
CREATE USER backup WITH PASSWORD 'CHANGE_ME_TOO';
GRANT CONNECT ON DATABASE edulia TO backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup;

-- Enable Row Level Security
\c edulia
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- (applied to all tenant-scoped tables via migration)
EOF

# ZFS snapshots for instant backup
# Assumes ZFS pool "tank" with dataset "tank/pgdata"
# Automated daily snapshot:
cat > /etc/cron.d/pg-snapshot << 'EOF'
0 2 * * * root zfs snapshot tank/pgdata@daily-$(date +\%Y\%m\%d) && zfs destroy tank/pgdata@daily-$(date -d '7 days ago' +\%Y\%m\%d) 2>/dev/null
EOF
```

### 6. cache (VLAN 30 — DATA)

```yaml
# /opt/edulia/docker-compose.yml on cache

version: "3.8"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    command: >
      redis-server
        --appendonly yes
        --maxmemory 768mb
        --maxmemory-policy allkeys-lru
        --bind 0.0.0.0
        --requirepass ${REDIS_PASSWORD}
        --rename-command FLUSHALL ""
        --rename-command FLUSHDB ""
    restart: always

volumes:
  redisdata:
```

### 7. storage (VLAN 30 — DATA)

```yaml
# /opt/edulia/docker-compose.yml on storage

version: "3.8"

services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "127.0.0.1:9001:9001"  # console only locally
    volumes:
      - /mnt/storage/minio:/data   # mounted HDD
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    restart: always
```

### 8. monitoring (VLAN 40 — MGMT)

```yaml
# /opt/monitoring/docker-compose.yml on monitoring

version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: always

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_SERVER_ROOT_URL: https://monitor.edulia.example.com
    restart: always

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
    restart: always

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    restart: always

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

```yaml
# prometheus.yml — scrape targets across VLANs
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "api"
    static_configs:
      - targets: ["10.10.20.10:8000"]

  - job_name: "postgres"
    static_configs:
      - targets: ["10.10.30.10:9187"]  # postgres_exporter

  - job_name: "redis"
    static_configs:
      - targets: ["10.10.30.11:9121"]  # redis_exporter

  - job_name: "minio"
    static_configs:
      - targets: ["10.10.30.12:9000"]
    metrics_path: /minio/v2/metrics/cluster

  - job_name: "nginx"
    static_configs:
      - targets: ["10.10.10.10:9113"]  # nginx_exporter

  - job_name: "node"   # OS metrics from all nodes
    static_configs:
      - targets:
          - "10.10.10.10:9100"   # edge-proxy
          - "10.10.20.10:9100"   # app-server
          - "10.10.20.20:9100"   # worker
          - "10.10.30.10:9100"   # db-server
```

### 9. backup (VLAN 40 — MGMT)

```bash
#!/bin/bash
# /opt/backup/backup.sh — runs daily via cron on backup node

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/mnt/backup"

echo "[$(date)] Starting backup..."

# 1. PostgreSQL dump (connects to db-server via VLAN 30)
PGPASSWORD=${DB_BACKUP_PASSWORD} pg_dump \
  -h 10.10.30.10 -U backup -Fc edulia \
  > ${BACKUP_DIR}/db/edulia_${DATE}.dump
gzip ${BACKUP_DIR}/db/edulia_${DATE}.dump

# 2. Sync MinIO files to local backup
rclone sync minio:edulia ${BACKUP_DIR}/files/ \
  --config /opt/backup/rclone.conf

# 3. Offsite copy (optional — to external S3 or Backblaze B2)
if [ -n "$OFFSITE_BUCKET" ]; then
  rclone copy ${BACKUP_DIR}/db/edulia_${DATE}.dump.gz \
    offsite:${OFFSITE_BUCKET}/db/ \
    --config /opt/backup/rclone.conf
fi

# 4. Cleanup local backups > 30 days
find ${BACKUP_DIR}/db -name "*.dump.gz" -mtime +30 -delete

echo "[$(date)] Backup completed"
```

```cron
# /etc/cron.d/edulia-backup
0 3 * * * root /opt/backup/backup.sh >> /var/log/edulia-backup.log 2>&1
```

---

## Proxmox Setup Playbook

### Step 1: Network Configuration

```bash
# /etc/network/interfaces on Proxmox host

auto lo
iface lo inet loopback

# Physical interface
auto eno1
iface eno1 inet manual

# Main bridge
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0

# VLAN 10 — DMZ
auto vmbr0.10
iface vmbr0.10 inet static
    address 10.10.10.1/24

# VLAN 20 — APP
auto vmbr0.20
iface vmbr0.20 inet static
    address 10.10.20.1/24

# VLAN 30 — DATA
auto vmbr0.30
iface vmbr0.30 inet static
    address 10.10.30.1/24

# VLAN 40 — MGMT
auto vmbr0.40
iface vmbr0.40 inet static
    address 10.10.40.1/24
```

### Step 2: Create VMs/LXC via Proxmox CLI

```bash
# Download Ubuntu template
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst

# Create LXC containers
# edge-proxy (VLAN 10)
pct create 100 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname edge-proxy \
  --cores 1 --memory 512 --swap 256 \
  --rootfs local-lvm:10 \
  --net0 name=eth0,bridge=vmbr0,tag=10,ip=10.10.10.10/24,gw=10.10.10.1 \
  --start 1 --onboot 1

# app-server (VLAN 20)
pct create 101 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname app-server \
  --cores 4 --memory 4096 --swap 1024 \
  --rootfs local-lvm:30 \
  --net0 name=eth0,bridge=vmbr0,tag=20,ip=10.10.20.10/24,gw=10.10.20.1 \
  --features nesting=1 \
  --start 1 --onboot 1

# worker (VLAN 20)
pct create 102 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname worker \
  --cores 2 --memory 2048 --swap 1024 \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,tag=20,ip=10.10.20.20/24,gw=10.10.20.1 \
  --features nesting=1 \
  --start 1 --onboot 1

# services (VLAN 20)
pct create 103 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname services \
  --cores 2 --memory 2048 --swap 512 \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,tag=20,ip=10.10.20.30/24,gw=10.10.20.1 \
  --features nesting=1 \
  --start 1 --onboot 1

# db-server (VLAN 30) — VM not LXC
qm create 200 \
  --name db-server \
  --cores 4 --memory 8192 \
  --scsihw virtio-scsi-single \
  --scsi0 local-lvm:200,ssd=1 \
  --net0 virtio,bridge=vmbr0,tag=30 \
  --boot order=scsi0 \
  --onboot 1
# Install Ubuntu, then configure IP: 10.10.30.10/24

# cache (VLAN 30)
pct create 201 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname cache \
  --cores 1 --memory 1024 --swap 256 \
  --rootfs local-lvm:10 \
  --net0 name=eth0,bridge=vmbr0,tag=30,ip=10.10.30.11/24,gw=10.10.30.1 \
  --features nesting=1 \
  --start 1 --onboot 1

# storage (VLAN 30)
pct create 202 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname storage \
  --cores 1 --memory 1024 --swap 256 \
  --rootfs local-lvm:10 \
  --mp0 /mnt/hdd/minio,mp=/mnt/storage/minio \
  --net0 name=eth0,bridge=vmbr0,tag=30,ip=10.10.30.12/24,gw=10.10.30.1 \
  --features nesting=1 \
  --start 1 --onboot 1

# monitoring (VLAN 40)
pct create 300 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname monitoring \
  --cores 2 --memory 2048 --swap 512 \
  --rootfs local-lvm:50 \
  --net0 name=eth0,bridge=vmbr0,tag=40,ip=10.10.40.10/24,gw=10.10.40.1 \
  --features nesting=1 \
  --start 1 --onboot 1

# backup (VLAN 40)
pct create 301 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname backup \
  --cores 1 --memory 512 --swap 256 \
  --rootfs local-lvm:10 \
  --mp0 /mnt/hdd/backup,mp=/mnt/backup \
  --net0 name=eth0,bridge=vmbr0,tag=40,ip=10.10.40.20/24,gw=10.10.40.1 \
  --start 1 --onboot 1
```

### Step 3: Install Docker on LXC nodes

```bash
# Run on each LXC that needs Docker (app-server, worker, services, cache, storage, monitoring)
# Requires nesting=1 on the LXC config

curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Install node_exporter for Prometheus monitoring
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-*.tar.gz
cp node_exporter-*/node_exporter /usr/local/bin/
# Create systemd service for node_exporter
```

---

## CI/CD Pipeline (GitHub Actions → Proxmox)

```yaml
# .github/workflows/deploy.yml

name: Deploy to Proxmox

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker images
        run: |
          docker build -t edulia/api:${{ github.sha }} -f infra/docker/api.Dockerfile --target production apps/api
          docker build -t edulia/web:${{ github.sha }} -f infra/docker/web.Dockerfile --target production apps/web
          docker build -t edulia/socketio:${{ github.sha }} -f infra/docker/socketio.Dockerfile apps/socketio

      - name: Push to registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker tag edulia/api:${{ github.sha }} ghcr.io/${{ github.repository }}/api:latest
          docker tag edulia/web:${{ github.sha }} ghcr.io/${{ github.repository }}/web:latest
          docker tag edulia/socketio:${{ github.sha }} ghcr.io/${{ github.repository }}/socketio:latest
          docker push ghcr.io/${{ github.repository }}/api:latest
          docker push ghcr.io/${{ github.repository }}/web:latest
          docker push ghcr.io/${{ github.repository }}/socketio:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to app-server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROXMOX_APP_IP }}
          username: deploy
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/edulia
            docker compose pull
            docker compose up -d --no-deps api web socketio

      - name: Deploy to worker
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROXMOX_WORKER_IP }}
          username: deploy
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/edulia
            docker compose pull
            docker compose up -d --no-deps celery-worker celery-beat

      - name: Run migrations
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROXMOX_APP_IP }}
          username: deploy
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/edulia
            docker compose exec -T api alembic upgrade head
```

---

## Migration Path to Cloud

When you outgrow the Proxmox host, here's how each component maps:

| Proxmox Component | Cloud Equivalent | Migration Effort |
|-------------------|-----------------|-----------------|
| **edge-proxy** (Nginx) | Cloudflare / AWS ALB / Traefik on K3s | Low — config change |
| **app-server** (Docker) | K3s pod / ECS task / Cloud Run | Medium — write K8s manifests |
| **worker** (Celery) | K3s pod / ECS task | Low — same Docker image |
| **db-server** (PostgreSQL) | Managed PostgreSQL (RDS / Scaleway / Neon) | Medium — pg_dump → pg_restore |
| **cache** (Redis) | Managed Redis (ElastiCache / Upstash) | Low — change connection string |
| **storage** (MinIO) | S3 / Scaleway Object Storage | Low — change S3 endpoint |
| **services** (DocuSeal) | Keep on VM or Docker host | Low — runs anywhere |
| **monitoring** (Grafana) | Grafana Cloud (free tier) | Low — export dashboards |
| **backup** | Cloud-native backups (RDS snapshots, S3 versioning) | Low — simplifies |

### Migration Steps

1. **Set up managed PostgreSQL** in cloud → `pg_dump` from Proxmox → `pg_restore` to cloud
2. **Switch MinIO to S3** → `rclone sync` all files → change `S3_ENDPOINT` in `.env`
3. **Deploy app/worker as containers** → K3s or Docker Swarm on cloud VMs
4. **Point DNS** from Proxmox public IP to cloud load balancer
5. **Keep Proxmox as staging/dev** environment

**Key principle:** Every service connects via environment variables (`DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT`). Migrating = changing env vars + moving data. No code changes.

---

## Local Development (unchanged)

Developers still run everything locally with Docker Compose. Same `docker-compose.yml` from before — all services in containers on localhost.

```bash
# On your Mac / Linux dev machine
git clone https://github.com/your-org/edulia.git
cd edulia
cp .env.example .env
make dev
# → Frontend at http://localhost:5173
# → API docs at http://localhost:8000/api/v1/docs
```

The Proxmox setup is **production only**. Development never touches Proxmox.
