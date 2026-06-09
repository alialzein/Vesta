import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Verifies the settings-resolution logic: per-user overrides beat global, global
 * beats built-in defaults, and null means "fall back". The Supabase service client
 * is mocked so these are pure logic tests (no DB).
 */

const store: Record<string, unknown> = {};

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        maybeSingle: () => Promise.resolve({ data: store[table] ?? null }),
      };
      return builder;
    },
  }),
}));

import { resolveRetention, resolveAiOverrides, getAppSettings } from '@/lib/admin/settings';

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe('admin/settings resolution', () => {
  it('falls back to built-in defaults when no global row exists', async () => {
    const app = await getAppSettings();
    expect(app.initial_scan_back_days).toBe(7);
    expect(app.soft_delete_grace_days).toBe(30);
    expect(app.retention_months).toBeNull();
  });

  it('per-user retention overrides the global window', async () => {
    store.app_settings = { id: true, initial_scan_back_days: 14, retention_months: 12, soft_delete_grace_days: 30 };
    store.user_settings = { user_id: 'u1', retention_months: 6, initial_scan_back_days: null };
    const r = await resolveRetention('u1');
    expect(r.retentionMonths).toBe(6); // user wins
    expect(r.scanBackDays).toBe(14); // user null -> global
    expect(r.softDeleteGraceDays).toBe(30);
  });

  it('uses the global retention when the user has no override', async () => {
    store.app_settings = { id: true, initial_scan_back_days: 7, retention_months: 24, soft_delete_grace_days: 30 };
    const r = await resolveRetention('u2');
    expect(r.retentionMonths).toBe(24);
  });

  it('resolves AI overrides with analysis model taking precedence', async () => {
    store.app_settings = {
      id: true,
      ai_model: 'base-model',
      ai_model_analysis: 'analysis-model',
      ai_max_per_run: 5,
      ai_max_per_day: 50,
      ai_price_input: 1,
      ai_price_output: 2,
    };
    store.user_settings = { user_id: 'u3', ai_paused: true };
    const o = await resolveAiOverrides('u3');
    expect(o.model).toBe('analysis-model');
    expect(o.maxPerRun).toBe(5);
    expect(o.paused).toBe(true);
  });
});
