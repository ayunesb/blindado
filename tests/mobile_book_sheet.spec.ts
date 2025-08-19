import { test, expect } from '@playwright/test';

// Ensures the BottomSheet renders and is visible at mobile viewport sizes
// Uses stub mode so no backend is required

test('book sheet visible on iPhone-sized viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12/13/14
  await page.goto('/client.html?stub=1#/book');
  await expect(page.getByTestId('bottom-sheet')).toBeVisible();
  await expect(page.getByTestId('pickup-date')).toBeVisible();
  await expect(page.getByTestId('pickup-time')).toBeVisible();
});
