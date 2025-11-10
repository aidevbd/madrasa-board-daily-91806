import { test, expect } from '@playwright/test';

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/add-expense');
  });

  test('should display expense form', async ({ page }) => {
    await expect(page.locator('text=খরচ যুক্ত করুন')).toBeVisible();
    
    // Check form fields
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="আইটেমের নাম"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="মোট মূল্য"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('button:has-text("সংরক্ষণ করুন")');
    
    // Should show validation toast
    await page.waitForTimeout(1000);
  });

  test('should fill expense form with valid data', async ({ page }) => {
    // Fill in the form
    await page.fill('input[placeholder*="আইটেমের নাম"]', 'পরীক্ষা খরচ');
    await page.fill('input[type="number"]', '100');
    await page.fill('input[placeholder*="মোট মূল্য"]', '500');
    
    // Submit form
    await page.click('button:has-text("সংরক্ষণ করুন")');
    
    // Should redirect or show success message
    await page.waitForTimeout(1000);
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.click('button:has([class*="lucide-arrow-left"])');
    await expect(page).toHaveURL('/');
  });
});
