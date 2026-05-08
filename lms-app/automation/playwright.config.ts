import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const isDocker = process.env.DOCKER === 'true';
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const config: PlaywrightTestConfig = {
  testDir: './src',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 3000,
  },
  reporter: [
    ['html', { outputFile: 'report.html' }],
    ['list'],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'always',
    fullPageScreenshot: true,
    contextOptions: {
      viewport: { width: 1280, height: 720 },
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Reuse single browser for all tests */
  reuseExistingServer: true,
  webServer: isDocker || process.env.CI ? undefined : getWebServerConfig(),
};

function getBaseUrl(): string {
  const env = process.env.APP_ENV || 'development';
  const urls: Record<string, string> = {
    development: 'http://localhost:3000',
    staging: 'http://localhost:3000',
    production: 'https://lms.example.com',
  };
  return process.env.TEST_BASE_URL || urls[env] || urls.development;
}

function getWebServerConfig() {
  const url = process.env.TEST_BASE_URL || 'http://localhost:3000';
  
  return {
    command: 'npm run dev',
    url,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  };
}

export default config;