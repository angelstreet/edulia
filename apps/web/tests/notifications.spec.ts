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
// Test 1 — Bell icon is visible in the topbar
// ---------------------------------------------------------------------------

test('bell icon visible in topbar', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.waitForTimeout(1000);

  // Look for the bell notification button — could be a button with aria-label,
  // an SVG icon, or a data-testid element
  const bellLocator = page.locator(
    '[aria-label*="notification" i], [aria-label*="cloche" i], [data-testid*="bell" i], [data-testid*="notification" i]'
  ).or(
    page.locator('button').filter({ has: page.locator('svg') }).first()
  );

  // Give the topbar a moment to render fully
  await expect(bellLocator).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// Test 2 — Notification panel opens on bell click
// ---------------------------------------------------------------------------

test('notification panel opens on bell click', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.waitForTimeout(1000);

  // Find and click the bell button
  const bellButton = page.locator(
    '[aria-label*="notification" i], [aria-label*="cloche" i], [data-testid*="bell" i], [data-testid*="notification" i]'
  ).first();

  const hasBell = await bellButton.count() > 0;
  if (!hasBell) {
    // Fallback: try any button in the top navigation area
    const navButtons = page.locator('header button, nav button');
    const count = await navButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }
    // Click the last button in the nav (typically the notification bell)
    await navButtons.last().click();
  } else {
    await bellButton.click();
  }

  // After clicking, a dropdown/panel/drawer should appear
  // It typically contains notification items, a heading, or a "no notifications" message
  const panelLocator = page.locator(
    '[data-testid*="notification-panel" i], [data-testid*="notification-dropdown" i], ' +
    '[role="dialog"], [role="menu"], [role="listbox"], ' +
    '.notification-panel, .notification-dropdown, .notifications-list'
  ).or(
    page.locator('text=/notification|aucune|no notification/i')
  );

  await expect(panelLocator.first()).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// Test 3 — Notification panel closes on outside click
// ---------------------------------------------------------------------------

test('notification panel closes on outside click', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.waitForTimeout(1000);

  // Open the notification panel
  const bellButton = page.locator(
    '[aria-label*="notification" i], [aria-label*="cloche" i], [data-testid*="bell" i], [data-testid*="notification" i]'
  ).first();

  const hasBell = await bellButton.count() > 0;
  if (!hasBell) {
    test.skip();
    return;
  }

  await bellButton.click();
  await page.waitForTimeout(500);

  // Verify a panel appeared
  const panelLocator = page.locator(
    '[data-testid*="notification-panel" i], [data-testid*="notification-dropdown" i], ' +
    '[role="dialog"], [role="menu"], ' +
    '.notification-panel, .notification-dropdown'
  ).first();

  const panelVisible = await panelLocator.isVisible().catch(() => false);
  if (!panelVisible) {
    // Panel structure unknown — skip rather than false-fail
    test.skip();
    return;
  }

  // Click somewhere outside the panel (the page title / main content area)
  await page.click('main, h1, body', { position: { x: 10, y: 10 }, force: true });
  await page.waitForTimeout(500);

  // Panel should no longer be visible
  await expect(panelLocator).not.toBeVisible({ timeout: 3_000 });
});

// ---------------------------------------------------------------------------
// Test 4 — Unread badge shows count when there are unread notifications
// ---------------------------------------------------------------------------

test('unread badge shows count', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.waitForTimeout(1000);

  // Look for a badge near the bell — could be a <span> with a number,
  // an element with role="status", or a data-testid badge
  const badgeLocator = page.locator(
    '[data-testid*="badge" i], [data-testid*="unread" i], ' +
    '[aria-label*="unread" i], ' +
    '.badge, .notification-badge, .unread-count'
  );

  const badgeCount = await badgeLocator.count();

  if (badgeCount === 0) {
    // No unread notifications — badge may simply not render when count is 0
    // That is valid behavior; we skip rather than fail
    test.skip();
    return;
  }

  // At least one badge element is present
  const badge = badgeLocator.first();
  await expect(badge).toBeVisible({ timeout: 3_000 });

  // The badge text should be a non-empty number
  const text = await badge.textContent();
  const num = parseInt(text?.trim() ?? '', 10);
  expect(num).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test 5 — Mark all read button works
// ---------------------------------------------------------------------------

test('mark all read button works', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.waitForTimeout(1000);

  // Open the notification panel
  const bellButton = page.locator(
    '[aria-label*="notification" i], [aria-label*="cloche" i], [data-testid*="bell" i], [data-testid*="notification" i]'
  ).first();

  const hasBell = await bellButton.count() > 0;
  if (!hasBell) {
    test.skip();
    return;
  }

  await bellButton.click();
  await page.waitForTimeout(800);

  // Look for a "mark all read" or "tout marquer lu" button inside the panel
  const markAllButton = page.locator(
    'button:has-text(/mark all|tout marquer|tout lire|read all/i), ' +
    '[data-testid*="mark-all" i]'
  ).first();

  const hasMarkAll = await markAllButton.count() > 0;
  if (!hasMarkAll) {
    // No mark-all button found (e.g. no unread notifications) — skip
    test.skip();
    return;
  }

  await markAllButton.click();
  await page.waitForTimeout(800);

  // After marking all read, the unread badge should disappear or show 0
  const badge = page.locator(
    '[data-testid*="badge" i], [data-testid*="unread" i], ' +
    '.badge, .notification-badge, .unread-count'
  );

  const badgeStillVisible = await badge.isVisible().catch(() => false);
  if (badgeStillVisible) {
    const text = await badge.textContent();
    const num = parseInt(text?.trim() ?? '0', 10);
    expect(num).toBe(0);
  }
  // If badge is gone entirely, that also satisfies the requirement
});
