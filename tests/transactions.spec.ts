import { test, expect } from '@playwright/test';
import { BASE_URL, getTestToken } from './helpers';

test.describe('Transactions journey (tour -> member -> transaction add/view)', () => {
  let jwt: string | undefined;

  test.beforeAll(async ({ request }) => {
    jwt = await getTestToken(request, `test+e2e+${Date.now()}@example.com`);
  });

  test('tour UI -> member UI -> transaction add/view via UI', async ({ page }) => {
    test.skip(!jwt, 'Test token endpoint is disabled or unavailable');
    if (!jwt) return;

    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token as string);
    }, jwt);

    const tourPlan = `E2E Tour ${Date.now()}`;
    const memberName = `E2E Member ${Date.now()}`;
    const transactionReason = 'E2E transaction';

    // Step 1: Create tour via UI
    await page.goto(`${BASE_URL}/tours/list`);
    await page.waitForSelector('text=Add New');
    await page.click('button:has-text("Add New")');
    await page.waitForSelector('input[formControlName="plan"]');

    await page.fill('input[formControlName="plan"]', tourPlan);
    await page.fill('input[formControlName="description"]', 'E2E tour for transactions');

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
    // App redirects to addmember page

    // Step 2: Add member
    await page.waitForSelector('input[formControlName="name"]');
    await page.fill('input[formControlName="name"]', memberName);
    await page.click('button[type="submit"]');
    await page.waitForSelector(`text=${memberName}`, { timeout: 5000 });

    // Step 3: Add transaction (account) via UI
    // Navigate to accounts/transactions page from tours list
    await page.goto(`${BASE_URL}/tours/list`);
    const tourRow = page.locator('tr', { hasText: tourPlan });
    // Click "Add Transaction" link in the tour row
    await tourRow.locator('text=Add Transaction').click();

    // Wait for accounts form to load
    await expect(page.locator('mat-radio-group[formControlName="type"]')).toBeVisible();
    await page.locator('input[formControlName="date"]').evaluate((element) => {
      const input = element as HTMLInputElement;
      input.removeAttribute('readonly');
      input.value = new Date().toLocaleDateString('en-US');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('mat-select[formControlName="collected_from"]').click();
    await page.locator('mat-option').first().click();
    await page.getByRole('checkbox', { name: 'All Members' }).check();
    await page.locator('input[formControlName="amount"]').fill('100');
    await page.locator('input[formControlName="reason"]').fill(transactionReason);

    await page.click('button[type="submit"]');
    const previewDialog = page.getByRole('dialog');
    await expect(previewDialog).toBeVisible();
    const transactionResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/accounts/create') && response.request().method() === 'POST',
    );
    await previewDialog.getByRole('button', { name: 'Save' }).click();
    expect((await transactionResponsePromise).ok()).toBeTruthy();

    // Step 4: View transaction in report
    await page.goto(`${BASE_URL}/tours/list`);
    const viewTransactionRow = page.locator('tr', { hasText: tourPlan });
    await viewTransactionRow.locator('text=Show Transactions').click();

    // Verify transaction appears in report
    await page.waitForSelector(`text=${transactionReason}`, { timeout: 5000 });
    expect(await page.locator('text=' + transactionReason).count()).toBeGreaterThan(0);
    expect(await page.locator('text=100').count()).toBeGreaterThan(0);
  });
});
