import { describe, expect, it } from 'vitest';
import { detectCapBreaches, shouldSendDigest } from '@/lib/admin/ops-logic';

describe('detectCapBreaches', () => {
  const spend = new Map([
    ['u1', 0.6],
    ['u2', 0.2],
    ['u3', 1.5],
  ]);

  it('no caps configured -> never breaches (operator opts in)', () => {
    expect(detectCapBreaches(spend, null, new Map())).toEqual([]);
  });

  it('global cap applies to everyone without a personal cap', () => {
    const b = detectCapBreaches(spend, 0.5, new Map());
    expect(b.map((x) => x.userId)).toEqual(['u3', 'u1']); // biggest first
    expect(b[0]).toEqual({ userId: 'u3', spentUsd: 1.5, capUsd: 0.5 });
  });

  it('a personal cap overrides the global one (looser OR tighter)', () => {
    const per = new Map<string, number | null>([
      ['u1', 2], // loose personal cap -> u1 no longer breaches
      ['u2', 0.1], // tight personal cap -> u2 now breaches
    ]);
    const b = detectCapBreaches(spend, 0.5, per);
    expect(b.map((x) => x.userId)).toEqual(['u3', 'u2']);
  });

  it('a zero/disabled cap never fires', () => {
    expect(detectCapBreaches(spend, 0, new Map())).toEqual([]);
  });
});

describe('shouldSendDigest', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 5, 12, h, 10));

  it('fires on the first run at/after the digest hour, only with issues', () => {
    expect(shouldSendDigest(at(5), 5, false, 2)).toBe(true);
    expect(shouldSendDigest(at(7), 5, false, 2)).toBe(true);
    expect(shouldSendDigest(at(4), 5, false, 2)).toBe(false); // too early
    expect(shouldSendDigest(at(6), 5, true, 2)).toBe(false); // already sent
    expect(shouldSendDigest(at(6), 5, false, 0)).toBe(false); // all healthy
  });
});
