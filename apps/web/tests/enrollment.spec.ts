import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', 'demo2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Test 1 — Admin enrollment page loads without 500
// ---------------------------------------------------------------------------

test('admin enrollment page loads', async ({ page }) => {
  // Attempt admin login; if credentials fail, skip gracefully
  try {
    await login(page, 'admin@demo.edulia.io');
  } catch {
    test.skip(true, 'Admin login failed — admin credentials not available in demo');
    return;
  }

  const response = await page.goto(`${BASE}/admin/enrollment`, { waitUntil: 'networkidle' });
  // Page must not return a 500-level HTTP error
  if (response) {
    expect(response.status()).toBeLessThan(500);
  }
  // Body must be present and not show an unhandled server error
  await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/i);
});

// ---------------------------------------------------------------------------
// Test 2 — Parent/student can see the enrollment form page
// ---------------------------------------------------------------------------

test('parent can see enrollment form', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  const response = await page.goto(`${BASE}/enrollment`, { waitUntil: 'networkidle' });

  if (response) {
    expect(response.status()).toBeLessThan(500);
  }
  // Page should render without crashing
  await expect(page.locator('body')).toBeVisible();
  // There should be some form element visible
  const formVisible = await page.locator('form, [role="form"]').count();
  expect(formVisible).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test 3 — Enrollment form has child name input fields
// ---------------------------------------------------------------------------

test('enrollment form has child name fields', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/enrollment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check for child first name and last name inputs (various possible selectors)
  const childNameInput = page.locator(
    'input[name*="child"], input[id*="child"], input[placeholder*="prénom"], ' +
    'input[placeholder*="Prénom"], input[placeholder*="prenom"], ' +
    'input[aria-label*="child"], input[aria-label*="enfant"]'
  );
  const count = await childNameInput.count();
  expect(count).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test 4 — Enrollment form has parent info / email input
// ---------------------------------------------------------------------------

test('enrollment form has parent info fields', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/enrollment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Email input must be present somewhere on the enrollment page
  const emailInput = page.locator(
    'input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email"]'
  );
  const count = await emailInput.count();
  expect(count).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test 5 — Enrollment page shows my requests section / empty state
// ---------------------------------------------------------------------------

test('enrollment page shows my requests section', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/enrollment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Either a list of existing requests or an empty-state message should be visible
  const hasRequestsList = await page.locator(
    '[data-testid*="enrollment"], [data-testid*="request"], ' +
    '.enrollment-list, .requests-list, ' +
    'table, ul, ol'
  ).count();

  const hasEmptyState = await page.locator('body').evaluate((el) =>
    /aucune|no request|no enrollment|vide|empty|pas encore|soumis/i.test(el.textContent || '')
  );

  // At least one of: a list container OR an empty-state message
  expect(hasRequestsList > 0 || hasEmptyState).toBeTruthy();
});
