# Edulia — Testing Report

**Date:** 2026-03-01
**Tested by:** Agent (agent-browser + curl)
**URL:** https://edulia.angelstreet.io
**Direct:** http://192.168.0.120:3000 (frontend), http://192.168.0.120:8000 (API)

---

## How testing was done

### Tools used

| Tool | Purpose |
|------|---------|
| `agent-browser` | Headless Playwright-based CLI. Opens pages, fills forms, clicks buttons, takes screenshots, runs JS in browser context |
| `curl` / `python3 urllib` | Direct API testing from VM 120 and proxy VM 107 (avoids shell escaping issues with `!` in passwords) |
| SSH | All commands run over SSH to the target VMs |

### Testing method

1. **API-level**: POST/GET requests directly to `http://127.0.0.1:8000/api/v1/...` from VM 120
2. **Proxy-level**: Same requests from VM 107 through nginx to confirm routing
3. **Browser-level**: `agent-browser open <url>` → fill forms → click → screenshot → check localStorage/DOM
4. **State injection**: When form interaction failed (React controlled inputs), auth state was injected directly into localStorage via `agent-browser eval` to test protected pages

---

## What was tested

### 1. API — Login endpoint

| Test | Method | Result |
|------|--------|--------|
| Login returns tokens + user object | curl from VM 120 | PASS — returns `{access_token, refresh_token, token_type, user: {id, email, role, permissions, ...}}` |
| Login via nginx proxy | curl from VM 107 | PASS — same response through proxy |
| Login with wrong password | curl | PASS — returns 401 `{"detail": "Invalid email or password"}` |
| Login with invalid email format | curl | PASS — returns 422 validation error |

### 2. API — Health endpoint

| Test | Method | Result |
|------|--------|--------|
| `/api/health` from VM 120 | curl | PASS — `{"status": "healthy"}` |
| `/api/health` from proxy | curl from VM 107 | PASS |
| `/api/health` from internet | curl to `https://edulia.angelstreet.io/api/health` | PASS |

### 3. Frontend — Login page

| Test | Method | Result |
|------|--------|--------|
| Login page renders | agent-browser screenshot | PASS — shows Edulia branding, email/password fields, "Log in" button, "Forgot password?" link |
| Branding says "Edulia" (not "EduCore") | agent-browser screenshot | PASS |
| Form fields accept input | agent-browser type | PASS — text appears in accessibility tree |
| Login form submission | agent-browser click submit | FAIL — see Known Issues #1 |

### 4. Frontend — Admin dashboard (state injected)

| Test | Method | Result |
|------|--------|--------|
| Dashboard loads with admin role | agent-browser open /dashboard | PASS — shows admin sidebar (Dashboard, Users, Classes, Subjects, Academic year, School settings) |
| Admin stats widgets render | screenshot | PASS — shows Total users (342), Active students (256), Teachers (28), Classes (14) — placeholder data |
| Recent activity widget renders | screenshot | PASS — shows 4 activity items in French |
| User name + role in sidebar footer | screenshot | PASS — "Admin Mon École / Admin" |
| User name + avatar in top bar | screenshot | PASS — "A Admin Mon École" with avatar circle |
| Notification bell in top bar | screenshot | PASS — bell icon visible |
| Language switcher in top bar | screenshot | PASS — "FR" button visible |

### 5. Frontend — Page navigation (state injected)

| Page | Route | Result | Notes |
|------|-------|--------|-------|
| Dashboard | `/dashboard` | PASS | Admin dashboard with widgets |
| Users | `/admin/users` | PASS | Table with search + role filter + "+ Add user" button. Shows "No users found" (API returns empty — only 1 admin user, likely filtered or 401) |
| Classes | `/admin/classes` | FAIL | **Crash**: `TypeError: Cannot read properties of undefined (reading 'filter')` — see Known Issues #2 |
| Subjects | `/admin/subjects` | NOT TESTED | Blocked by Classes crash (app error boundary triggered) |
| Academic year | `/admin/academic-year` | NOT TESTED | Blocked |
| School settings | `/admin/settings` | NOT TESTED | Blocked |
| Messages | `/messages` | NOT TESTED | Not in admin sidebar (teacher/student only) |

---

## Known issues found

### Issue #1: Login form submission fails silently

**Severity:** HIGH
**Page:** `/login`
**Symptom:** After filling email + password and clicking "Log in", the page resets to empty form. No error message shown. Auth state remains `isAuthenticated: false`.

**Root cause investigation:**
- The API returns 200 with correct data (verified via `fetch()` in browser console)
- The axios client at `/api` correctly proxies through nginx
- The error appears to be in how the LoginForm's `onSubmit` handles the async flow
- `handleSubmit` calls `onSubmit(email, password)` without `await` — if the promise rejects, it's an unhandled rejection
- The authStore's catch block re-throws the error, which may cause React to re-render and clear form state

**Workaround:** Login works at the API level. The issue is purely in the React form → zustand store flow.

**Fix needed in:**
- `apps/web/src/features/auth/components/LoginForm.tsx` — add `await` to `onSubmit(email, password)` and handle errors
- `apps/web/src/stores/authStore.ts` — don't re-throw in catch block, or catch in `useAuth.login`

### Issue #2: Classes page crashes on load

**Severity:** HIGH
**Page:** `/admin/classes`
**Symptom:** `TypeError: Cannot read properties of undefined (reading 'filter')` — full app crash with React error boundary.

**Root cause:** The ClassesPage component calls `.filter()` on a variable that is `undefined`. This happens when the API call to `GET /api/v1/groups` returns an error (401 or network error) and the component doesn't handle the loading/error state.

**Fix needed in:**
- `apps/web/src/features/admin/pages/ClassesPage.tsx` — add null check before `.filter()`, handle API errors gracefully

### Issue #3: Users page shows "No users found"

**Severity:** MEDIUM
**Page:** `/admin/users`
**Symptom:** The admin user exists in the database but the Users page shows empty.

**Possible causes:**
- The JWT token was injected manually (not from a real login flow), so the token might not include required claims
- The users API might filter differently than expected
- Needs investigation with a properly obtained token

### Issue #4: agent-browser fill vs React controlled inputs

**Severity:** LOW (testing tool issue, not app bug)
**Symptom:** `agent-browser fill` sets the DOM value but doesn't trigger React's synthetic `onChange` event, so React state stays empty. Using `agent-browser type` works but is slower.

---

## What's left to test

### Frontend pages (blocked by Issues #1 and #2)

| Page | Route | What to verify |
|------|-------|----------------|
| Classes | `/admin/classes` | Tree view renders, add/edit/delete group, member management |
| Subjects | `/admin/subjects` | List with color chips, CRUD modal |
| Academic year | `/admin/academic-year` | Year + terms display, create/edit |
| School settings | `/admin/settings` | Module toggles, grading scale, save |
| Messages | `/messages` | Thread list, compose, reply, unread indicator |
| Notifications | Top bar bell | Dropdown panel, mark read, polling |
| File upload | Within other pages | Drag-drop, progress bar, preview |

### Frontend flows

| Flow | What to verify |
|------|----------------|
| Login → Dashboard → Navigate | Full flow without state injection |
| Logout | Click user menu → logout → redirects to /login, clears state |
| Token refresh | Let access token expire (30min), verify silent refresh works |
| Responsive / mobile | Test at 375px width — sidebar collapse, mobile nav |
| i18n switch | Click FR → EN toggle, verify all labels change |
| Error boundary | Navigate to invalid route, verify graceful handling |
| Add user | Fill UserForm modal, submit, verify user appears in list |

### API endpoints (not browser-tested)

| Endpoint | Method | What to verify |
|----------|--------|----------------|
| `GET /api/v1/users/me` | GET | Returns current user from JWT |
| `GET /api/v1/users` | GET | Paginated user list with filters |
| `POST /api/v1/users` | POST | Create user (admin only) |
| `GET /api/v1/groups` | GET | List groups with member count |
| `POST /api/v1/groups` | POST | Create group |
| `GET /api/v1/subjects` | GET | List subjects |
| `GET /api/v1/academic-years` | GET | List years with terms |
| `GET /api/v1/tenant` | GET | Tenant info |
| `PATCH /api/v1/tenant/settings` | PATCH | Update settings |
| `GET /api/v1/threads` | GET | List message threads |
| `POST /api/v1/threads` | POST | Create thread |
| `GET /api/v1/notifications` | GET | List notifications |
| `POST /api/v1/files/upload` | POST | File upload with virus scan |
| `POST /api/v1/auth/refresh` | POST | Token refresh |
| `POST /api/v1/auth/forgot-password` | POST | Password reset email |

### Infrastructure

| Check | What to verify |
|-------|----------------|
| PM2 auto-restart | Kill API process, verify PM2 restarts it |
| PM2 startup persistence | Reboot VM 120, verify services come back |
| SSL certificate | Verify Cloudflare edge cert is valid |
| WebSocket / Socket.IO | Connect to `/socket.io/`, verify handshake |
| ClamAV integration | Upload a file, verify scan runs (currently not wired) |

---

## Fixes applied during this session

| Fix | Files changed (on VM 120) | Status |
|-----|--------------------------|--------|
| Login response includes user object | `apps/api/app/modules/auth/schemas.py`, `apps/api/app/modules/auth/router.py` | Done — verified via curl |
| Debug logging removed | `apps/api/app/modules/auth/router.py`, `apps/api/app/modules/auth/service.py` | Done |
| Error message extraction fixed | `apps/web/src/stores/authStore.ts` — reads `detail` instead of `error.message` | Done — rebuilt |
| VITE_API_URL restored to `/api` | `apps/web/.env.production` | Done — rebuilt |

**Note:** All fixes were made directly on VM 120 (`/opt/edulia/backend/`). They have NOT been committed to git. To persist, the changes need to be pushed to the repo.

---

## Priority fix order

1. **Login form submission** (Issue #1) — blocks all real testing
2. **Classes page crash** (Issue #2) — blocks admin workflow
3. **Users page empty** (Issue #3) — needs investigation
4. **Commit fixes to git** — current fixes are only on VM, not in repo
