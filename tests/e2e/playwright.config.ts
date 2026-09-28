import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: fileURLToPath(new URL('../../test-results/', import.meta.url)),
  reporter: [['list'], ['json', { outputFile: fileURLToPath(new URL('../../test-results/e2e-results.json', import.meta.url)) }]],
  webServer: [
    { command: 'pnpm exec vite preview --host 127.0.0.1 --port 4319 --strictPort', cwd: fileURLToPath(new URL('../../', import.meta.url)), url: 'http://127.0.0.1:4319', reuseExistingServer: true },
    { command: 'pnpm exec vite --host 127.0.0.1 --port 4320 --strictPort', cwd: fileURLToPath(new URL('../../', import.meta.url)), url: 'http://127.0.0.1:4320', reuseExistingServer: true },
  ],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    headless: true,
    baseURL: 'http://127.0.0.1:4319',
    acceptDownloads: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
