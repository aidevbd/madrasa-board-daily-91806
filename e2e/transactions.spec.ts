import { test, expect } from '@playwright/test';

test.describe('Transactions Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page and login
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("লগ ইন")');
    await page.waitForURL('/');
  });

  test('should navigate to transactions page', async ({ page }) => {
    await page.click('a[href="/transactions"]');
    await page.waitForURL('/transactions');
    expect(await page.textContent('h1')).toBe('লেনদেনের তালিকা');
  });

  test('should display expenses and funds tabs', async ({ page }) => {
    await page.goto('/transactions');
    
    // Check tabs exist
    await expect(page.locator('button:has-text("খরচ")')).toBeVisible();
    await expect(page.locator('button:has-text("জমা")')).toBeVisible();
  });

  test('should search transactions', async ({ page }) => {
    await page.goto('/transactions');
    
    // Enter search query
    await page.fill('input[placeholder="খুঁজুন..."]', 'আলু');
    
    // Search should filter results
    await page.waitForTimeout(500);
  });

  test('should delete expense with confirmation', async ({ page }) => {
    await page.goto('/transactions');
    
    // Click delete button if expenses exist
    const deleteButton = page.locator('button:has-text("মুছুন")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion in alert dialog
      await expect(page.locator('text=নিশ্চিত করুন')).toBeVisible();
      await page.click('button:has-text("মুছে ফেলুন")');
      
      // Check for success message
      await expect(page.locator('text=সফল')).toBeVisible();
    }
  });

  test('should switch between expense and fund tabs', async ({ page }) => {
    await page.goto('/transactions');
    
    // Click on funds tab
    await page.click('button:has-text("জমা")');
    await page.waitForTimeout(300);
    
    // Click back to expenses tab
    await page.click('button:has-text("খরচ")');
    await page.waitForTimeout(300);
  });

  test('should show empty state when no transactions', async ({ page }) => {
    // This test assumes a fresh account or after deleting all transactions
    await page.goto('/transactions');
    
    // Check for empty state message or transactions
    const noDataMessage = page.locator('text=কোন খরচ পাওয়া যায়নি');
    const hasTransactions = await page.locator('[class*="card"]').count() > 1;
    
    if (!hasTransactions) {
      await expect(noDataMessage).toBeVisible();
    }
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/transactions');
    
    // Click back button
    await page.click('button[class*="ghost"]');
    await page.waitForURL('/');
  });
});
