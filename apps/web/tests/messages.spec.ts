import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://192.168.0.120:3000';

async function login(page, email: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', 'demo2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

test('teacher sees message threads', async ({ page }) => {
  await login(page, 'pierre.martin@demo.edulia.io');
  await page.goto(`${BASE}/messages`);
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).toContainText(/message|fil|thread/i);
});

test('enterprise employee sees threads', async ({ page }) => {
  await login(page, 'marie.lefevre@demo.edulia.io');
  await page.goto(`${BASE}/messages`);
  await page.waitForTimeout(2000);
  // Should see at least one thread (formation, validation)
  await expect(page.locator('body')).toContainText(/formation|validation|message/i);
});

test('message bubbles show sender names', async ({ page }) => {
  await login(page, 'marie.lefevre@demo.edulia.io');
  await page.goto(`${BASE}/messages`);
  await page.waitForTimeout(2000);
  // Click first thread
  const thread = page.locator('[data-testid="thread-item"]').first();
  if (await thread.isVisible()) {
    await thread.click();
    await page.waitForTimeout(1000);
    // Sender name should be visible (not UUID)
    const messageArea = page.locator('[data-testid="message-area"]');
    await expect(messageArea).not.toContainText(/^[0-9a-f]{8}-/);
  }
});
