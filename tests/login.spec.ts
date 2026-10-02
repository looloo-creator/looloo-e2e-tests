import { test, expect } from '@playwright/test';
import { BASE_URL, getTestToken } from './helpers';
const LOGIN_PATH = '/authentication/login';
const GOOGLE_BUTTON_TEXT = 'Continue with Google';

test.describe('Login page', () => {
  test('UI: Google button is visible and clickable', async ({ page }) => {
    await page.goto(LOGIN_PATH);

    const googleLoginButton = page.getByRole('button', { name: GOOGLE_BUTTON_TEXT });
    await expect(googleLoginButton).toBeVisible();
    await expect(googleLoginButton).toBeEnabled();

    // clicking the button should be possible (we don't assert external provider behaviour here)
    await googleLoginButton.click();
  });

  test('Token login: set test token and land on dashboard', async ({ request, page }) => {
    const jwt = await getTestToken(request, `test+e2e+${Date.now()}@example.com`);
    test.skip(!jwt, 'Test token endpoint is disabled or unavailable');
    if (!jwt) return;

    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token as string);
    }, jwt);

    await page.goto(`${BASE_URL}/`);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });
});
