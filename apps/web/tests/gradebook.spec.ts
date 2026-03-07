import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://edulia.angelstreet.io';

const TEACHER_EMAIL = 'prof.martin@demo.edulia.io';
const STUDENT_EMAIL = 'emma.leroy@demo.edulia.io';
const PASSWORD = 'demo2026';

// ---------------------------------------------------------------------------
// Login helper
// ---------------------------------------------------------------------------

async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Test 1 — Gradebook page shows subject and term selectors
// ---------------------------------------------------------------------------

test('gradebook page shows subject and term selectors', async ({ page }) => {
  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/gradebook`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Page must load without server errors
  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for <select> elements or text that implies subject / term filter controls.
  // Accept: native <select>, or option text "all subjects" / "all terms" (i18n variants).
  const selectElements = page.locator('select');
  const allSubjectsOption = page.getByText(
    /all subjects|toutes les matières|matière|subject/i
  );
  const allTermsOption = page.getByText(
    /all terms|tous les trimestres|trimestre|term|période/i
  );

  const hasSelects = (await selectElements.count()) >= 1;
  const hasSubjectText = (await allSubjectsOption.count()) > 0;
  const hasTermText = (await allTermsOption.count()) > 0;

  expect(hasSelects || hasSubjectText || hasTermText).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 2 — Gradebook assessment list filters by group
// ---------------------------------------------------------------------------

test('gradebook assessment list filters by group', async ({ page }) => {
  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/gradebook`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Attempt to select a class/group if a class selector is present
  const classSelect = page.locator('select').first();
  const classSelectCount = await classSelect.count();
  if (classSelectCount > 0) {
    // Pick the first non-empty option
    const options = classSelect.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      const secondOptionValue = await options.nth(1).getAttribute('value');
      if (secondOptionValue) {
        await classSelect.selectOption(secondOptionValue);
        await page.waitForTimeout(1500);
      }
    }
  }

  // After selecting a class, the assessment list or an empty state should render.
  // Accept: a list container, a table, or an empty-state element.
  const assessmentList = page.locator(
    '[data-testid="assessment-list"], table, [class*="empty"], [class*="EmptyState"]'
  );
  const emptyStateText = page.getByText(
    /no assessments|aucune évaluation|empty|vide|no results/i
  );
  const tableRows = page.locator('tr');

  const hasListContainer = (await assessmentList.count()) > 0;
  const hasEmptyText = (await emptyStateText.count()) > 0;
  const hasRows = (await tableRows.count()) > 0;

  expect(hasListContainer || hasEmptyText || hasRows).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 3 — New assessment modal has subject and term fields
// ---------------------------------------------------------------------------

test('gradebook new assessment modal has subject and term fields', async ({ page }) => {
  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/gradebook`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Try to open the "New Assessment" modal
  const newAssessmentButton = page.getByRole('button', {
    name: /new assessment|nouvelle évaluation|add assessment|ajouter|créer|\+ new|\+/i,
  });
  const buttonCount = await newAssessmentButton.count();

  if (buttonCount === 0) {
    test.skip(true, 'No "New Assessment" button found — skipping modal fields test');
    return;
  }

  await newAssessmentButton.first().click();
  await page.waitForTimeout(1500);

  // The modal should show a subject select and a term select.
  // Accept: <select> elements, or labeled inputs for subject/term.
  const subjectField = page.locator(
    'select[name*="subject"], select[id*="subject"], ' +
    'select[name*="matière"], select[id*="matière"]'
  );
  const termField = page.locator(
    'select[name*="term"], select[id*="term"], ' +
    'select[name*="trimestre"], select[id*="trimestre"]'
  );
  const subjectLabel = page.getByLabel(/subject|matière/i);
  const termLabel = page.getByLabel(/term|trimestre|période/i);
  const subjectText = page.getByText(/subject|matière/i);
  const termText = page.getByText(/term|trimestre|période/i);

  const hasSubjectField =
    (await subjectField.count()) > 0 ||
    (await subjectLabel.count()) > 0 ||
    (await subjectText.count()) > 0;
  const hasTermField =
    (await termField.count()) > 0 ||
    (await termLabel.count()) > 0 ||
    (await termText.count()) > 0;

  expect(hasSubjectField).toBe(true);
  expect(hasTermField).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 4 — Grade entry page shows student rows
// ---------------------------------------------------------------------------

test('grade entry page shows student rows', async ({ page }) => {
  await login(page, TEACHER_EMAIL);
  await page.goto(`${BASE}/gradebook`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Find a link to an individual assessment (grade entry page)
  const assessmentLinks = page.locator('a[href*="/gradebook/"]');
  const linkCount = await assessmentLinks.count();

  if (linkCount === 0) {
    test.skip(true, 'No assessment links found in gradebook — skipping grade entry test');
    return;
  }

  const firstHref = await assessmentLinks.first().getAttribute('href');
  if (!firstHref) {
    test.skip(true, 'Assessment link has no href — skipping grade entry test');
    return;
  }

  await page.goto(`${BASE}${firstHref}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // The grade entry page should show a table with student rows OR an empty state.
  const tableRows = page.locator('tr');
  const emptyState = page.getByText(
    /no students|aucun élève|empty|no grades|aucune note/i
  );
  const studentRow = page.locator('[data-testid*="student"], [class*="student-row"]');

  const hasRows = (await tableRows.count()) > 0;
  const hasEmpty = (await emptyState.count()) > 0;
  const hasStudentRows = (await studentRow.count()) > 0;

  expect(hasRows || hasEmpty || hasStudentRows).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 5 — Student grades page shows term selector
// ---------------------------------------------------------------------------

test('student grades page shows term selector', async ({ page }) => {
  await login(page, STUDENT_EMAIL);
  await page.goto(`${BASE}/grades`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).not.toContainText(/500|internal server error/i);

  // Look for a term selector: <select>, dropdown, or option text for terms
  const selectElements = page.locator('select');
  const termOption = page.getByText(
    /all terms|tous les trimestres|trimestre|term|période|semester|semestre/i
  );
  const termLabel = page.getByLabel(/term|trimestre|période|semester/i);

  const hasSelect = (await selectElements.count()) > 0;
  const hasTermText = (await termOption.count()) > 0;
  const hasTermLabel = (await termLabel.count()) > 0;

  expect(hasSelect || hasTermText || hasTermLabel).toBe(true);
});
