/**
 * Configuration for Playwright using default from @jupyterlab/galata
 */
import { defineConfig } from '@playwright/test';

const baseConfig = require('@jupyterlab/galata/lib/playwright-config');

export default defineConfig({
  ...baseConfig,
  expect: { timeout: 15000 },
  webServer: {
    command: 'jlpm start',
    url: 'http://localhost:8888/lab',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
