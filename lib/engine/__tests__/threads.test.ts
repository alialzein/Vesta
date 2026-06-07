import { describe, expect, it } from 'vitest';
import {
  computeThreadState,
  scoreThread,
  categorizeThread,
  type ThreadMessage,
} from '@/lib/engine/threads';

const m = (direction: 'inbound' | 'outbound', at: string): ThreadMessage => ({ direction, at });

describe('computeThreadState', () => {
  it('flags waiting-on-manager when the latest message is inbound', () => {
    const s = computeThreadState([
      m('outbound', '2026-06-01T10:00:00Z'),
      m('inbound', '2026-06-02T10:00:00Z'),
    ]);
    expect(s.isWaitingOnManager).toBe(true);
    expect(s.isWaitingOnOther).toBe(false);
    expect(s.latestAt).toBe('2026-06-02T10:00:00Z');
  });

  it('flags waiting-on-other when the manager replied last', () => {
    const s = computeThreadState([
      m('inbound', '2026-06-01T10:00:00Z'),
      m('outbound', '2026-06-02T10:00:00Z'),
    ]);
    expect(s.isWaitingOnManager).toBe(false);
    expect(s.isWaitingOnOther).toBe(true);
    expect(s.inboundAfterLastOutboundCount).toBe(0);
    expect(s.followupCount).toBe(0);
  });

  it('counts repeated follow-ups since the last manager reply', () => {
    const s = computeThreadState([
      m('outbound', '2026-06-01T10:00:00Z'),
      m('inbound', '2026-06-02T10:00:00Z'),
      m('inbound', '2026-06-03T10:00:00Z'),
      m('inbound', '2026-06-04T10:00:00Z'),
    ]);
    expect(s.isWaitingOnManager).toBe(true);
    expect(s.inboundAfterLastOutboundCount).toBe(3);
    expect(s.followupCount).toBe(2); // 3 inbound - 1
  });

  it('handles an all-inbound thread with no manager reply', () => {
    const s = computeThreadState([
      m('inbound', '2026-06-01T10:00:00Z'),
      m('inbound', '2026-06-02T10:00:00Z'),
    ]);
    expect(s.isWaitingOnManager).toBe(true);
    expect(s.inboundAfterLastOutboundCount).toBe(2);
  });

  it('handles an empty thread', () => {
    const s = computeThreadState([]);
    expect(s.isWaitingOnManager).toBe(false);
    expect(s.isWaitingOnOther).toBe(false);
    expect(s.latestAt).toBeNull();
  });
});

describe('scoreThread', () => {
  const now = new Date('2026-06-05T10:00:00Z').getTime();

  it('scores a recent waiting-on-manager thread higher than an old one', () => {
    const recent = scoreThread(computeThreadState([m('inbound', '2026-06-05T08:00:00Z')]), { now });
    const old = scoreThread(computeThreadState([m('inbound', '2026-05-01T08:00:00Z')]), { now });
    expect(recent).toBeGreaterThan(old);
  });

  it('adds pressure for repeated follow-ups and VIPs, and clamps to 100', () => {
    const state = computeThreadState([
      m('outbound', '2026-06-01T10:00:00Z'),
      m('inbound', '2026-06-04T10:00:00Z'),
      m('inbound', '2026-06-05T09:00:00Z'),
    ]);
    const base = scoreThread(state, { now });
    const vip = scoreThread(state, { now, isVip: true });
    expect(vip).toBeGreaterThan(base);
    expect(vip).toBeLessThanOrEqual(100);
  });

  it('scores waiting-on-other lower than waiting-on-manager', () => {
    const waiting = scoreThread(computeThreadState([m('inbound', '2026-06-05T08:00:00Z')]), {
      now,
    });
    const replied = scoreThread(computeThreadState([m('outbound', '2026-06-05T08:00:00Z')]), {
      now,
    });
    expect(waiting).toBeGreaterThan(replied);
  });
});

describe('categorizeThread', () => {
  it('is waiting with no follow-ups, followup with repeats, fyi when replied', () => {
    expect(categorizeThread(computeThreadState([m('inbound', '2026-06-02T10:00:00Z')]))).toBe(
      'waiting',
    );
    expect(
      categorizeThread(
        computeThreadState([
          m('outbound', '2026-06-01T10:00:00Z'),
          m('inbound', '2026-06-02T10:00:00Z'),
          m('inbound', '2026-06-03T10:00:00Z'),
        ]),
      ),
    ).toBe('followup');
    expect(categorizeThread(computeThreadState([m('outbound', '2026-06-02T10:00:00Z')]))).toBe(
      'fyi',
    );
  });
});
