import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display auth page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('দৈনিক বোর্ডিং ম্যানেজার');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'লগ ইন', exact: true })).toBeVisible();
  });

  test('should toggle between login and signup', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'লগ ইন', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'নতুন অ্যাকাউন্ট তৈরি করুন' }).click();
    await expect(page.getByRole('button', { name: 'সাইন আপ', exact: true })).toBeVisible();

    await page.getByRole('button', { name: /আগে থেকে অ্যাকাউন্ট আছে/ }).click();
    await expect(page.getByRole('button', { name: 'লগ ইন', exact: true })).toBeVisible();
  });

  test('should navigate to forgot password and back', async ({ page }) => {
    await page.getByRole('button', { name: 'পাসওয়ার্ড ভুলে গেছেন?' }).click();
    await expect(page.getByRole('button', { name: 'পাসওয়ার্ড রিসেট লিংক পাঠান' })).toBeVisible();
    await expect(page.locator('input#reset-email')).toBeVisible();

    await page.getByRole('button', { name: 'ফিরে যান' }).click();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('should show validation error for empty credentials', async ({ page }) => {
    await page.getByRole('button', { name: 'লগ ইন', exact: true }).click();
    await expect(page.locator('[data-radix-toast-viewport], [role="status"]').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
