import { Page } from '@playwright/test';

export async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(50); // tailwind/portal paint + portal mount
}
