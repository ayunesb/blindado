import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 900 } });

const preview = process.env.PREVIEW_URL || 'http://localhost:4173';
const base = `${preview.replace(/\/$/, '')}/client.html?stub=1`;

test('stub upload on profile-edit shows preview/link', async ({ page }) => {
  await page.goto(base);
  // Go to Account
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Profile & Documents' }).click();

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /upload|replace/i }).first().click(),
  ]);
  await chooser.setFiles('public/avatar-placeholder.svg');

  await expect(page.getByRole('link', { name: /Open|View PDF/i })).toBeVisible();
});
