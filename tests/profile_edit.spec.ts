import { test, expect } from '@playwright/test';
import { settle } from './helpers/ui';

// Uses stub mode; relies on data-testids wired in ProfileEditScreen + FileCard
// Note: setInputFiles requires a real file path in repo; ensure fixtures exist.

test('profile-edit uploads show preview/link', async ({ page }) => {
  await page.goto('/client.html?stub=1#/profile-edit');
  await settle(page);

  await page.setInputFiles('input[type=file]', []); // ensure no native dialog leftovers

  await page.getByTestId('pe-id-pick').click();
  await page.setInputFiles('input[type=file]', 'tests/fixtures/id.png');

  await page.getByTestId('pe-por-pick').click();
  await page.setInputFiles('input[type=file]', 'tests/fixtures/por.pdf');

  await page.getByTestId('pe-save').click();

  await expect(page.getByTestId('pe-id-preview')).toHaveAttribute('src', /token=|blob:/);
  await expect(page.getByTestId('pe-por-link')).toHaveAttribute('href', /token=|blob:/);
});
