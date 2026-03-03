import { test, expect } from '@playwright/test';

const HUB = process.env.HUB_URL || 'https://eduliahub.angelstreet.io';

test('hub catalog loads courses', async ({ page }) => {
  await page.goto(HUB);
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).toContainText(/cours|course|catalog/i);
});

test('hub shows platforms', async ({ page }) => {
  await page.goto(`${HUB}/platforms`);
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).toContainText(/coursera|udemy|openclassrooms/i);
});

test('hub course detail page', async ({ page }) => {
  await page.goto(HUB);
  await page.waitForTimeout(2000);
  const courseCard = page.locator('[data-testid="course-card"]').first();
  if (await courseCard.isVisible()) {
    await courseCard.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/description|durée|duration|price/i);
  }
});
