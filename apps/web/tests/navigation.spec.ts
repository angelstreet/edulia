import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || 'admin@edulia.angelstreet.io';
const PASSWORD = process.env.TEST_PASSWORD || 'ChangeMe123!';

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email address').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
  });

  test('sidebar shows admin menu items', async ({ page }) => {
    const nav = page.getByRole('complementary');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Classes' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Subjects' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Academic year' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'School settings' })).toBeVisible();
  });

  test('sidebar shows user info', async ({ page }) => {
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('Admin Mon École')).toBeVisible();
  });

  test('navigate to Users page', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: 'Users' }).click();
    await page.waitForURL('**/admin/users');
    await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  });

  test('navigate to Classes page', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: 'Classes' }).click();
    await page.waitForURL('**/admin/classes');
    await expect(page.getByRole('heading', { name: 'Classes', exact: true })).toBeVisible();
  });

  test('navigate to Subjects page', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: 'Subjects' }).click();
    await page.waitForURL('**/admin/subjects');
    await expect(page.getByRole('heading', { name: 'Subjects', exact: true })).toBeVisible();
  });

  test('navigate to Academic year page', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: 'Academic year' }).click();
    await page.waitForURL('**/admin/academic-year');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('navigate to School settings page', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: 'School settings' }).click();
    await page.waitForURL('**/admin/settings');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('navigate back to Dashboard', async ({ page }) => {
    await page.getByRole('complementary').getByRole('link', { name: 'Users' }).click();
    await page.waitForURL('**/admin/users');
    await page.getByRole('complementary').getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome to Edulia' })).toBeVisible();
  });

  test('no console errors during navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const nav = page.getByRole('complementary');
    await nav.getByRole('link', { name: 'Users' }).click();
    await page.waitForURL('**/admin/users');
    await nav.getByRole('link', { name: 'Classes' }).click();
    await page.waitForURL('**/admin/classes');
    await nav.getByRole('link', { name: 'Subjects' }).click();
    await page.waitForURL('**/admin/subjects');
    await nav.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL('**/dashboard');

    const realErrors = errors.filter(
      (e) => !e.includes('401') && !e.includes('favicon') && !e.includes('Failed to load resource'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
