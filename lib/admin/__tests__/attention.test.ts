import { describe, expect, it } from 'vitest';
import { attentionEmailHtml, buildAttention } from '@/lib/admin/attention';
import type { HealthOverview } from '@/lib/admin/data';

function health(over: Partial<{ [K in keyof HealthOverview]: Partial<HealthOverview[K]> }> = {}): HealthOverview {
  return {
    users: { total: 3, admins: 1, suspended: 0, connected: 2, ...(over.users ?? {}) },
    sync: { mailboxes: 2, stale: 0, errored: 0, lastSuccessAt: null, ...(over.sync ?? {}) },
    webhooks: { pending: 0, errored: 0, ...(over.webhooks ?? {}) },
    ai: { cost: 0, calls: 0, tokens: 0, ...(over.ai ?? {}) },
    reminders: { scheduled: 1, overdue: 0, failed: 0, ...(over.reminders ?? {}) },
    drafts: { pending: 0, ...(over.drafts ?? {}) },
    errors: [],
  } as HealthOverview;
}

describe('buildAttention', () => {
  it('is empty when everything is healthy', () => {
    expect(buildAttention(health())).toEqual([]);
  });

  it('lists each problem with the tab that fixes it', () => {
    const items = buildAttention(
      health({ sync: { stale: 2, errored: 1 }, reminders: { overdue: 1, failed: 3 } }),
    );
    expect(items.map((i) => i.text)).toEqual([
      '1 mailbox sync is erroring',
      '2 mailboxes are stale (>30m without a sync)',
      '1 reminder is overdue to fire (cron behind?)',
      '3 reminders failed',
    ]);
    expect(items[0]).toMatchObject({ href: '/admin/mailboxes', severity: 'bad' });
  });
});

describe('attentionEmailHtml', () => {
  it('renders mail-safe HTML with console links', () => {
    const html = attentionEmailHtml(
      [{ text: '1 mailbox sync is erroring', href: '/admin/mailboxes', severity: 'bad' }],
      'https://vesta.app',
    );
    expect(html).toContain('1 mailbox sync is erroring');
    expect(html).toContain('https://vesta.app/admin/mailboxes');
  });
});
