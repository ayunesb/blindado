import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('a11y smoke', () => {
  test('home has no serious violations', async ({ page }) => {
    await page.goto('/client.html?stub=1');
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious).toEqual([]);
  });

  test('booking sheet has no serious violations', async ({ page }) => {
    await page.goto('/client.html?stub=1#/book');
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious).toEqual([]);
  });
});
