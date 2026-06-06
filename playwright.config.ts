import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { config } from 'dotenv';

// Load local secrets (E2E test-user creds) for the auth fixture.
config({ path: '.env.local' });

const authFile = path.join(__dirname, 'playwright', '.auth', 'user.json');

/**
 * Playwright E2E config.
 *
 * Projects:
 * - `setup` signs the dev user in once and saves storageState (auth.setup.ts).
 * - `chromium` runs the specs. Authenticated specs opt into the saved session
 *   via `test.use({ storageState })`; the login spec forces a logged-out state.
 *
 * Run with `npm run test:e2e` (after `npm run test:e2e:install` once).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

export { authFile };
