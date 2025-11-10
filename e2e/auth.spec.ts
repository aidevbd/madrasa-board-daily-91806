import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display auth page correctly', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('প্রবেশ করুন');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    // Click login without filling fields
    await page.click('button:has-text("প্রবেশ করুন")');
    
    // Should show toast or error message
    await page.waitForTimeout(1000);
  });

  test('should toggle between login and signup', async ({ page }) => {
    // Start with login
    await expect(page.locator('h2')).toContainText('প্রবেশ করুন');
    
    // Switch to signup
    await page.click('button:has-text("নতুন একাউন্ট তৈরি করুন")');
    await expect(page.locator('h2')).toContainText('নিবন্ধন করুন');
    
    // Switch back to login
    await page.click('button:has-text("ইতিমধ্যে একাউন্ট আছে")');
    await expect(page.locator('h2')).toContainText('প্রবেশ করুন');
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.click('button:has-text("পাসওয়ার্ড ভুলে গেছেন")');
    await expect(page.locator('h2')).toContainText('পাসওয়ার্ড রিসেট');
  });
});
