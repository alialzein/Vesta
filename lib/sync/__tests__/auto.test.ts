import { describe, expect, it } from 'vitest';
import { shouldAutoSync, AUTO_SYNC_INTERVAL_MS } from '@/lib/sync/auto';

describe('shouldAutoSync', () => {
  const now = Date.parse('2026-06-08T12:00:00Z');

  it('syncs when there is no prior sync', () => {
    expect(shouldAutoSync(null, AUTO_SYNC_INTERVAL_MS, now)).toBe(true);
  });

  it('syncs when the last sync is older than the interval', () => {
    const old = new Date(now - AUTO_SYNC_INTERVAL_MS - 1000).toISOString();
    expect(shouldAutoSync(old, AUTO_SYNC_INTERVAL_MS, now)).toBe(true);
  });

  it('does not sync when the last sync is recent', () => {
    const recent = new Date(now - 60_000).toISOString();
    expect(shouldAutoSync(recent, AUTO_SYNC_INTERVAL_MS, now)).toBe(false);
  });

  it('syncs when the timestamp is unparseable', () => {
    expect(shouldAutoSync('not-a-date', AUTO_SYNC_INTERVAL_MS, now)).toBe(true);
  });
});
