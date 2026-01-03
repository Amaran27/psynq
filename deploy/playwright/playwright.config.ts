import { defineConfig } from '@playwright/test';

export default defineConfig({
  // This config is executed with CWD=deploy/playwright in the container runner.
  // Keep the testDir relative to that.
  testDir: '.',
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  retries: 0,
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
