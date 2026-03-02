import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://192.168.0.120:3000';

async function login(page, email: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'demo2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

test('admin sees timetable grid', async ({ page }) => {
  await login(page, 'admin@demo.edulia.io');
  await page.goto(`${BASE}/timetable`);
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).toContainText(/lundi|mardi|monday|tuesday|emploi/i);
});

test('student sees personal schedule', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/timetable`);
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).toContainText(/emploi|schedule|timetable/i);
});
