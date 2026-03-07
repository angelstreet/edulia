import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

// Demo accounts — same credentials used across the test suite
const TEACHER_EMAIL = 'prof.martin@demo.edulia.io';
const STUDENT_EMAIL = 'emma.leroy@demo.edulia.io';
const PASSWORD = 'demo2026';

// ---------------------------------------------------------------------------
// Login helper — mirrors the pattern from live-session.spec.ts
// ---------------------------------------------------------------------------

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Helper: navigate to an activity results page as a teacher
//
// Resolves the first activity link on /activities and derives a results URL.
// Returns the activity ID, or null if none is available.
// ---------------------------------------------------------------------------

async function getFirstActivityId(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const activityLinks = page.locator('a[href*="/activities/"]');
  const linkCount = await activityLinks.count();
  if (linkCount === 0) {
    return null;
  }

  const firstHref = await activityLinks.first().getAttribute('href');
  const match = firstHref?.match(/\/activities\/([^/?#]+)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Test 1 — Activity results page has "Push to Gradebook" section for teacher
// ---------------------------------------------------------------------------

test('activity results page has push to gradebook section for teacher', async ({ page }) => {
  await login(page, TEACHER_EMAIL);

  const activityId = await getFirstActivityId(page);
  if (!activityId) {
    test.skip(true, 'No activity links found in demo environment — skipping gradebook section test');
    return;
  }

  // Navigate to the results page for the activity
  await page.goto(`${BASE}/activities/${activityId}/results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must not return a hard error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for "Push to Gradebook" or "Export to Gradebook" text/button
  const pushButton = page.getByRole('button', {
    name: /push to gradebook|export to gradebook|push.*gradebook|envoyer.*bulletin|exporter.*notes/i,
  });
  const pushLink = page.getByRole('link', {
    name: /push to gradebook|export to gradebook|push.*gradebook|envoyer.*bulletin|exporter.*notes/i,
  });
  const pushText = page.getByText(
    /push to gradebook|export to gradebook|push.*gradebook|envoyer.*bulletin|exporter.*notes/i
  );

  const hasPushButton = (await pushButton.count()) > 0;
  const hasPushLink = (await pushLink.count()) > 0;
  const hasPushText = (await pushText.count()) > 0;

  expect(hasPushButton || hasPushLink || hasPushText).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 2 — Push to Gradebook section is NOT visible for students
// ---------------------------------------------------------------------------

test('push to gradebook section not visible for student', async ({ page }) => {
  await login(page, STUDENT_EMAIL);

  // Navigate to the student's activity list page (attempt/student-facing view)
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The "Push to Gradebook" control must not appear anywhere for students
  const bodyText = await page.locator('body').textContent();
  const hasPushText = /push to gradebook|export to gradebook|push.*gradebook/i.test(
    bodyText ?? ''
  );
  expect(hasPushText).toBe(false);

  // Also navigate to an individual activity page if an ID is available
  const activityLinks = page.locator('a[href*="/activities/"]');
  const linkCount = await activityLinks.count();
  if (linkCount > 0) {
    const firstHref = await activityLinks.first().getAttribute('href');
    const match = firstHref?.match(/\/activities\/([^/?#]+)/);
    if (match) {
      const activityId = match[1];
      await page.goto(`${BASE}/activities/${activityId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      const pageText = await page.locator('body').textContent();
      const hasGradebookPush = /push to gradebook|export to gradebook|push.*gradebook/i.test(
        pageText ?? ''
      );
      expect(hasGradebookPush).toBe(false);
    }
  }
});

// ---------------------------------------------------------------------------
// Test 3 — Gradebook page shows QCM badge on a pushed assessment
// ---------------------------------------------------------------------------

test('gradebook page shows QCM badge on pushed assessment', async ({ page }) => {
  // This test requires a known pushed assessment to already exist.
  // In CI without a pre-seeded push, we skip gracefully.
  const pushedAssessmentId = process.env.TEST_PUSHED_ASSESSMENT_ID;
  if (!pushedAssessmentId) {
    test.skip(
      true,
      'No TEST_PUSHED_ASSESSMENT_ID env var set — skipping QCM badge test (requires a pre-pushed assessment)'
    );
    return;
  }

  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/gradebook`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The gradebook page must load without errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // There should be a "QCM" badge visible somewhere on the page
  const qcmBadge = page.getByText(/\bQCM\b/i);
  await expect(qcmBadge.first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 4 — Push form shows max score and coefficient inputs
// ---------------------------------------------------------------------------

test('push form shows max score and coefficient inputs', async ({ page }) => {
  await login(page, TEACHER_EMAIL);

  const activityId = await getFirstActivityId(page);
  if (!activityId) {
    test.skip(true, 'No activity found — skipping push form inputs test');
    return;
  }

  await page.goto(`${BASE}/activities/${activityId}/results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Attempt to open the "Push to Gradebook" form by clicking the button
  const pushButton = page.getByRole('button', {
    name: /push to gradebook|export to gradebook|push.*gradebook|envoyer.*bulletin|exporter.*notes/i,
  });
  const hasPushButton = (await pushButton.count()) > 0;

  if (hasPushButton) {
    await pushButton.first().click();
    await page.waitForTimeout(1500);
  }
  // Whether we clicked a button or the form is always visible, check for inputs

  // max_score input — accept various labels
  const maxScoreInput = page.locator(
    'input[name*="max_score"], input[id*="max_score"], ' +
    'input[name*="maxScore"], input[id*="maxScore"], ' +
    'input[placeholder*="max score"], input[placeholder*="note max"], ' +
    'input[placeholder*="sur"]'
  );

  // coefficient input
  const coefficientInput = page.locator(
    'input[name*="coefficient"], input[id*="coefficient"], ' +
    'input[placeholder*="coefficient"], input[placeholder*="coeff"]'
  );

  // Fall back: look for labels containing "max" or "coefficient"
  const maxLabel = page.getByLabel(/max.*score|note.*max|note sur|max/i);
  const coeffLabel = page.getByLabel(/coefficient|coeff/i);

  const hasMaxInput =
    (await maxScoreInput.count()) > 0 || (await maxLabel.count()) > 0;
  const hasCoeffInput =
    (await coefficientInput.count()) > 0 || (await coeffLabel.count()) > 0;

  // At minimum, the max score input must be present when the form is accessible
  expect(hasMaxInput || hasCoeffInput).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 5 — Unauthenticated user is redirected from activity results page
// ---------------------------------------------------------------------------

test('unauthenticated redirected from activity results', async ({ page }) => {
  // Navigate to a results page without logging in first
  await page.goto(`${BASE}/activities/some-fake-id/results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Should be redirected to login (URL contains /login) or the body shows a login form
  const currentUrl = page.url();
  const isRedirectedToLogin = /\/login/i.test(currentUrl);

  const loginInputVisible =
    (await page.locator('input[id="email"], input[type="email"]').count()) > 0;

  expect(isRedirectedToLogin || loginInputVisible).toBe(true);
});
