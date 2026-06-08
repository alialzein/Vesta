import { describe, expect, it } from 'vitest';
import { readStoredSubscription, isSubscriptionFresh, RENEW_WITHIN_MS } from '../subscriptions';

describe('readStoredSubscription', () => {
  it('returns null when there is no (complete) subscription block', () => {
    expect(readStoredSubscription(null)).toBeNull();
    expect(readStoredSubscription({})).toBeNull();
    expect(readStoredSubscription({ subscription: { id: 'x' } })).toBeNull();
  });

  it('reads a complete subscription block', () => {
    const meta = {
      subscription: {
        id: 'sub1',
        clientState: 'cs',
        expiresAt: '2026-06-10T00:00:00Z',
        resource: '/me/mailFolders/inbox/messages',
      },
    };
    expect(readStoredSubscription(meta)).toEqual({
      id: 'sub1',
      clientState: 'cs',
      expiresAt: '2026-06-10T00:00:00Z',
      resource: '/me/mailFolders/inbox/messages',
    });
  });
});

describe('isSubscriptionFresh', () => {
  const now = Date.parse('2026-06-08T00:00:00Z');

  it('is fresh when expiry is beyond the renew window', () => {
    const expires = new Date(now + RENEW_WITHIN_MS + 60_000).toISOString();
    expect(isSubscriptionFresh(expires, now)).toBe(true);
  });

  it('is stale within the renew window', () => {
    const expires = new Date(now + RENEW_WITHIN_MS - 60_000).toISOString();
    expect(isSubscriptionFresh(expires, now)).toBe(false);
  });

  it('is stale when already expired', () => {
    expect(isSubscriptionFresh(new Date(now - 1000).toISOString(), now)).toBe(false);
  });

  it('is stale for an unparseable date', () => {
    expect(isSubscriptionFresh('not-a-date', now)).toBe(false);
  });
});
