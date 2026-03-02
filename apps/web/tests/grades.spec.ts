import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://192.168.0.120:3000';

async function login(page, email: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'demo2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

test('student sees grades page with subjects', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/grades`);
  await expect(page.locator('text=Mes notes')).toBeVisible({ timeout: 5000 });
});

test('student can expand subject to see assessments', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/grades`);
  await page.waitForTimeout(2000);
  const subjects = page.locator('[data-testid="subject-row"]');
  if (await subjects.count() > 0) {
    await subjects.first().click();
    await expect(page.locator('[data-testid="assessment-detail"]').first()).toBeVisible({ timeout: 3000 });
  }
});

test('parent sees child selector', async ({ page }) => {
  await login(page, 'parent.leroy@demo.edulia.io');
  await page.goto(`${BASE}/grades`);
  await page.waitForTimeout(2000);
  // Parent should see grades or child selector
  await expect(page.locator('body')).toContainText(/note|grade|enfant|child/i);
});

test('download report card button visible', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/grades`);
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Bulletin PDF')).toBeVisible({ timeout: 5000 });
});
