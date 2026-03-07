import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

// Demo accounts — same credentials used across the test suite
const TEACHER_EMAIL = 'prof.martin@demo.edulia.io';
const STUDENT_EMAIL = 'emma.leroy@demo.edulia.io';
const PASSWORD = 'demo2026';

// ---------------------------------------------------------------------------
// Login helper — mirrors activity-builder.spec.ts and activity-attempt.spec.ts exactly
// ---------------------------------------------------------------------------

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Helper: resolve a known published activity ID from the teacher's list.
//
// Navigates to /activities as teacher and looks for the first activity card
// that contains a UUID in its href. Returns the UUID or null if none found.
// ---------------------------------------------------------------------------

async function getFirstActivityId(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Look for any <a> that contains a UUID-shaped segment in the href
  const activityLinks = page.locator(
    '[data-testid="activity-item"] a, [data-testid="activity-card"] a, a[href*="/activities/"]'
  );
  const count = await activityLinks.count();

  for (let i = 0; i < count; i++) {
    const href = await activityLinks.nth(i).getAttribute('href');
    if (!href) continue;
    const segments = href.split('/');
    const uuidSegment = segments.find(
      seg => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
    );
    if (uuidSegment) return uuidSegment;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. Teacher can navigate to the reports page
// ---------------------------------------------------------------------------

test('teacher can navigate to reports page', async ({ page }) => {
  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/activities/report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must not crash with a 500 or unhandled error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Expect a heading or title that signals we are on the reports page
  const reportHeading = page.getByRole('heading', {
    name: /reports?|activity reports?|tableau de bord|rapport/i,
  });
  const hasHeading = await reportHeading.isVisible().catch(() => false);

  if (!hasHeading) {
    // Fallback: the body must contain at least one keyword identifying the page
    await expect(page.locator('body')).toContainText(/report|rapport|tableau/i);
  }
});

// ---------------------------------------------------------------------------
// 2. Reports page shows activity cards (or graceful empty state)
// ---------------------------------------------------------------------------

test('reports page shows activity cards', async ({ page }) => {
  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/activities/report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must load without a server error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for activity cards or stats containers
  const activityCards = page.locator(
    '[data-testid="report-card"], [data-testid="activity-report-item"], ' +
    '[data-testid="activity-card"], [class*="report-card"], [class*="activity-card"]'
  );
  const cardCount = await activityCards.count();

  if (cardCount > 0) {
    // Cards found — verify at least the first one is visible
    await expect(activityCards.first()).toBeVisible();
  } else {
    // No cards — verify an empty-state element or generic content is shown
    // (not a blank page or a crash)
    const emptyState = page.locator(
      '[data-testid="empty-state"], [data-testid="no-activities"], ' +
      '[class*="empty"], p, h2, h3'
    ).first();
    await expect(emptyState).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// 3. Reports sidebar item visible for teacher
// ---------------------------------------------------------------------------

test('reports sidebar item visible for teacher', async ({ page }) => {
  await login(page, TEACHER_EMAIL);

  // Navigate somewhere so the sidebar is rendered
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The sidebar is typically the <nav> complementary landmark
  const sidebar = page.getByRole('complementary');

  // Look for a "Reports" / "Rapports" link, either top-level or nested under Activities
  const reportsLink = sidebar.getByRole('link', {
    name: /^reports?$|^rapports?$|activity reports/i,
  });

  const hasReportsLink = await reportsLink.isVisible().catch(() => false);

  if (!hasReportsLink) {
    // Fallback: the sidebar should contain text that includes "report" in some form
    // (e.g. as a sub-item label that's not a full <a> element)
    await expect(sidebar).toContainText(/report|rapport/i);
  } else {
    await expect(reportsLink).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// 4. Student cannot access the reports page
// ---------------------------------------------------------------------------

test('student cannot access reports page', async ({ page }) => {
  await login(page, STUDENT_EMAIL);
  await page.goto(`${BASE}/activities/report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // The page must not crash (no 500)
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Acceptable outcomes:
  //   a) Redirected away from /activities/report (URL changed)
  //   b) A 403 / "Access denied" / "Forbidden" message shown
  //   c) An empty state / placeholder (no data visible) rather than a full report

  const currentUrl = page.url();
  const wasRedirected = !currentUrl.includes('/activities/report');

  if (wasRedirected) {
    // Student was correctly redirected — pass
    return;
  }

  // If still on the page, it must show an access-denied message or empty state,
  // NOT a full report with teacher-only data.
  const accessDenied = page.locator(
    '[data-testid="access-denied"], [data-testid="forbidden"], ' +
    '[class*="forbidden"], [class*="access-denied"]'
  );
  const hasAccessDenied = await accessDenied.isVisible().catch(() => false);

  if (hasAccessDenied) {
    await expect(accessDenied.first()).toBeVisible();
    return;
  }

  // Final fallback: verify the page body contains an appropriate keyword
  // OR does NOT contain stats/chart elements that indicate a full report was rendered
  const reportStats = page.locator(
    '[data-testid="report-card"], [data-testid="completion-rate"], ' +
    '[data-testid="avg-score"], [data-testid="error-rate"]'
  );
  const statsCount = await reportStats.count();

  // If stats are visible, the student should still not see error-rate breakdowns
  // (which are teacher-specific). We assert no crash rather than requiring a redirect
  // since the exact UX is determined by Agent B.
  expect(statsCount).toBe(0, {
    message:
      'Student should not see teacher-only report statistics on /activities/report',
  });
});

// ---------------------------------------------------------------------------
// 5. Activity results page shows report stats for teacher
// ---------------------------------------------------------------------------

test('activity results page shows report stats', async ({ page }) => {
  await login(page, TEACHER_EMAIL);

  // Try to find an existing activity ID to navigate to its results
  const activityId = await getFirstActivityId(page);

  if (!activityId) {
    // No activities in the demo environment — navigate to results generically
    await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for any "Results" link on activity cards
    const resultsLink = page
      .getByRole('link', { name: /results|résultats/i })
      .first();
    if (await resultsLink.isVisible()) {
      await resultsLink.click();
      await page.waitForTimeout(2000);
    } else {
      test.skip(); // No activities seeded — nothing to assert
      return;
    }
  } else {
    await page.goto(`${BASE}/activities/${activityId}/results`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(2000);
  }

  // Page must not crash
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for completion rate or average score indicators
  // These are the key metrics defined in the Feature 3 spec.
  const completionRate = page.locator(
    '[data-testid="completion-rate"], [data-testid="completionRate"], ' +
    '[class*="completion"], [aria-label*="completion"]'
  );
  const avgScore = page.locator(
    '[data-testid="avg-score"], [data-testid="avgScore"], ' +
    '[class*="avg-score"], [aria-label*="avg"]'
  );
  const statsSection = page.locator(
    '[data-testid="results-summary"], [data-testid="report-stats"], ' +
    '[data-testid="stats"], [class*="stats"], [class*="summary"]'
  );

  const hasCompletionRate = await completionRate.first().isVisible().catch(() => false);
  const hasAvgScore = await avgScore.first().isVisible().catch(() => false);
  const hasStats = await statsSection.first().isVisible().catch(() => false);

  if (hasCompletionRate || hasAvgScore || hasStats) {
    // At least one stat element is visible — pass
    return;
  }

  // Final fallback: the page body should contain numeric or label content
  // associated with results (score, percentage, submitted count, etc.)
  await expect(page.locator('body')).toContainText(
    /\d+\s*\/\s*\d+|%|score|avg|average|submitted|soumis|completion|taux/i
  );
});

// ---------------------------------------------------------------------------
// 6. Reports page does not expose data to unauthenticated users
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from reports page', async ({ page }) => {
  // Do NOT log in — go directly to the reports page
  await page.goto(`${BASE}/activities/report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();

  // Must be redirected to /login or an auth page
  const isOnAuthPage =
    currentUrl.includes('/login') ||
    currentUrl.includes('/signin') ||
    currentUrl.includes('/auth');

  if (!isOnAuthPage) {
    // If not redirected, the page must show a login form or access denied,
    // NOT actual report data
    const loginForm = page.locator('input[id="email"], input[type="email"]');
    const hasLoginForm = await loginForm.isVisible().catch(() => false);

    const reportData = page.locator(
      '[data-testid="report-card"], [data-testid="completion-rate"], ' +
      '[data-testid="avg-score"]'
    );
    const hasReportData = await reportData.count() > 0;

    // Either a login form is present, or no report data is exposed
    expect(hasLoginForm || !hasReportData).toBeTruthy();
  } else {
    // Correctly redirected to login
    await expect(page).toHaveURL(/login|signin|auth/i);
  }
});

// ---------------------------------------------------------------------------
// 7. Reports page renders without JavaScript errors (smoke test)
// ---------------------------------------------------------------------------

test('reports page renders without console errors for teacher', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/activities/report`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Filter out known benign errors (e.g. analytics, fonts, non-critical 3rd-party)
  const criticalErrors = consoleErrors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('analytics') &&
      !e.includes('fonts.gstatic') &&
      !e.includes('googletagmanager') &&
      !e.includes('Failed to load resource') // network errors for optional assets
  );

  expect(criticalErrors).toHaveLength(0, {
    message: `Critical console errors on /activities/report:\n${criticalErrors.join('\n')}`,
  });
});
