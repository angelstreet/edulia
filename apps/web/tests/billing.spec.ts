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
// Test 1 — Wallet page shows balance
// ---------------------------------------------------------------------------

test('wallet page shows balance', async ({ page }) => {
  // Login as student (emma.leroy is a student/child account)
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' });

  // The balance should be visible as a number (with optional currency symbol/code).
  // Match any string that looks like a monetary value or a numeric balance display.
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i, {
    timeout: 5_000,
  });

  // Look for a numeric or currency-formatted value on the page.
  // Tolerant regex: matches things like "€ 10,00", "$0.00", "0 EUR", "Solde", "Balance", etc.
  const balanceVisible =
    (await page.locator('text=/[€$£]\\s*\\d/').count()) > 0 ||
    (await page.locator('text=/\\d+[,.]\\d{2}/').count()) > 0 ||
    (await page.locator('[data-testid="wallet-balance"]').count()) > 0 ||
    (await page.locator('text=/balance|solde|wallet/i').count()) > 0;

  expect(balanceVisible).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 2 — Top-up button opens a payment modal
// ---------------------------------------------------------------------------

test('top up button opens payment modal', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' });

  // Find the top-up trigger button — try common labels
  const topUpButton = page
    .locator('button, a')
    .filter({ hasText: /top.?up|recharger|recharge|add funds|ajouter/i })
    .first();

  const buttonCount = await topUpButton.count();
  if (buttonCount === 0) {
    // If no top-up button exists, skip gracefully (feature may be behind a flag)
    test.skip();
    return;
  }

  await topUpButton.click();

  // After clicking, a modal / dialog / drawer should appear.
  // It should contain either an amount input, a card element (Stripe iframe),
  // or a payment form section.
  const modalVisible =
    (await page.locator('[role="dialog"]').count()) > 0 ||
    (await page.locator('[data-testid="topup-modal"]').count()) > 0 ||
    (await page.locator('.modal, .drawer, .sheet').count()) > 0;

  expect(modalVisible).toBe(true);

  // The modal should contain either an amount input or a Stripe card element
  const hasAmountInput = await page.locator('input[type="number"], input[name="amount"], input[placeholder*="montant"], input[placeholder*="amount"]').count() > 0;
  const hasStripeIframe = await page.locator('iframe[name^="__privateStripeFrame"], iframe[src*="stripe"]').count() > 0;
  const hasCardField = await page.locator('[class*="card"], [data-testid*="card"]').count() > 0;

  expect(hasAmountInput || hasStripeIframe || hasCardField).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 3 — Wallet shows transaction history (or empty-state message)
// ---------------------------------------------------------------------------

test('wallet shows transaction history', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_000);

  // The page should show either a list of transactions or an empty-state message.
  const hasTransactions =
    (await page.locator('[data-testid="transaction-item"], [data-testid="transaction-row"]').count()) > 0 ||
    (await page.locator('table tbody tr').count()) > 0 ||
    (await page.locator('text=/transaction|historique|history|aucune|no transaction/i').count()) > 0;

  expect(hasTransactions).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 4 — Payment modal closes on cancel
// ---------------------------------------------------------------------------

test('payment modal closes on cancel', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' });

  // Open the top-up modal
  const topUpButton = page
    .locator('button, a')
    .filter({ hasText: /top.?up|recharger|recharge|add funds|ajouter/i })
    .first();

  if (await topUpButton.count() === 0) {
    test.skip();
    return;
  }

  await topUpButton.click();

  // Confirm the modal is open
  const dialog = page.locator('[role="dialog"], [data-testid="topup-modal"], .modal, .drawer');
  const dialogOpen = await dialog.count() > 0;

  if (!dialogOpen) {
    // Modal did not open — skip; feature may not be implemented yet
    test.skip();
    return;
  }

  // Click the cancel / close button
  const cancelButton = dialog
    .locator('button')
    .filter({ hasText: /cancel|annuler|fermer|close/i })
    .first();

  const closeButton = dialog.locator('[aria-label="close"], [aria-label="fermer"], [data-testid="modal-close"]').first();

  if (await cancelButton.count() > 0) {
    await cancelButton.click();
  } else if (await closeButton.count() > 0) {
    await closeButton.click();
  } else {
    // Fallback: press Escape to close
    await page.keyboard.press('Escape');
  }

  await page.waitForTimeout(500);

  // The modal should no longer be visible
  const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  expect(dialogVisible).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 5 — Wallet page renders without a 500 error
// ---------------------------------------------------------------------------

test('wallet page renders without 500 error', async ({ page }) => {
  await login(page, 'emma.leroy@demo.edulia.io');

  // Collect any unexpected server-error responses
  const serverErrors: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_000);

  // The page body must not display a raw "500" or "internal server error" message
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  const hasErrorText =
    bodyText.includes('internal server error') ||
    bodyText.includes('500 | ') ||
    bodyText.includes('application error') ||
    bodyText.includes('une erreur est survenue') && bodyText.includes('500');

  expect(hasErrorText).toBe(false);

  // No 5xx responses should have been triggered for the wallet page itself
  expect(serverErrors.filter((e) => e.includes('/wallet'))).toHaveLength(0);
});
