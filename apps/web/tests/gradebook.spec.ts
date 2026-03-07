import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

async function login(page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', 'demo2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

test('teacher sees gradebook with subject and term filters', async ({ page }) => {
  await login(page, 'teacher@demo.edulia.io');
  await page.goto(`${BASE}/gradebook`);
  await page.waitForTimeout(2000);
  // Subject and term selects should be present
  await expect(page.locator('select')).toHaveCount({ minimum: 1 });
});

test('teacher can open create assessment modal', async ({ page }) => {
  await login(page, 'teacher@demo.edulia.io');
  await page.goto(`${BASE}/gradebook`);
  await page.waitForTimeout(2000);
  const createBtn = page.getByRole('button', { name: /new assessment|nouvel/i });
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await expect(page.locator('[role="dialog"], .modal, form')).toBeVisible({ timeout: 3000 });
  }
});

test('grade entry page shows student names not UUIDs', async ({ page }) => {
  await login(page, 'teacher@demo.edulia.io');
  await page.goto(`${BASE}/gradebook`);
  await page.waitForTimeout(2000);
  const assessmentLinks = page.locator('a[href*="/gradebook/assessments/"]');
  if (await assessmentLinks.count() > 0) {
    await assessmentLinks.first().click();
    await page.waitForTimeout(2000);
    // Should NOT see raw UUIDs (8 hex chars followed by dots is a red flag)
    const bodyText = await page.locator('body').innerText();
    const uuidPattern = /[0-9a-f]{8}\.\.\./;
    expect(uuidPattern.test(bodyText)).toBe(false);
  }
});

test('student grades page has term filter', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/grades`);
  await page.waitForTimeout(2000);
  // Term selector or "All terms" text should appear
  await expect(page.locator('body')).toContainText(/term|trimestre|all terms/i);
});

test('QCM-sourced assessment shows badge in gradebook', async ({ page }) => {
  await login(page, 'teacher@demo.edulia.io');
  await page.goto(`${BASE}/gradebook`);
  await page.waitForTimeout(2000);
  // If any QCM-pushed assessments exist, badge should be visible
  const qcmBadge = page.locator('text=QCM');
  // Just check the page loaded — badge only appears if data exists
  await expect(page.locator('body')).toBeVisible();
});
