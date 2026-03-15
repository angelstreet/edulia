# Edulia Troubleshooting Guide

## Quick Debugging Checklist

When Edulia is down, check in this order:

1. **PM2 status** on VM .120: `pm2 status`
2. **Backend logs**: `pm2 logs edulia-api-dev --lines 50`
3. **Frontend logs**: `pm2 logs edulia-web-dev --lines 50`
4. **Nginx**: `sudo nginx -t` && `sudo systemctl status nginx`

---

## Common Issues

### 500 Internal Server Error on API endpoints

**Symptom:** POST /api/v1/auth/login returns 500

**Debug:**
```bash
# Check backend logs for the actual error
ssh jndoye@192.168.0.120 "pm2 logs edulia-api-dev --lines 50 --nostream"
```

**Common causes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `connection to server at "localhost" port 5432 failed: Connection refused` | DATABASE_URL not loaded | Ensure `.env` is sourced: `set -a && source .env && set +a` |
| `connection timeout` | DB VM unreachable | Check VM .121 is up: `ping 192.168.0.121` |
| `authentication failed` | Wrong DB credentials | Check DATABASE_URL in `.env` |

---

### Frontend returns 502 Bad Gateway

**Symptom:** Browser shows 502

**Debug:**
```bash
# Check if Vite is running
ssh jndoye@192.168.0.120 "pm2 status | grep edulia-web"

# Test directly on VM
curl http://localhost:3003
```

**Common causes:**

| Error | Cause | Fix |
|-------|-------|-----|
| Vite not running | PM2 process dead | `pm2 restart edulia-web-dev` |
| Port mismatch | Vite on wrong port | Check `vite.config.ts` port matches nginx proxy |
| 502 from nginx | Nginx can't reach Vite | Check nginx config: `sudo nginx -t` |

---

### EduliaHub returns 502

**Symptom:** https://eduliahub.angelstreet.io returns 502

**Debug:**
```bash
# Check hub is running
ssh jndoye@192.168.0.120 "pm2 status | grep edulia-hub"

# Test directly
curl http://localhost:3021
```

---

## Startup Commands

### API (VM .120)
```bash
# Correct way (loads .env):
cd /opt/edulia/backend
npm run start:api

# Or via PM2:
pm2 start /home/jndoye/start-edulia-api.sh --name edulia-api-dev
```

### Frontend (VM .120)
```bash
cd /opt/edulia/backend/apps/web
npm run dev
```

### Hub (VM .120)
```bash
cd /opt/edulia/backend/apps/hub
npx vite --host 0.0.0.0 --port 3021
```

---

## VM Infrastructure

| VM | IP | Services |
|----|-----|----------|
| edulia-app | 192.168.0.120 | API (8000), Web (3003), Hub (3021), nginx |
| edulia-db | 192.168.0.121 | PostgreSQL 5432 |
| edulia-storage | 192.168.0.122 | MinIO, Redis |

---

## Useful Commands

```bash
# Restart all services
ssh jndoye@192.168.0.120 "pm2 restart all"

# Check database connectivity
ssh jndoye@192.168.0.120 "psql -h 192.168.0.121 -U edulia -d edulia -c 'SELECT 1'"

# Check nginx routing
ssh jndoye@192.168.0.120 "curl -I http://127.0.0.1:3003"
ssh jndoye@192.168.0.120 "curl -I http://127.0.0.1:8000/health"
```
