# Scope 1 Prompts — Core Auth + RBAC

Launch these 2 terminals in parallel AFTER scope 0 is verified.

---

## Terminal 1 — Backend auth + RBAC + user CRUD

```
You are building the auth system and user management API for Edulia, a multi-tenant education platform. The repo is at https://github.com/angelstreet/edulia — pull latest from main first. Scope 0 (scaffold) is already done.

Read these reference docs FIRST:
- /home/jndoye/shared/projects/edulia/08-BUILD-PHASES.md — Phase 1 (Steps 1.1–1.4) + Phase 2 (Steps 2.1–2.5)
- /home/jndoye/shared/projects/edulia/01-CORE-SHELL.md — Section 1 (Tenant, Campus, User, Role, UserRole, Relationship entity definitions)
- /home/jndoye/shared/projects/edulia/06-FILE-STRUCTURE.md — Backend modules section

Build these in order:

1. Create SQLAlchemy models in apps/api/app/db/models/:
   - tenant.py: Tenant (with settings jsonb, branding jsonb), Campus, AcademicYear, Term
   - user.py: User (all fields from CORE §1.4), Role, UserRole (with scope), Relationship
   Generate alembic migration. Run alembic upgrade head.

2. Create auth module in apps/api/app/modules/auth/:
   - schemas.py: LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
   - service.py: authenticate_user, create_tokens (access+refresh JWT), hash/verify password
   - router.py: POST /api/v1/auth/login, POST /api/v1/auth/refresh, POST /api/v1/auth/forgot-password, POST /api/v1/auth/reset-password
   - app/core/security.py: JWT encode/decode (python-jose), password hashing (passlib bcrypt)

3. Create RBAC in apps/api/app/core/:
   - permissions.py: check_permission(user, required_permission) with scope support
   - dependencies.py: get_db (session dependency), get_current_user (JWT extraction), require_permission(perm_code) decorator
   - pagination.py: paginate helper returning {items, total, page, page_size}

4. Create users module in apps/api/app/modules/users/:
   - schemas.py: UserCreate, UserUpdate, UserResponse, UserListResponse
   - service.py: CRUD operations, search by name/email, filter by role
   - router.py:
     GET    /api/v1/users (paginated, filtered by role, searchable)
     POST   /api/v1/users (admin only, creates with status "invited" if no password)
     GET    /api/v1/users/:id
     GET    /api/v1/users/me
     PATCH  /api/v1/users/:id
     DELETE /api/v1/users/:id (soft delete)

5. Add invite flow:
   - POST /api/v1/auth/invite/accept {token, password} → activates user, sets password

6. Create relationship endpoints in users module:
   - POST /api/v1/users/:id/relationships {type, to_user_id}
   - GET  /api/v1/users/:id/relationships
   - GET  /api/v1/users/:id/children (shortcut for guardians)

7. Create apps/api/app/integrations/email/sender.py — Brevo transactional email (SMTP from .env)

8. Create scripts/create_tenant.py:
   - CLI: --name, --slug, --type, --admin-email, --admin-password
   - Creates tenant + campus + admin user + admin role

9. Write pytest tests in apps/api/app/tests/:
   - test_auth.py: login success, login wrong password, refresh token, get /me with token, get /me without token (5 tests)
   - test_users.py: list users, create user (admin), get by id, update, soft delete, filter by role, search, create as non-admin returns 403 (8 tests)
   - test_rbac.py: access with permission OK, access without permission 403, cross-campus scope 403, invite accept flow (4 tests)
   - test_relationships.py: create relationship, list relationships, get children (3 tests)
   - conftest.py: test DB setup, seed test tenant + users with different roles

Run: alembic upgrade head && pytest -v. ALL 20+ tests must pass.

After completing each major step, update /home/jndoye/shared/projects/edulia/CODE-PROGRESS.md: change S1.1 status from "Not started" to "In progress", then to "Done" when all tests pass.

Commit and push to main when everything passes. Do NOT modify frontend or shared types files.
```

---

## Terminal 2 — Frontend auth + admin UI

```
You are building the login flow and admin UI for Edulia, a multi-tenant education platform. The repo is at https://github.com/angelstreet/edulia — pull latest from main first. Scope 0 (scaffold) is already done.

Read these reference docs FIRST:
- /home/jndoye/shared/projects/edulia/08-BUILD-PHASES.md — Phase 1 Steps 1.3–1.4, Phase 2 Steps 2.3–2.4, Phase 4 Steps 4.1–4.2
- /home/jndoye/shared/projects/edulia/06-FILE-STRUCTURE.md — Frontend section (full apps/web/ structure)
- /home/jndoye/shared/projects/edulia/05-UIUX-WIREFRAMES.md — if available, for layout reference

Build these in order:

1. Create API client layer in apps/web/src/api/:
   - client.ts: axios instance with baseURL from VITE_API_URL, JWT interceptor (attach token from authStore, handle 401 → refresh or redirect to /login)
   - auth.ts: login(email, password), refresh(token), forgotPassword(email), resetPassword(token, password)
   - users.ts: getUsers(params), createUser(data), getUser(id), updateUser(id, data), deleteUser(id)

2. Create stores in apps/web/src/stores/:
   - authStore.ts (zustand): user, accessToken, refreshToken, isAuthenticated, login(), logout(), refresh()
   - uiStore.ts (zustand): sidebarOpen, theme, toggleSidebar()

3. Create hooks in apps/web/src/hooks/:
   - useAuth.ts: wraps authStore, provides login/logout/isAuthenticated
   - useCurrentUser.ts: returns current user from store
   - usePermission.ts: hasPermission(code) checks user's role permissions

4. Build login flow in apps/web/src/features/auth/:
   - pages/LoginPage.tsx: centered card with LoginForm, app branding
   - components/LoginForm.tsx: email + password fields, submit, loading state, error display
   - pages/ForgotPasswordPage.tsx: email input, submit, success message
   - pages/ResetPasswordPage.tsx: new password + confirm, token from URL params
   - pages/AcceptInvitePage.tsx: set password form for invited users

5. Build app shell layout in apps/web/src/components/layout/:
   - AppShell.tsx: sidebar + topbar + main content area, wraps authenticated routes
   - Sidebar.tsx: role-based menu items:
     * Admin: Dashboard, Users, Classes, Subjects, Settings
     * Teacher: Dashboard, Timetable, Attendance, Gradebook, Homework, Messages
     * Student: Dashboard, Timetable, Grades, Homework, Messages
     * Parent: Dashboard, Children, Grades, Messages, Billing
   - Topbar.tsx: breadcrumb, notification bell (placeholder), user menu dropdown
   - Breadcrumb.tsx: auto-generated from route
   - MobileNav.tsx: bottom tab bar (5 most-used items per role), visible < 768px

6. Create guards in apps/web/src/app/guards/:
   - AuthGuard.tsx: redirect to /login if not authenticated
   - RoleGuard.tsx: show 403 page if user doesn't have required role
   - ModuleGuard.tsx: hide route if tenant doesn't have module enabled

7. Build admin pages in apps/web/src/features/admin/:
   - pages/UsersPage.tsx: table with columns (name, email, role, status, actions), search bar, role filter dropdown, pagination
   - components/UserForm.tsx: modal form for add/edit user (name, email, role select, campus select)
   - components/ImportCSV.tsx: placeholder for CSV import

8. Build basic UI components in apps/web/src/components/ui/:
   - Button.tsx, Input.tsx, Select.tsx, Modal.tsx, Table.tsx, Card.tsx, Badge.tsx, Avatar.tsx, Spinner.tsx, Toast.tsx, Pagination.tsx, EmptyState.tsx

9. Update router to include all routes with proper guards:
   - /login, /forgot-password, /reset-password/:token, /invite/:token (public)
   - /dashboard, /admin/users, /settings (authenticated, guarded)

Test: Login with correct credentials redirects to dashboard. Sidebar shows role-appropriate items. Admin can see users list. Mobile navigation works on small viewport.

After completing each major step, update /home/jndoye/shared/projects/edulia/CODE-PROGRESS.md: change S1.2 status from "Not started" to "In progress", then to "Done" when everything works.

Commit and push to main when everything works. Do NOT modify backend or shared types files.
```
