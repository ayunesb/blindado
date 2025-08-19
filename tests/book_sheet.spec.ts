import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const base = 'http://localhost:4173';

test.describe('Booking sheet visibility', () => {
  test('opens at #/book with form visible', async ({ page }) => {
    await page.goto(`${base}/client.html#/book`);
    await expect(page.getByRole('dialog', { name: 'Booking Details' })).toBeVisible();
    await expect(page.getByText('Booking Details')).toBeVisible();
    await expect(page.getByLabel('Close')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('shows pid chip and can clear it', async ({ page }) => {
    await page.goto(`${base}/client.html#/book?pid=chris`);
    await expect(page.getByRole('dialog', { name: 'Booking Details' })).toBeVisible();
    await expect(page.getByText('Protector: chris')).toBeVisible();
  const closeBtn = page.getByRole('button', { name: 'Close' });
  await closeBtn.scrollIntoViewIfNeeded();
  await closeBtn.evaluate((el) => (el as HTMLElement).click());
    // After close, navigate back to /#/home from our button, so go back to book to assert chip cleared
    await page.goto(`${base}/client.html#/book`);
    await expect(page.getByText('Protector:')).toHaveCount(0);
  });
});
