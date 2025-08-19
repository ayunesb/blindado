import { test, expect } from '@playwright/test';
import { settle } from './helpers/ui';

// Use a taller mobile-like viewport so sticky bottom buttons are visible
test.use({ viewport: { width: 390, height: 900 } });

const preview = process.env.PREVIEW_URL || 'http://localhost:4173';
const base = `${preview.replace(/\/$/, '')}/client.html?stub=1`;

test('book flow to quote + confirm toast', async ({ page }) => {
  await page.goto(base);
  await settle(page);
  await expect(page.getByText('Book Armed Protectors in New York City')).toBeVisible();

  await page.getByRole('button', { name: 'Book a Protector' }).click();
  await page.getByTestId('pickup-location').waitFor();
  await page.getByTestId('pickup-location').fill('10 Hudson Yards, NYC');
  // Fill date/time via input; pick a far-future date to avoid validation
  await page.getByTestId('pickup-date').fill('2030-12-31');
  await page.getByTestId('pickup-time').fill('12:30');
  // Duration defaults to 2h; no need to click a preset to keep test robust

  // Next to quote (ensure enabled/visible then click without detaching)
  const nextBtn = page.getByTestId('next');
  await expect(nextBtn).toBeVisible();
  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();
  await expect(page.getByRole('heading', { name: 'Instant Quote' })).toBeVisible();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();

  // Confirm (modal primary)
  const confirmBtn = page.getByTestId('confirm');
  await expect(confirmBtn).toBeVisible();
  await expect(confirmBtn).toBeEnabled();
  // Ensure no virtual keyboard offset; then invoke DOM click to avoid viewport constraints in fixed modal
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await confirmBtn.evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByText("Request submitted. We’ll contact you shortly.")).toBeVisible();
  await expect(page).toHaveURL(/#\/bookings/);
});
