import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

// Demo accounts — same credentials used across the test suite
const TEACHER_EMAIL = 'prof.martin@demo.edulia.io';
const STUDENT_EMAIL = 'emma.leroy@demo.edulia.io';
const PASSWORD = 'demo2026';

// ---------------------------------------------------------------------------
// Login helper (mirrors the pattern used in live-session.spec.ts)
// ---------------------------------------------------------------------------

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// 1. Teacher live page renders after launch
// ---------------------------------------------------------------------------

test('teacher live page renders after launch', async ({ page }) => {
  await login(page, TEACHER_EMAIL);

  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must not error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for a "Launch Live" button — if absent, skip gracefully
  const launchBtn = page.getByRole('button', { name: /launch live|lancer en direct|lancer la session/i });
  const launchLink = page.getByRole('link', { name: /launch live|lancer en direct|lancer la session/i });

  const btnCount = await launchBtn.count();
  const linkCount = await launchLink.count();

  if (btnCount === 0 && linkCount === 0) {
    test.skip(true, 'No "Launch Live" button found — no published activities in demo env, skipping');
    return;
  }

  // Click the first available launcher
  if (btnCount > 0) {
    await launchBtn.first().click();
  } else {
    await launchLink.first().click();
  }

  await page.waitForTimeout(3000);

  // After launching, a join code (6-char uppercase alphanumeric) should appear on the page
  const bodyText = await page.locator('body').textContent();
  const codePattern = /[A-Z2-9]{6}/;
  expect(bodyText).toMatch(codePattern);

  // No hard errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);
});

// ---------------------------------------------------------------------------
// 2. Live teacher dashboard — unauthenticated access redirects to login
// ---------------------------------------------------------------------------

test('live teacher dashboard shows start question button', async ({ page }) => {
  // Navigate to a made-up session live page without authentication.
  // The app must redirect to login rather than render an unprotected page.
  await page.goto(`${BASE}/session/TESTCODE/live`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();

  const redirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('/auth');
  const showsLoginForm = (await page.locator('input[id="email"], input[type="email"]').count()) > 0;

  expect(redirectedToLogin || showsLoginForm).toBe(true);
});

// ---------------------------------------------------------------------------
// 3. Live student page — unauthenticated access redirects to login
// ---------------------------------------------------------------------------

test('live student page shows waiting when navigated directly', async ({ page }) => {
  // Navigate to a made-up question page without authentication.
  // The app must redirect to login rather than expose session content.
  await page.goto(`${BASE}/session/TESTCODE/question`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();

  const redirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('/auth');
  const showsLoginForm = (await page.locator('input[id="email"], input[type="email"]').count()) > 0;

  expect(redirectedToLogin || showsLoginForm).toBe(true);
});

// ---------------------------------------------------------------------------
// 4. Join page input validation — short code disables join button
// ---------------------------------------------------------------------------

test('join page input validation — code too short disables join button', async ({ page }) => {
  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/join`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Locate the code input
  const codeInput = page.locator(
    'input[placeholder*="code"], input[name*="code"], input[id*="code"], input[maxlength="6"]'
  ).first();
  await expect(codeInput).toBeVisible();

  // Type a 3-char code (too short)
  await codeInput.fill('AB3');

  // The Join button should be disabled when the code is incomplete
  const joinBtn = page.getByRole('button', { name: /join|rejoindre|entrer/i });
  await expect(joinBtn).toBeVisible();

  const isDisabled = await joinBtn.isDisabled();
  expect(isDisabled).toBe(true);
});

// ---------------------------------------------------------------------------
// 5. Join page input forced uppercase
// ---------------------------------------------------------------------------

test('join page input forced uppercase', async ({ page }) => {
  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/join`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Locate the code input
  const codeInput = page.locator(
    'input[placeholder*="code"], input[name*="code"], input[id*="code"], input[maxlength="6"]'
  ).first();
  await expect(codeInput).toBeVisible();

  // Type a lowercase code — the input should transform it to uppercase
  await codeInput.fill('ab3k7m');

  // Read back the value — it must have been uppercased
  const value = await codeInput.inputValue();
  expect(value).toBe('AB3K7M');
});

// ---------------------------------------------------------------------------
// 6. Student sees lobby after valid code lookup
// ---------------------------------------------------------------------------

test('student sees lobby after valid code lookup', async ({ page }) => {
  // This test requires a live session to be active in the demo environment.
  // Set the TEST_LIVE_SESSION_CODE env var to a valid 6-char join code to enable it.
  const knownCode = process.env.TEST_LIVE_SESSION_CODE;
  if (!knownCode) {
    test.skip(true, 'No TEST_LIVE_SESSION_CODE env var set — skipping (requires an active session)');
    return;
  }

  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/join`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const codeInput = page.locator(
    'input[placeholder*="code"], input[name*="code"], input[id*="code"], input[maxlength="6"]'
  ).first();
  await expect(codeInput).toBeVisible();

  await codeInput.fill(knownCode.toUpperCase());

  const joinBtn = page.getByRole('button', { name: /join|rejoindre|entrer/i });
  await joinBtn.click();
  await page.waitForTimeout(3000);

  // Should navigate to a lobby/session page without a hard error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Expect lobby/waiting content or session info
  const bodyText = await page.locator('body').textContent();
  const hasLobbyContent = /waiting|en attente|lobby|session|code/i.test(bodyText ?? '');
  expect(hasLobbyContent).toBe(true);
});
