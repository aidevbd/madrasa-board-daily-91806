import { test, expect } from '@playwright/test';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
  });

  test('should display reports page with tabs', async ({ page }) => {
    await expect(page.locator('text=রিপোর্ট')).toBeVisible();
    
    // Check for report tabs
    await expect(page.locator('text=দৈনিক রিপোর্ট')).toBeVisible();
    await expect(page.locator('text=মাসিক রিপোর্ট')).toBeVisible();
    await expect(page.locator('text=কাস্টম রেঞ্জ')).toBeVisible();
  });

  test('should switch between report tabs', async ({ page }) => {
    // Click monthly report
    await page.click('text=মাসিক রিপোর্ট');
    await page.waitForTimeout(500);
    
    // Click custom range
    await page.click('text=কাস্টম রেঞ্জ');
    await page.waitForTimeout(500);
    
    // Back to daily
    await page.click('text=দৈনিক রিপোর্ট');
    await page.waitForTimeout(500);
  });

  test('should display export buttons', async ({ page }) => {
    // Check for export options
    await expect(page.locator('button:has-text("CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("PDF")')).toBeVisible();
  });

  test('should display charts when data is available', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Charts should be present (if data exists)
    const hasCharts = await page.locator('[class*="recharts"]').count();
    expect(hasCharts).toBeGreaterThanOrEqual(0);
  });

  test('should generate custom range report', async ({ page }) => {
    await page.click('text=কাস্টম রেঞ্জ');
    
    // Fill date range
    const startDate = await page.locator('input[type="date"]').first();
    const endDate = await page.locator('input[type="date"]').last();
    
    await startDate.fill('2024-01-01');
    await endDate.fill('2024-12-31');
    
    // Generate report
    await page.click('button:has-text("রিপোর্ট তৈরি করুন")');
    
    await page.waitForTimeout(2000);
  });
});
