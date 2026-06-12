import type { HealthOverview } from '@/lib/admin/data';

/**
 * The "Needs attention" list — ONE pure builder (unit tested) shared by the
 * Overview strip and the operator digest email, so the screen and the inbox
 * never disagree about what's wrong.
 */
export type AttentionItem = { text: string; href: string; severity: 'bad' | 'warn' };

export function buildAttention(h: HealthOverview): AttentionItem[] {
  const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
  return [
    h.sync.errored > 0 && {
      text: `${h.sync.errored} mailbox ${plural(h.sync.errored, 'sync is', 'syncs are')} erroring`,
      href: '/admin/mailboxes',
      severity: 'bad' as const,
    },
    h.sync.stale > 0 && {
      text: `${h.sync.stale} ${plural(h.sync.stale, 'mailbox is', 'mailboxes are')} stale (>30m without a sync)`,
      href: '/admin/mailboxes',
      severity: 'warn' as const,
    },
    h.webhooks.errored > 0 && {
      text: `${h.webhooks.errored} webhook ${plural(h.webhooks.errored, 'error', 'errors')}`,
      href: '/admin/mailboxes',
      severity: 'bad' as const,
    },
    h.reminders.overdue > 0 && {
      text: `${h.reminders.overdue} ${plural(h.reminders.overdue, 'reminder is', 'reminders are')} overdue to fire (cron behind?)`,
      href: '/admin/audit',
      severity: 'bad' as const,
    },
    h.reminders.failed > 0 && {
      text: `${h.reminders.failed} ${plural(h.reminders.failed, 'reminder', 'reminders')} failed`,
      href: '/admin/audit',
      severity: 'warn' as const,
    },
    h.users.suspended > 0 && {
      text: `${h.users.suspended} ${plural(h.users.suspended, 'account', 'accounts')} suspended`,
      href: '/admin/users',
      severity: 'warn' as const,
    },
  ].filter((x): x is AttentionItem => Boolean(x));
}

/** Plain, mail-client-safe HTML for the digest/alert emails. */
export function attentionEmailHtml(items: AttentionItem[], baseUrl: string): string {
  const rows = items
    .map(
      (i) =>
        `<li style="margin:6px 0"><span style="color:${i.severity === 'bad' ? '#d33' : '#b80'}">●</span> ${escapeHtml(i.text)} — <a href="${baseUrl}${i.href}" style="color:#2f7deb">open</a></li>`,
    )
    .join('\n');
  return (
    `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#222">` +
    `<p><b>Vesta needs your attention:</b></p><ul style="padding-left:18px">${rows}</ul>` +
    `<p style="color:#888;font-size:12px">— Vesta operator alerts. Open the <a href="${baseUrl}/admin" style="color:#2f7deb">console</a> for the live picture.</p></div>`
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
