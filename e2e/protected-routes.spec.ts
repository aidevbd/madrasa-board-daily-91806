import { test, expect } from '@playwright/test';

const protectedRoutes = [
  '/',
  '/add-expense',
  '/bulk-expense',
  '/add-fund',
  '/budget',
  '/reports',
  '/receipts',
  '/transactions',
  '/profile',
  '/settings',
];

test.describe('Protected routes (signed out)', () => {
  for (const route of protectedRoutes) {
    test(`redirects ${route} to /auth when signed out`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL('**/auth', { timeout: 15000 });
      await expect(page.locator('input#email')).toBeVisible();
    });
  }
});

test.describe('Not found route', () => {
  test('shows Bengali 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.locator('h1')).toContainText('৪০৪');
  });
});

test.describe('App health', () => {
  test('loads without console errors on /auth', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
