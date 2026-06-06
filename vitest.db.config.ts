import { defineConfig } from 'vitest/config';

/**
 * Config for live-database integration tests (RLS/security).
 * Separate from the default unit config so `npm test` never needs DB creds.
 * Run with: npm run test:db
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['supabase/tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
