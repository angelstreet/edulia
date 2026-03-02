# Testing Guide

## Overview

| App | Location | Framework | Runner |
|-----|----------|-----------|--------|
| API (unit/integration) | `apps/api/app/tests/` | pytest | `cd apps/api && pytest` |
| Web (E2E) | `apps/web/tests/` | Playwright | `cd apps/web && npm run test:e2e` |
| SocketIO | `apps/socketio/tests/` | — | Future |

## Backend Tests (pytest)

12 test files covering auth, users, groups, subjects, academic years, messaging, notifications, files, and tenant endpoints.

```bash
cd apps/api
source .venv/bin/activate
pytest                    # run all
pytest -v                 # verbose
pytest app/tests/test_auth.py  # single file
```

Requires `DATABASE_URL` pointing to a test database (or uses the default from `.env`).

## Frontend E2E Tests (Playwright)

### Setup

```bash
cd apps/web
npm install
npx playwright install chromium
```

### Running

```bash
# Against production (default: https://edulia.angelstreet.io)
npm run test:e2e

# Against local dev server
BASE_URL=http://localhost:5173 npm run test:e2e

# Against VM directly (bypasses Cloudflare)
BASE_URL=http://192.168.0.120:3000 npm run test:e2e

# With UI mode (interactive)
npm run test:e2e:ui

# Single test file
npx playwright test tests/auth.spec.ts

# With custom credentials
TEST_EMAIL=admin@school.io TEST_PASSWORD=secret npm run test:e2e
```

### Test Files

| File | Tests | What it covers |
|------|-------|---------------|
| `auth.spec.ts` | 5 | Login page renders, valid login, wrong password, auth guard redirect, localStorage persistence |
| `navigation.spec.ts` | 9 | Sidebar menu items, navigate all admin pages without crash, back to dashboard, no console errors |
| `dashboard.spec.ts` | 7 | Welcome message, stat cards, recent activity, topbar (user name, language switcher, notifications, breadcrumb) |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://edulia.angelstreet.io` | Target URL |
| `TEST_EMAIL` | `admin@edulia.angelstreet.io` | Login email |
| `TEST_PASSWORD` | `ChangeMe123!` | Login password |

### On Failure

Screenshots and traces are saved to `apps/web/tests/results/` (gitignored). View a trace:

```bash
npx playwright show-trace tests/results/<test-name>/trace.zip
```

## Adding New Tests

Create a new `*.spec.ts` file in `apps/web/tests/`. Follow the existing pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // login if needed
  });

  test('does something', async ({ page }) => {
    await page.goto('/some-page');
    await expect(page.getByRole('heading', { name: 'Title' })).toBeVisible();
  });
});
```

## Non-Regression Pipeline (TODO)

The goal is two layers of automated non-regression testing, matching the pattern used in [Konto](https://github.com/angelstreet/konto):

### Layer 1 — Pre-push Git Hook (local)

A Husky pre-push hook runs fast checks before code leaves the developer's machine.

```
.husky/pre-push
```

What it should run:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `cd apps/web && npx tsc --noEmit` | Catch TypeScript errors |
| 2 | `cd apps/web && npm run build` | Verify production build |
| 3 | `cd apps/api && pytest tests/ -v --tb=short` | Backend unit/integration tests |

Setup (when ready to implement):

```bash
npm install -D husky          # at monorepo root
npx husky init                # creates .husky/ directory
# then write the pre-push script
```

The hook blocks `git push` if any step fails — broken code never reaches GitHub.

### Layer 2 — GitHub Actions CI (remote)

A workflow triggered on every push/PR to `main` runs the full suite in a clean environment.

```
.github/workflows/ci.yml
```

What it should run:

| Job | Steps |
|-----|-------|
| **lint-and-build** | Checkout → Node 20 setup → `npm ci` → `tsc --noEmit` → `npm run build` (web) |
| **api-tests** | Checkout → Python 3.12 setup → `pip install -r requirements.txt` → `pytest` |
| **e2e-tests** | Checkout → Node 20 → `npx playwright install chromium --with-deps` → `npm run test:e2e` against staging URL |

Secrets needed in GitHub repo settings:

| Secret | Example |
|--------|---------|
| `STAGING_URL` | `https://edulia.angelstreet.io` |
| `TEST_EMAIL` | `admin@edulia.angelstreet.io` |
| `TEST_PASSWORD` | (the test admin password) |

Example workflow:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
        working-directory: apps/web
      - run: npx tsc --noEmit
        working-directory: apps/web
      - run: npm run build
        working-directory: apps/web

  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
        working-directory: apps/api
      - run: pytest tests/ -v --tb=short
        working-directory: apps/api

  e2e-tests:
    runs-on: ubuntu-latest
    needs: lint-and-build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
        working-directory: apps/web
      - run: npx playwright install chromium --with-deps
        working-directory: apps/web
      - run: npm run test:e2e
        working-directory: apps/web
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

### How the two layers work together

```
Developer pushes code
        │
        ▼
  ┌─────────────┐   fail → push blocked, fix locally
  │  Pre-push   │
  │  (Husky)    │
  └──────┬──────┘
         │ pass
         ▼
  Code reaches GitHub
         │
         ▼
  ┌─────────────┐   fail → red badge, PR blocked
  │  GitHub CI   │
  │  (Actions)   │
  └──────┬──────┘
         │ pass
         ▼
  Safe to merge / deploy
```

Pre-push catches ~90% of issues instantly (no waiting for CI). GitHub Actions catches environment-specific issues and runs E2E against the real staging server.
