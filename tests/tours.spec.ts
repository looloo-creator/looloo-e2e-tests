import { test, expect } from '@playwright/test';
import { BASE_URL, getTestToken } from './helpers';

test.describe('Tours journey (add -> edit -> delete)', () => {
  let jwt: string | undefined;

  test.beforeAll(async ({ request }) => {
    jwt = await getTestToken(request, `test+e2e+${Date.now()}@example.com`);
  });

  test('add, edit and delete a tour via UI', async ({ page }) => {
    test.skip(!jwt, 'Test token endpoint is disabled or unavailable');
    if (!jwt) return;

    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token as string);
    }, jwt);

    await page.goto(`${BASE_URL}/tours/list`);
    await page.waitForSelector('text=Add New');

    const planName = `E2E Tour ${Date.now()}`;
    const updatedPlan = `E2E Updated ${Date.now()}`;

    // Add
    await page.click('button:has-text("Add New")');
    await page.waitForSelector('input[formControlName="plan"]');
    await page.fill('input[formControlName="plan"]', planName);
    await page.fill('input[formControlName="description"]', 'E2E description');
    const start = new Date();
    const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    await page.evaluate(({ s, e }) => {
      const startEl = document.querySelector('input[formControlName="planstartdate"]') as HTMLInputElement;
      const endEl = document.querySelector('input[formControlName="planenddate"]') as HTMLInputElement;
      if (startEl) {
        startEl.removeAttribute('readonly');
        startEl.value = s;
        startEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (endEl) {
        endEl.removeAttribute('readonly');
        endEl.value = e;
        endEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, { s: startStr, e: endStr });
    await page.click('button[type="submit"]');

    // verify add
    await page.goto(`${BASE_URL}/tours/list`);
    await page.waitForSelector(`text=${planName}`, { timeout: 5000 });
    const row = page.locator('tr', { hasText: planName });
    await expect(row).toHaveCount(1);

    // Edit
    await row.locator('mat-icon[title="Edit"]').click();
    const planInput = page.locator('input[formControlName="plan"]');
    await expect(planInput).toHaveValue(planName);
    await planInput.fill(updatedPlan);
    const updateResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/tours/create') && response.request().method() === 'POST',
    );
    await page.click('button[type="submit"]');
    expect((await updateResponsePromise).ok()).toBeTruthy();

    // verify edit
    await page.waitForURL('**/tours/list');
    await expect(page.locator('tr', { hasText: updatedPlan })).toBeVisible();

    // Delete
    const updatedRow = page.locator('tr', { hasText: updatedPlan });
    await updatedRow.locator('mat-icon[title="Delete"]').click();
    await page.waitForSelector('button:has-text("Yes")');
    await page.click('button:has-text("Yes")');
    await page.waitForTimeout(500);
    await expect(page.locator('tr', { hasText: updatedPlan })).toHaveCount(0);
  });
});
