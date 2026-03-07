import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

// Demo accounts — same credentials used across the test suite
const TEACHER_EMAIL = 'prof.martin@demo.edulia.io';
const STUDENT_EMAIL = 'emma.leroy@demo.edulia.io';
const PASSWORD = 'demo2026';

// ---------------------------------------------------------------------------
// Login helper (mirrors the pattern used in activity-builder.spec.ts)
// ---------------------------------------------------------------------------

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Teacher — Launch Live button visibility
// ---------------------------------------------------------------------------

test('teacher sees Launch Live button on published activity', async ({ page }) => {
  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must load without server errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // If any published activity is visible, a "Launch Live" button should be available
  const publishedItems = page.locator(
    '[data-testid="activity-item"], [data-testid="activity-card"]'
  );
  const count = await publishedItems.count();

  if (count > 0) {
    // At least one "Launch Live" button should be visible for published activities
    const launchBtn = page.getByRole('button', { name: /launch live|lancer en direct|lancer la session/i });
    const launchLink = page.getByRole('link', { name: /launch live|lancer en direct|lancer la session/i });
    const hasLaunch = (await launchBtn.count()) > 0 || (await launchLink.count()) > 0;
    expect(hasLaunch).toBe(true);
  } else {
    // No activities seeded — page should still render cleanly
    await expect(page.locator('body')).not.toContainText(/error/i);
  }
});

// ---------------------------------------------------------------------------
// Teacher — Navigate to session launch page
// ---------------------------------------------------------------------------

test('teacher can navigate to session launch page', async ({ page }) => {
  await login(page, TEACHER_EMAIL);

  // First, resolve a published activity ID from the activities list
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Try to find an activity ID by looking for a link or data attribute
  const activityLinks = page.locator('a[href*="/activities/"]');
  const linkCount = await activityLinks.count();

  if (linkCount === 0) {
    test.skip(true, 'No published activities found in the demo environment — skipping launch page test');
    return;
  }

  // Extract an activity ID from the first link's href
  const firstHref = await activityLinks.first().getAttribute('href');
  const match = firstHref?.match(/\/activities\/([^/]+)/);
  if (!match) {
    test.skip(true, 'Could not extract activity ID from activity list — skipping launch page test');
    return;
  }

  const activityId = match[1];
  await page.goto(`${BASE}/activities/${activityId}/launch`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The launch page must not return a 404 or 500
  await expect(page.locator('body')).not.toContainText(/404|not found|500|internal server error/i);

  // A join code should be rendered — 6 uppercase alphanumeric chars
  const codePattern = /[A-Z0-9]{6}/;
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toMatch(codePattern);
});

// ---------------------------------------------------------------------------
// Student — Join page renders
// ---------------------------------------------------------------------------

test('join page renders for student', async ({ page }) => {
  await login(page, STUDENT_EMAIL);
  await page.goto(`${BASE}/join`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Code input must be visible
  const codeInput = page.locator(
    'input[placeholder*="code"], input[name*="code"], input[id*="code"], input[maxlength="6"]'
  );
  await expect(codeInput.first()).toBeVisible();

  // Join button must be visible
  const joinBtn = page.getByRole('button', { name: /join|rejoindre|entrer/i });
  await expect(joinBtn).toBeVisible();
});

// ---------------------------------------------------------------------------
// Student — Invalid code shows error
// ---------------------------------------------------------------------------

test('join page shows error for invalid code', async ({ page }) => {
  await login(page, STUDENT_EMAIL);
  await page.goto(`${BASE}/join`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Enter a code that almost certainly does not exist
  const codeInput = page.locator(
    'input[placeholder*="code"], input[name*="code"], input[id*="code"], input[maxlength="6"]'
  ).first();
  await codeInput.fill('ZZZZZZ');

  const joinBtn = page.getByRole('button', { name: /join|rejoindre|entrer/i });
  await joinBtn.click();
  await page.waitForTimeout(2000);

  // An error message should be visible — accept any error/not-found copy
  const errorLocator = page.locator(
    '[data-testid="error-message"], [role="alert"], .error, [class*="error"]'
  );
  const bodyText = await page.locator('body').textContent();
  const hasVisibleError = (await errorLocator.count()) > 0;
  const hasErrorText = /not found|introuvable|invalid|invalide|error|erreur/i.test(bodyText ?? '');

  expect(hasVisibleError || hasErrorText).toBe(true);
});

// ---------------------------------------------------------------------------
// Student — "Join Session" nav item visible in sidebar
// ---------------------------------------------------------------------------

test('join session item visible in student sidebar', async ({ page }) => {
  await login(page, STUDENT_EMAIL);
  await page.waitForTimeout(1500);

  const nav = page.getByRole('complementary');

  // Accept any of: "Join Session", "Join", "joinSession" link in the sidebar
  const joinLink = nav.getByRole('link', { name: /join session|rejoindre|join/i });
  await expect(joinLink.first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Student — Lobby page renders when code is valid
// ---------------------------------------------------------------------------

test('lobby page renders when code valid', async ({ page }) => {
  await login(page, STUDENT_EMAIL);

  // This test requires a live session to exist in the demo environment.
  // We navigate directly; if no session is active, we skip gracefully.

  // Attempt to find a session code via the join page or a known seed code.
  // In CI the test will likely skip because no session is active.
  const knownCode = process.env.TEST_LIVE_SESSION_CODE;
  if (!knownCode) {
    test.skip(true, 'No TEST_LIVE_SESSION_CODE env var set — skipping lobby page test (requires an active session)');
    return;
  }

  await page.goto(`${BASE}/session/${knownCode}/lobby`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The lobby page must not show a hard error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Expect "Waiting" text or any session info to be visible
  const bodyText = await page.locator('body').textContent();
  const hasLobbyContent = /waiting|en attente|lobby|session/i.test(bodyText ?? '');
  expect(hasLobbyContent).toBe(true);
});
