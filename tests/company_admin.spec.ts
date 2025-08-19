import { test, expect } from '@playwright/test';
import { settle } from './helpers/ui';

// Basic CRUD smoke for company vehicles screen in stub mode
// Navigates directly via hash route to bypass role requirements (allowed pre-auth)

test('company vehicles CRUD flow (stub)', async ({ page }) => {
  await page.goto('/client.html?stub=1#/company-vehicles');
  await settle(page);

  await page.getByTestId('cv-make').fill('Cadillac');
  await page.getByTestId('cv-model').fill('Escalade');
  await page.getByTestId('cv-plate').fill('NY ABC-1234');

  // We won't pick files in CI here (browser file dialog). The screen can save without uploads.
  await page.getByTestId('cv-save').click();

  // Expect a toast confirmation and automatic navigation back to Account
  await expect(page.getByText('Vehicle saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account', level: 2 }).or(page.getByText('Blindado Client'))).toBeVisible();
});
