import { test, expect } from '@playwright/test';

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page with tabs', async ({ page }) => {
    await expect(page.locator('text=সেটিংস')).toBeVisible();
    
    // Check for settings tabs
    await expect(page.locator('text=ক্যাটাগরি')).toBeVisible();
    await expect(page.locator('text=একক')).toBeVisible();
    await expect(page.locator('text=ফেভারিট')).toBeVisible();
  });

  test('should switch between settings tabs', async ({ page }) => {
    // Click units tab
    await page.click('button:has-text("একক")');
    await page.waitForTimeout(500);
    
    // Click favorites tab
    await page.click('button:has-text("ফেভারিট")');
    await page.waitForTimeout(500);
    
    // Back to categories
    await page.click('button:has-text("ক্যাটাগরি")');
    await page.waitForTimeout(500);
  });

  test('should open add category dialog', async ({ page }) => {
    await page.click('button:has-text("নতুন ক্যাটাগরি যোগ করুন")');
    
    // Dialog should be visible
    await expect(page.locator('text=নতুন ক্যাটাগরি')).toBeVisible();
  });

  test('should display logout button', async ({ page }) => {
    await expect(page.locator('button:has-text("লগ আউট")')).toBeVisible();
  });
});
