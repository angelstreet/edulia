import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || 'admin@edulia.angelstreet.io';
const PASSWORD = process.env.TEST_PASSWORD || 'ChangeMe123!';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first so localStorage is accessible on the correct origin
    await page.goto('/login');
    await page.evaluate(() => localStorage.removeItem('auth-storage'));
    await page.reload();
  });

  test('login page renders correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Edulia' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.getByLabel('Email address').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Welcome to Edulia' })).toBeVisible();
  });

  test('login with wrong password stays on login page', async ({ page }) => {
    await page.getByLabel('Email address').fill(EMAIL);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Log in' }).click();
    // Should remain on login, not redirect to dashboard
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
    const storage = await page.evaluate(() => {
      const raw = localStorage.getItem('auth-storage');
      return raw ? JSON.parse(raw) : null;
    });
    expect(storage?.state?.isAuthenticated).toBe(false);
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('auth state persists in localStorage after login', async ({ page }) => {
    await page.getByLabel('Email address').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard');

    const storage = await page.evaluate(() => {
      const raw = localStorage.getItem('auth-storage');
      return raw ? JSON.parse(raw) : null;
    });

    expect(storage?.state?.isAuthenticated).toBe(true);
    expect(storage?.state?.accessToken).toBeTruthy();
    expect(storage?.state?.user?.email).toBe('admin@edulia.angelstreet.io');
    expect(storage?.state?.user?.role).toBe('admin');
  });
});
