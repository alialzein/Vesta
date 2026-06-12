import { describe, expect, it } from 'vitest';
import { adminSessionExpired } from '@/lib/admin/session';

describe('adminSessionExpired', () => {
  const now = new Date('2026-06-12T20:00:00Z');

  it('expires sessions older than 12 hours', () => {
    expect(adminSessionExpired('2026-06-12T07:59:00Z', now)).toBe(true);
    expect(adminSessionExpired('2026-06-11T20:00:00Z', now)).toBe(true);
  });

  it('keeps fresh sessions alive', () => {
    expect(adminSessionExpired('2026-06-12T08:01:00Z', now)).toBe(false);
    expect(adminSessionExpired('2026-06-12T19:59:00Z', now)).toBe(false);
  });

  it('never expires on missing/invalid timestamps (auth decides)', () => {
    expect(adminSessionExpired(null, now)).toBe(false);
    expect(adminSessionExpired(undefined, now)).toBe(false);
    expect(adminSessionExpired('not-a-date', now)).toBe(false);
  });
});
