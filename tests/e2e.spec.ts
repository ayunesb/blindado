import { test, expect } from '@playwright/test';

// Use a taller mobile-like viewport so sticky bottom buttons are visible
test.use({ viewport: { width: 390, height: 900 } });

const preview = process.env.PREVIEW_URL || 'http://localhost:4173';
const base = `${preview.replace(/\/$/, '')}/client.html?stub=1`;

test('book flow to quote + confirm toast', async ({ page }) => {
  await page.goto(base);
  await expect(page.getByText('Book Armed Protectors in New York City')).toBeVisible();

  await page.getByRole('button', { name: 'Book a Protector' }).click();
  await page.getByPlaceholder('e.g., The Mark Hotel, 25 E 77th St').waitFor();

  await page.getByPlaceholder('e.g., The Mark Hotel, 25 E 77th St').fill('10 Hudson Yards, NYC');
  // Fill date/time via input; pick a far-future date to avoid validation
  await page.fill('input[type="date"]', '2030-12-31');
  await page.fill('input[type="time"]', '12:30');
  // Duration defaults to 2h; no need to click a preset to keep test robust

  // Next to quote (ensure enabled/visible then click)
  const nextBtn = page.getByRole('button', { name: 'Next' });
  await expect(nextBtn).toBeEnabled();
  await nextBtn.scrollIntoViewIfNeeded();
  await nextBtn.evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByRole('heading', { name: 'Instant Quote' })).toBeVisible();
  await expect(page.getByText('Total', { exact: true })).toBeVisible();

  // Confirm (modal primary)
  const confirmBtn = page.getByRole('button', { name: 'Confirm' });
  await confirmBtn.scrollIntoViewIfNeeded();
  await confirmBtn.evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByText("Request submitted. We’ll contact you shortly.")).toBeVisible();
});
