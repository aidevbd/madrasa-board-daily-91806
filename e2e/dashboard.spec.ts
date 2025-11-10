import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, you'd need to handle authentication
    // This assumes user is already logged in or you have a test account
    await page.goto('/');
  });

  test('should display dashboard cards', async ({ page }) => {
    // Check for main dashboard elements
    await expect(page.locator('text=ড্যাশবোর্ড')).toBeVisible();
    
    // Check for balance card
    await expect(page.locator('text=বর্তমান ব্যালেন্স')).toBeVisible();
    
    // Check for monthly summary cards
    await expect(page.locator('text=এই মাসের জমা')).toBeVisible();
    await expect(page.locator('text=এই মাসের খরচ')).toBeVisible();
  });

  test('should navigate to add expense page', async ({ page }) => {
    await page.click('text=খরচ যুক্ত করুন');
    await expect(page).toHaveURL('/add-expense');
  });

  test('should navigate to add fund page', async ({ page }) => {
    await page.click('text=জমা যোগ করুন');
    await expect(page).toHaveURL('/add-fund');
  });

  test('should display navigation menu', async ({ page }) => {
    // Check bottom navigation
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a[href="/"]')).toBeVisible();
    await expect(page.locator('a[href="/reports"]')).toBeVisible();
    await expect(page.locator('a[href="/settings"]')).toBeVisible();
  });
});
