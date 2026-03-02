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

## CI Integration

Add to your CI pipeline:

```yaml
- name: E2E Tests
  run: |
    cd apps/web
    npx playwright install chromium --with-deps
    npm run test:e2e
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```
