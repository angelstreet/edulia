# Edulia — Admin Frontend

School & institution management interface. Invitation-only access.

## Features (built)

- Dashboard (role-based: admin, teacher, student, parent)
- User management with RBAC + CSV import
- Classes, subjects, academic years, terms
- Messaging (threaded conversations)
- File uploads (MinIO)
- Settings & module toggles per tenant
- Timetable, attendance, gradebook, homework
- Documents, forms, wallet, community directory

## Setup

```bash
npm install
npm run dev    # http://localhost:3000
```

## Environment

No `.env` required for local dev (API defaults to `http://localhost:8000`).

## Stack

React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + shadcn/ui + Zustand + react-router-dom v7 + i18next (fr/en)

## Structure

```
src/
├── app/           # Router, providers, guards (AuthGuard, RoleGuard)
├── features/      # Feature modules (admin, auth, messaging, timetable, etc.)
├── components/    # Layout (AppShell, Sidebar, Topbar) + common
├── hooks/         # Shared hooks (useAuth, useCurrentUser, useLandingTheme)
├── stores/        # Zustand stores (authStore)
├── api/           # Axios API clients
├── locales/       # fr/ + en/ translations
└── styles/        # Tailwind + brand CSS
```

See [root README](../../README.md) for full architecture.
