import { describe, it, expect, afterEach } from 'vitest';
import { getSecretsStatus } from '@/lib/admin/data';

/** getSecretsStatus reports presence (never values) of sensitive env config. */
describe('admin/getSecretsStatus', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('marks a secret configured only when the env var is non-empty', () => {
    process.env.AI_API_KEY = 'sk-test';
    process.env.CRON_SECRET = '';
    delete process.env.MS_GRAPH_WEBHOOK_URL;

    const map = new Map(getSecretsStatus().map((s) => [s.key, s.configured]));
    expect(map.get('AI_API_KEY')).toBe(true);
    expect(map.get('CRON_SECRET')).toBe(false); // empty string = not configured
    expect(map.get('MS_GRAPH_WEBHOOK_URL')).toBe(false); // unset = not configured
  });

  it('never exposes secret values, only presence booleans', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-value';
    const entry = getSecretsStatus().find((s) => s.key === 'SUPABASE_SERVICE_ROLE_KEY');
    expect(entry?.configured).toBe(true);
    expect(JSON.stringify(entry)).not.toContain('super-secret-value');
  });
});
