import { describe, expect, it } from 'vitest';
import { buildWeeklyReview, windowStart } from '@/lib/review/weekly';

// Fixed clock: Thursday 2026-06-11 12:00 UTC.
const NOW = new Date('2026-06-11T12:00:00.000Z');

function resolvedRow(
  id: string,
  resolvedAt: string,
  kind: 'done' | 'dismiss',
  extra: Partial<{ title: string; category: string }> = {},
) {
  return {
    id,
    title: extra.title ?? `Item ${id}`,
    category: extra.category ?? 'waiting',
    status: kind === 'done' ? 'done' : 'dismissed',
    metadata: { resolved_at: resolvedAt, resolved_kind: kind },
  };
}

describe('windowStart', () => {
  it("returns midnight (manager tz) of the oldest of the last 7 calendar days", () => {
    // 7 calendar days ending Jun 11 → window opens Jun 5 at tz midnight.
    expect(windowStart(NOW, 'UTC')).toBe('2026-06-05T00:00:00.000Z');
    // Beirut (UTC+3): local midnight Jun 5 = 21:00 UTC Jun 4.
    expect(windowStart(NOW, 'Asia/Beirut')).toBe('2026-06-04T21:00:00.000Z');
  });
});

describe('buildWeeklyReview', () => {
  it('counts done vs dismissed separately and lists only done items', () => {
    const review = buildWeeklyReview({
      resolved: [
        resolvedRow('a', '2026-06-10T09:00:00.000Z', 'done'),
        resolvedRow('b', '2026-06-09T09:00:00.000Z', 'done'),
        resolvedRow('c', '2026-06-08T09:00:00.000Z', 'dismiss'),
      ],
      sent: [{ id: 'd1', subject: 'Re: budget', updated_at: '2026-06-10T10:00:00.000Z' }],
      inbound: [],
      now: NOW,
    });
    expect(review.completed).toBe(2);
    expect(review.dismissed).toBe(1);
    expect(review.repliesSent).toBe(1);
    expect(review.completedItems.map((i) => i.id)).toEqual(['a', 'b']); // newest first, no dismissed
    expect(review.empty).toBe(false);
  });

  it('buckets completions into 7 days, oldest → today', () => {
    const review = buildWeeklyReview({
      resolved: [
        resolvedRow('a', '2026-06-11T01:00:00.000Z', 'done'), // today
        resolvedRow('b', '2026-06-11T23:00:00.000Z', 'done'), // today
        resolvedRow('c', '2026-06-05T12:00:00.000Z', 'done'), // 6 days ago (first bucket)
      ],
      sent: [],
      inbound: [],
      now: NOW,
    });
    expect(review.perDay).toHaveLength(7);
    expect(review.perDay[0]).toMatchObject({ iso: '2026-06-05', label: 'Fri', count: 1 });
    expect(review.perDay[6]).toMatchObject({ iso: '2026-06-11', label: 'Thu', count: 2 });
    // Days in between stay zero.
    expect(review.perDay.slice(1, 6).every((d) => d.count === 0)).toBe(true);
  });

  it("buckets by the MANAGER's calendar day, not the server's (tz)", () => {
    // 22:00 UTC on Jun 10 = 01:00 Jun 11 in Beirut (UTC+3) → tomorrow's bucket.
    const review = buildWeeklyReview({
      resolved: [resolvedRow('a', '2026-06-10T22:00:00.000Z', 'done')],
      sent: [],
      inbound: [],
      now: NOW,
      tz: 'Asia/Beirut',
    });
    const jun10 = review.perDay.find((d) => d.iso === '2026-06-10');
    const jun11 = review.perDay.find((d) => d.iso === '2026-06-11');
    expect(jun10?.count).toBe(0);
    expect(jun11?.count).toBe(1);
  });

  it('ranks the busiest senders (keyed by email, case-insensitive) and keeps the top 5', () => {
    const inbound = [
      ...Array.from({ length: 3 }, () => ({ sender_name: 'Maya Khoury', sender_email: 'maya@co.com' })),
      { sender_name: null, sender_email: 'MAYA@co.com' }, // same person, different case
      ...Array.from({ length: 2 }, () => ({ sender_name: 'Omar Itani', sender_email: 'omar@co.com' })),
      { sender_name: 'One-off', sender_email: 'once@co.com' },
      { sender_name: 'No Email', sender_email: null }, // keys on the name
      { sender_name: 'B', sender_email: 'b@co.com' },
      { sender_name: 'C', sender_email: 'c@co.com' },
      { sender_name: 'D', sender_email: 'd@co.com' },
    ];
    const review = buildWeeklyReview({ resolved: [], sent: [], inbound, now: NOW });
    expect(review.topSenders[0]).toMatchObject({ email: 'maya@co.com', count: 4 });
    expect(review.topSenders[1]).toMatchObject({ email: 'omar@co.com', count: 2 });
    expect(review.topSenders).toHaveLength(5);
    expect(review.inboundCount).toBe(inbound.length);
  });

  it('reports an empty week honestly', () => {
    const review = buildWeeklyReview({ resolved: [], sent: [], inbound: [], now: NOW });
    expect(review.empty).toBe(true);
    expect(review.perDay.every((d) => d.count === 0)).toBe(true);
    expect(review.topSenders).toEqual([]);
  });

  it('treats rows with dismissed status but no resolved_kind as dismissed', () => {
    const review = buildWeeklyReview({
      resolved: [
        { id: 'x', title: 'Old row', category: 'fyi', status: 'dismissed', metadata: {} },
      ],
      sent: [],
      inbound: [],
      now: NOW,
    });
    expect(review.dismissed).toBe(1);
    expect(review.completed).toBe(0);
  });
});
