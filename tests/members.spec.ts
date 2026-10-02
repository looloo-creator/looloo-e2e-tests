import { test, expect } from '@playwright/test';
import { BASE_URL, getTestToken } from './helpers';

test.describe('Members journey (tour -> member add/edit/delete)', () => {
  let jwt: string | undefined;

  test.beforeAll(async ({ request }) => {
    jwt = await getTestToken(request, `test+e2e+${Date.now()}@example.com`);
  });

  test('tour UI -> member add/edit/delete via UI', async ({ page }) => {
    test.skip(!jwt, 'Test token endpoint is disabled or unavailable');
    if (!jwt) return;

    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token as string);
    }, jwt);

    const tourPlan = `E2E Tour ${Date.now()}`;
    const memberName = `E2E Member ${Date.now()}`;
    const updatedMember = `E2E U ${Date.now()}`;

    // Step 1: Create tour via UI
    await page.goto(`${BASE_URL}/tours/list`);
    await page.waitForSelector('text=Add New');
    await page.click('button:has-text("Add New")');
    await page.waitForSelector('input[formControlName="plan"]');

    await page.fill('input[formControlName="plan"]', tourPlan);
    await page.fill('input[formControlName="description"]', 'E2E tour for members');

    const start = new Date();
    const end = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
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
    // After save, app redirects to addmember page (we continue here)

    // Step 2: Add member
    await page.waitForSelector('input[formControlName="name"]');
    await page.fill('input[formControlName="name"]', memberName);
    await page.click('button[type="submit"]');

    // Verify member added
    await page.waitForSelector(`text=${memberName}`, { timeout: 5000 });
    const row = page.locator('tr', { hasText: memberName });
    await expect(row).toHaveCount(1);

    // Step 3: Edit member
    await row.locator('mat-icon[title="Edit"]').click();
    const memberNameInput = page.locator('input[formControlName="name"]');
    await expect(memberNameInput).toHaveValue(memberName);
    await memberNameInput.fill(updatedMember);
    const updateResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/members/create') && response.request().method() === 'POST',
    );
    await page.click('button[type="submit"]');

    // Verify edit
    expect((await updateResponsePromise).ok()).toBeTruthy();
    await expect(page.locator('tr', { hasText: updatedMember })).toBeVisible();

    // Step 4: Delete member
    const updatedRow = page.locator('tr', { hasText: updatedMember });
    await updatedRow.locator('mat-icon[title="Delete"]').click();
    await page.waitForSelector('button:has-text("Yes")');
    await page.click('button:has-text("Yes")');
    await page.waitForTimeout(500);
    await expect(page.locator('tr', { hasText: updatedMember })).toHaveCount(0);
  });
});
