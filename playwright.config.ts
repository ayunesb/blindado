import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  // Ignore any non-Playwright tests in the tests folder (like Deno tests)
  testIgnore: ['**/*edge_functions_test.ts', '**/*locations_test.ts', '**/unit/**'],
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.PREVIEW_URL || 'http://localhost:4173',
    ...devices['Desktop Chrome'],
  },
  webServer: {
  command: 'VITE_SUPABASE_URL=http://localhost VITE_SUPABASE_ANON_KEY=dummy VITE_STUB_API=1 vite build && vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
