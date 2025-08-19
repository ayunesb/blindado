import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

const preview = process.env.PREVIEW_URL || 'http://localhost:4173';
const base = `${preview.replace(/\/$/, '')}/client.html?stub=1`;

test('onboarding happy path', async ({ page }) => {
  await page.goto(base);
  // go to Account
  await page.getByRole('navigation').getByText('Account').click();
  await expect(page.getByText('Blindado Client')).toBeVisible();

  await page.getByRole('button', { name: 'Start Onboarding' }).click();
  await page.getByText('Get Started').waitFor();

  await page.getByPlaceholder('Jane Doe').fill('Jane Foundersson');
  await page.getByPlaceholder('jane@company.com').fill('jf@blindado.app');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Back to Account
  await expect(page.getByText('Blindado Client')).toBeVisible();
});
