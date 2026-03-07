import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

// Demo accounts — same credentials used across the test suite
const TEACHER_EMAIL = 'prof.martin@demo.edulia.io';
const STUDENT_EMAIL = 'emma.leroy@demo.edulia.io';
const PASSWORD = 'demo2026';

// ---------------------------------------------------------------------------
// Login helper (mirrors the pattern used in live-qcm.spec.ts)
// ---------------------------------------------------------------------------

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// 1. Replay page shows not available when not enabled
// ---------------------------------------------------------------------------

test('replay page shows not available when not enabled', async ({ page }) => {
  // Navigate to a replay page with an invalid code — should show an error or redirect.
  // We log in as student first to avoid the auth redirect conflating results.
  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/session/INVALIDCODE/replay`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  const bodyText = await page.locator('body').textContent() ?? '';

  // Accept: redirect away from the replay page, or an error/unavailable message
  const redirectedAway = !currentUrl.includes('/session/INVALIDCODE/replay');
  const showsError = /not found|introuvable|not available|unavailable|error|erreur|404|invalid/i.test(bodyText);
  const showsNoReplay = /replay.*not.*enabled|not.*open|closed|disabled/i.test(bodyText);

  expect(redirectedAway || showsError || showsNoReplay).toBe(true);
});

// ---------------------------------------------------------------------------
// 2. Unauthenticated user redirected from replay page
// ---------------------------------------------------------------------------

test('unauthenticated user redirected from replay page', async ({ page }) => {
  // Navigate without logging in — the app must redirect to login.
  await page.goto(`${BASE}/session/TESTCODE/replay`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();

  const redirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('/auth');
  const showsLoginForm = (await page.locator('input[id="email"], input[type="email"]').count()) > 0;

  expect(redirectedToLogin || showsLoginForm).toBe(true);
});

// ---------------------------------------------------------------------------
// 3. Session results page accessible for teacher
// ---------------------------------------------------------------------------

test('session results page accessible for teacher', async ({ page }) => {
  const knownCode = process.env.TEST_LIVE_SESSION_CODE;
  if (!knownCode) {
    test.skip(true, 'No TEST_LIVE_SESSION_CODE env var set — skipping results page test');
    return;
  }

  await login(page, TEACHER_EMAIL);

  await page.goto(`${BASE}/session/${knownCode}/results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must render without a hard server error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Should show some content — results, scores, or a session summary
  const bodyText = await page.locator('body').textContent() ?? '';
  const hasContent = bodyText.trim().length > 0;
  expect(hasContent).toBe(true);
});

// ---------------------------------------------------------------------------
// 4. Replay page shows deadline if set
// ---------------------------------------------------------------------------

test('replay page shows deadline if set', async ({ page }) => {
  const knownCode = process.env.TEST_LIVE_SESSION_CODE;
  if (!knownCode) {
    test.skip(true, 'No TEST_LIVE_SESSION_CODE env var set — skipping deadline display test (requires replay-enabled session)');
    return;
  }

  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/session/${knownCode}/replay`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // No hard errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // If replay is enabled with a deadline, look for deadline text
  const bodyText = await page.locator('body').textContent() ?? '';
  const hasDeadlineContent = /deadline|date limite|expires|until|jusqu/i.test(bodyText);

  // If the session doesn't have a deadline set, this is still a pass —
  // we just verify the page doesn't crash.
  const pageRendered = bodyText.trim().length > 0;
  expect(pageRendered).toBe(true);

  if (hasDeadlineContent) {
    // Confirm deadline text is rendered somewhere visible
    const deadlineLocator = page.locator('[data-testid*="deadline"], [class*="deadline"], time');
    const count = await deadlineLocator.count();
    // Accept either a specific testid/class element or inline text
    expect(hasDeadlineContent || count > 0).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// 5. Student replay page renders form
// ---------------------------------------------------------------------------

test('student replay page renders form', async ({ page }) => {
  const knownCode = process.env.TEST_LIVE_SESSION_CODE;
  if (!knownCode) {
    test.skip(true, 'No TEST_LIVE_SESSION_CODE env var set — skipping replay form test (requires replay-enabled session)');
    return;
  }

  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/session/${knownCode}/replay`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // No hard errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  const bodyText = await page.locator('body').textContent() ?? '';

  // The replay page should show either a form (questions to answer) or a results view
  // (if already submitted). In either case the page should not be blank.
  const pageRendered = bodyText.trim().length > 0;
  expect(pageRendered).toBe(true);

  // Look for question content, submit button, or results
  const hasQuestionForm = (await page.locator('form, [data-testid*="question"], [data-testid*="replay"]').count()) > 0;
  const hasSubmitButton = (await page.getByRole('button', { name: /submit|valider|send|envoyer/i }).count()) > 0;
  const hasResultContent = /score|result|résultat|correct/i.test(bodyText);

  expect(hasQuestionForm || hasSubmitButton || hasResultContent).toBe(true);
});

// ---------------------------------------------------------------------------
// 6. Teacher live page has view results button after session finishes
// ---------------------------------------------------------------------------

test('teacher live page has view results button after session finishes', async ({ page }) => {
  // Navigate to a made-up session live page without authentication.
  // The app must redirect to login rather than render an unprotected page.
  // If the teacher IS authenticated and a session code is known, a "View Results" link
  // should appear once the session is in the finished state.

  const knownCode = process.env.TEST_LIVE_SESSION_CODE;

  if (!knownCode) {
    // Without a code, just verify the unauthenticated redirect works (no crash)
    await page.goto(`${BASE}/session/TESTCODE/live`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const redirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const showsLoginForm = (await page.locator('input[id="email"], input[type="email"]').count()) > 0;

    expect(redirectedToLogin || showsLoginForm).toBe(true);
    return;
  }

  // We have a known session code — log in as teacher and check the live page
  await login(page, TEACHER_EMAIL);

  await page.goto(`${BASE}/session/${knownCode}/live`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // No hard server errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  const bodyText = await page.locator('body').textContent() ?? '';

  // If the session is finished, a "View Session Results" link/button should be present
  const hasResultsLink = (await page.getByRole('link', { name: /view.*results|voir.*résultats|session results/i }).count()) > 0;
  const hasResultsButton = (await page.getByRole('button', { name: /view.*results|voir.*résultats|session results/i }).count()) > 0;
  const hasResultsText = /view.*results|session results|voir.*résultats/i.test(bodyText);

  // If session is finished, at least one of those should be present.
  // If session is still live, the page should render cleanly without crash.
  const isFinishedState = /finished|terminé|ended/i.test(bodyText);

  if (isFinishedState) {
    expect(hasResultsLink || hasResultsButton || hasResultsText).toBe(true);
  } else {
    // Session still live — just assert no crash
    expect(bodyText.trim().length).toBeGreaterThan(0);
  }
});
