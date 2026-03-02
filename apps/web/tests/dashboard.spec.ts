import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || 'admin@edulia.angelstreet.io';
const PASSWORD = process.env.TEST_PASSWORD || 'ChangeMe123!';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
  });

  test('displays welcome message', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to Edulia' })).toBeVisible();
  });

  test('displays stat cards', async ({ page }) => {
    const main = page.getByRole('main');
    await expect(main.getByText('Total users')).toBeVisible();
    await expect(main.getByText('Active students')).toBeVisible();
    await expect(main.getByText('Teachers')).toBeVisible();
    await expect(main.getByText('Classes')).toBeVisible();
  });

  test('displays recent activity', async ({ page }) => {
    await expect(page.getByText('Recent activity')).toBeVisible();
  });

  test('topbar shows user name', async ({ page }) => {
    // User name appears in topbar (use the banner region to scope)
    const topbar = page.getByRole('banner');
    await expect(topbar.getByText('Admin Mon École')).toBeVisible();
  });

  test('topbar has language switcher', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'FR' })).toBeVisible();
  });

  test('topbar has notification bell', async ({ page }) => {
    const topbar = page.getByRole('banner');
    const bellButton = topbar.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(bellButton).toBeVisible();
  });

  test('breadcrumb shows current location', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'breadcrumb' }).first()).toBeVisible();
  });
});
