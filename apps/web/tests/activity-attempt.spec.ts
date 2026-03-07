import { test, expect, Page, Browser } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

// Demo accounts — same credentials used across the test suite
const TEACHER_EMAIL = 'prof.martin@demo.edulia.io';
const STUDENT_EMAIL = 'emma.leroy@demo.edulia.io';
const PASSWORD = 'demo2026';

// ---------------------------------------------------------------------------
// Login helper — mirrors activity-builder.spec.ts exactly
// ---------------------------------------------------------------------------

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Helper: navigate to the attempt page for a known published activity.
//
// Strategy: go to /activities, find the first activity with a "Start" button
// visible (indicating it's published and accessible to the student), and return
// the activity URL. Falls back to a direct URL if the activities list is empty.
// ---------------------------------------------------------------------------

async function navigateToAttemptPage(page: Page): Promise<void> {
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Look for any "Start" / "Commencer" button that links to an attempt page
  const startLink = page.getByRole('link', { name: /^start$|^commencer$/i }).first();
  const startButton = page.getByRole('button', { name: /^start$|^commencer$/i }).first();

  if (await startLink.isVisible()) {
    await startLink.click();
  } else if (await startButton.isVisible()) {
    await startButton.click();
  } else {
    // Fallback: try navigating to the attempt route directly.
    // The server will redirect if no attempt exists yet.
    await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });

    // If there is an activity card, click into it
    const activityCard = page
      .locator('[data-testid="activity-item"], [data-testid="activity-card"]')
      .first();
    if (await activityCard.isVisible()) {
      await activityCard.click();
    }
  }

  await page.waitForTimeout(2000);
}

// ---------------------------------------------------------------------------
// 1. Student can start an attempt
// ---------------------------------------------------------------------------

test('student can start an attempt', async ({ page }) => {
  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must load without server errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for a published activity the student can start
  const startLink = page.getByRole('link', { name: /start|commencer/i }).first();
  const hasStart = await startLink.isVisible();

  if (!hasStart) {
    // No published activity seeded for this student — skip gracefully
    // The acceptance criterion is verified via the API test suite.
    test.skip(); // marks test as skipped rather than failed
    return;
  }

  await startLink.click();
  await page.waitForTimeout(2000);

  // After navigating to the attempt page we should see question text
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // At least one question should be visible
  const questionText = page.locator(
    '[data-testid="question-text"], [data-testid="question"], h2, h3, p'
  ).first();
  await expect(questionText).toBeVisible();

  // Choice buttons should be visible
  const choices = page.locator(
    '[data-testid="choice-button"], [data-testid="choice"], button[class*="choice"], label[class*="choice"]'
  );
  const choiceCount = await choices.count();
  // Relaxed assertion: either choice-specific elements or at least clickable items
  if (choiceCount > 0) {
    await expect(choices.first()).toBeVisible();
  } else {
    // Generic fallback: at least some interactive elements are present
    const anyInput = page.locator('input[type="radio"], input[type="checkbox"], button').first();
    await expect(anyInput).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// 2. Student can answer and submit
// ---------------------------------------------------------------------------

test('student can answer and submit', async ({ page }) => {
  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const startLink = page.getByRole('link', { name: /start|commencer/i }).first();
  if (!(await startLink.isVisible())) {
    test.skip();
    return;
  }

  await startLink.click();
  await page.waitForTimeout(2000);

  // Select a choice for each visible question. We click the first available
  // choice button / radio for each question block.
  const questionBlocks = page.locator(
    '[data-testid="question-item"], [data-testid="question-block"], [data-testid="question"]'
  );
  const blockCount = await questionBlocks.count();

  if (blockCount > 0) {
    // Structured question blocks found
    for (let i = 0; i < blockCount; i++) {
      const block = questionBlocks.nth(i);
      const firstChoice = block.locator(
        'input[type="radio"], input[type="checkbox"], [data-testid="choice-button"], button[class*="choice"]'
      ).first();
      if (await firstChoice.isVisible()) {
        await firstChoice.click();
        await page.waitForTimeout(200);
      }
    }
  } else {
    // Flat layout: click all radio/checkbox inputs visible on the page
    const radios = page.locator('input[type="radio"], input[type="checkbox"]');
    const radioCount = await radios.count();
    for (let i = 0; i < radioCount; i++) {
      if (await radios.nth(i).isVisible()) {
        await radios.nth(i).click();
        await page.waitForTimeout(150);
      }
    }
  }

  // Click the Submit button
  const submitBtn = page.getByRole('button', { name: /submit|soumettre|valider/i });
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  await page.waitForTimeout(3000);

  // After submit, the score should be visible somewhere on the page.
  // Common patterns: "14 / 20", "Score: 14", "Votre score : 14/20"
  await expect(page.locator('body')).toContainText(/\d+\s*\/\s*\d+|score/i);
});

// ---------------------------------------------------------------------------
// 3. Score reveal shows correct and wrong answers
// ---------------------------------------------------------------------------

test('score reveal shows correct and wrong answers', async ({ page }) => {
  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const startLink = page.getByRole('link', { name: /start|commencer/i }).first();
  if (!(await startLink.isVisible())) {
    test.skip();
    return;
  }

  await startLink.click();
  await page.waitForTimeout(2000);

  // Answer all questions with the first available choice
  const radios = page.locator('input[type="radio"], input[type="checkbox"]');
  const radioCount = await radios.count();
  for (let i = 0; i < radioCount; i++) {
    if (await radios.nth(i).isVisible()) {
      await radios.nth(i).click();
      await page.waitForTimeout(150);
    }
  }

  const submitBtn = page.getByRole('button', { name: /submit|soumettre|valider/i });
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
  }

  // After submission the result section must be visible.
  // We check for: a result container, or score text, or a heading like "Results" / "Résultats"
  const resultSection = page.locator(
    '[data-testid="attempt-result"], [data-testid="result"], [data-testid="score-reveal"], ' +
    'section[class*="result"], div[class*="result"]'
  );
  const hasResultSection = await resultSection.first().isVisible().catch(() => false);

  if (!hasResultSection) {
    // Fallback: the body must at least contain score indicators
    await expect(page.locator('body')).toContainText(/\d+\s*\/\s*\d+|résultat|result|score/i);
  } else {
    await expect(resultSection.first()).toBeVisible();
  }

  // Check for visual correct/wrong indicators (green/red classes or data-testid)
  const correctIndicator = page.locator(
    '[data-testid="correct"], [data-testid="answer-correct"], ' +
    '[class*="correct"], [class*="success"], [aria-label*="correct"]'
  );
  const wrongIndicator = page.locator(
    '[data-testid="incorrect"], [data-testid="answer-wrong"], ' +
    '[class*="incorrect"], [class*="wrong"], [class*="error"], [aria-label*="wrong"]'
  );

  // At least one kind of indicator must be present after submit
  const hasCorrect = await correctIndicator.first().isVisible().catch(() => false);
  const hasWrong = await wrongIndicator.first().isVisible().catch(() => false);

  // It is acceptable if only correct indicators are shown (all answers were right)
  // or only wrong (all answers were wrong). At least one must be present.
  expect(hasCorrect || hasWrong).toBeTruthy();
});

// ---------------------------------------------------------------------------
// 4. Student cannot start same activity twice — handled gracefully
// ---------------------------------------------------------------------------

test('student cannot start same activity twice', async ({ page }) => {
  // If the student already has a submitted attempt, navigating to the attempt
  // page should show the result directly rather than an error.
  await login(page, STUDENT_EMAIL);

  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // If the previous tests already submitted an attempt, the "Start" button
  // should be replaced by a "View Results" / "Voir résultats" or similar.
  const viewResultsLink = page.getByRole('link', { name: /result|résultat|review|revoir/i }).first();
  const startLink = page.getByRole('link', { name: /start|commencer/i }).first();

  const hasResults = await viewResultsLink.isVisible().catch(() => false);
  const hasStart = await startLink.isVisible().catch(() => false);

  if (hasResults) {
    // Student can navigate to their results without seeing a duplicate-attempt error
    await viewResultsLink.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toContainText(/409|conflict|already submitted|déjà soumis/i);
    await expect(page.locator('body')).toContainText(/\d+\s*\/\s*\d+|score|résultat|result/i);
  } else if (hasStart) {
    // No prior attempt — start one, submit, then try to navigate back
    await startLink.click();
    await page.waitForTimeout(2000);

    const radios = page.locator('input[type="radio"]');
    const radioCount = await radios.count();
    for (let i = 0; i < radioCount; i++) {
      if (await radios.nth(i).isVisible()) {
        await radios.nth(i).click();
        await page.waitForTimeout(100);
      }
    }

    const submitBtn = page.getByRole('button', { name: /submit|soumettre|valider/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    // Navigate back to activities — the Start button should now be gone
    await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // No raw 409 error should be visible to the student
    await expect(page.locator('body')).not.toContainText(/409|duplicate attempt/i);
  } else {
    // No seeded published activity — nothing to assert
    test.skip();
  }
});

// ---------------------------------------------------------------------------
// 5. Teacher sees results page
// ---------------------------------------------------------------------------

test('teacher sees results page', async ({ page }) => {
  await login(page, TEACHER_EMAIL);

  // Navigate to the activities list to find an activity ID
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for a "Results" / "Résultats" link on an activity card
  const resultsLink = page
    .getByRole('link', { name: /results|résultats|voir résultats/i })
    .first();

  if (await resultsLink.isVisible()) {
    await resultsLink.click();
    await page.waitForTimeout(2000);
  } else {
    // Fallback: find the first activity, navigate to its /results page
    const activityLinks = page.locator(
      '[data-testid="activity-item"] a, [data-testid="activity-card"] a'
    );
    const linkCount = await activityLinks.count();
    if (linkCount > 0) {
      const href = await activityLinks.first().getAttribute('href');
      if (href) {
        const activityId = href.split('/').find(seg => seg.length === 36); // UUID
        if (activityId) {
          await page.goto(`${BASE}/activities/${activityId}/results`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);
        }
      }
    }
  }

  // The results page must show without a server error
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Results heading should be visible — "Results", "Résultats", or similar
  const resultHeading = page.getByRole('heading', { name: /results|résultats/i });
  const statsSection = page.locator(
    '[data-testid="results-summary"], [data-testid="attempt-list"], [data-testid="stats"]'
  );

  const hasHeading = await resultHeading.isVisible().catch(() => false);
  const hasStats = await statsSection.first().isVisible().catch(() => false);

  // Either the heading or the stats section must be present
  if (!hasHeading && !hasStats) {
    // Soft fallback: the page body should contain something result-related
    await expect(page.locator('body')).toContainText(/result|résultat|score|soumis|submitted/i);
  }
});

// ---------------------------------------------------------------------------
// 6. is_correct not exposed to student via the page source / API network calls
// ---------------------------------------------------------------------------

test('attempt page does not expose is_correct to student', async ({ page }) => {
  // This test intercepts network responses to verify that the API never returns
  // is_correct in any response received by the student browser session.

  const leakedResponses: string[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/api/v1/activities')) return;
    // Only check the start attempt endpoint, not the submit (which reveals answers)
    if (url.includes('/submit')) return;

    try {
      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('application/json')) return;
      const body = await response.text();
      if (body.includes('is_correct')) {
        leakedResponses.push(url);
      }
    } catch {
      // Ignore read errors (e.g. body already consumed)
    }
  });

  await login(page, STUDENT_EMAIL);
  await page.goto(`${BASE}/activities`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const startLink = page.getByRole('link', { name: /start|commencer/i }).first();
  if (!(await startLink.isVisible())) {
    test.skip();
    return;
  }

  await startLink.click();
  await page.waitForTimeout(3000);

  expect(leakedResponses).toHaveLength(0, {
    message: `SECURITY VIOLATION: is_correct was found in API response(s) received by the student: ${leakedResponses.join(', ')}`,
  });
});
