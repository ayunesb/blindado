import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const preview = process.env.PREVIEW_URL || 'http://localhost:4173';
const base = `${preview.replace(/\/$/, '')}/client.html?stub=1`;

test('profile to book with preselected protector chip', async ({ page }) => {
  await page.goto(base);
  // Scroll carousel and click first profile card
  const card = page.getByRole('button', { name: /Open profile for/i }).first();
  await card.click();
  // On profile page, start booking
  await page.getByRole('button', { name: 'Book this Protector' }).click();
  // Expect the booking sheet and pid chip visible
  await page.getByPlaceholder('e.g., The Mark Hotel, 25 E 77th St').waitFor();
  await expect(page.getByText(/Protector:/)).toBeVisible();
});
