import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { SenderActions } from '@/components/triage/SenderActions';
import { AutoSync } from '@/components/sync/AutoSync';

export const dynamic = 'force-dynamic';

/** Format an ISO timestamp as a short, locale-ish date+time. */
function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Inbox — real synced Outlook messages (Phase 4). Read-only list of recent
 * inbound messages for the signed-in user (RLS-scoped). Populated by
 * Settings → Connect Outlook → Sync now. The main dashboard stays demo until
 * Phase 6/7 enrich work_items.
 */
export default async function InboxPage() {
  await requireUser();
  const supabase = createClient();

  // Only show mail that passed triage (excluded_at is null). Hidden noise is kept
  // in the DB for review but doesn't clutter the Inbox (Phase 6.5).
  const [{ data: messages }, { data: vips }] = await Promise.all([
    supabase
      .from('email_messages')
      .select(
        'id, subject, body_preview, sender_name, sender_email, received_at, is_read, web_link',
      )
      .eq('direction', 'inbound')
      .is('excluded_at', null)
      .is('deleted_at', null)
      .order('received_at', { ascending: false })
      .limit(50),
    supabase.from('people').select('email').eq('is_vip', true),
  ]);

  const vipSet = new Set((vips ?? []).map((v) => v.email?.toLowerCase()).filter(Boolean));
  const items = messages ?? [];

  return (
    <main className="v-scroll mx-auto h-screen w-full max-w-[820px] overflow-y-auto px-5 py-8">
      <AutoSync />
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to dashboard"
          className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
        </Link>
        <div className="flex-1">
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1 text-[13px] text-muted">
            Recent messages Vesta synced from your mailbox.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-[11px] border border-line bg-panel px-3 py-[9px] text-[13px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="refresh" className="h-[15px] w-[15px]" />
          Sync settings
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name="mail" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-[18px] font-semibold tracking-tight">
            No synced messages yet
          </h2>
          <p className="mx-auto mt-1 max-w-[420px] text-[13px] leading-relaxed text-muted">
            Connect your mailbox and run a sync to see your real email here. Vesta only reads — it
            never sends without your approval.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-soft transition hover:brightness-110"
          >
            Go to Settings
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((m) => (
            <li
              key={m.id}
              className={[
                'rounded-[14px] border border-line bg-panel p-4 shadow-soft transition hover:border-line-strong',
                m.is_read === false ? 'border-l-[3px] border-l-accent' : '',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] font-semibold text-ink">
                  {m.sender_name || m.sender_email || 'Unknown sender'}
                </span>
                <span className="flex-none font-mono text-[11px] text-muted">
                  {when(m.received_at)}
                </span>
              </div>
              <p className="mt-[2px] truncate text-[13.5px] font-medium text-ink-soft">
                {m.subject || '(no subject)'}
              </p>
              {m.body_preview && (
                <p className="mt-[3px] line-clamp-2 text-[12.5px] leading-snug text-muted">
                  {m.body_preview}
                </p>
              )}
              <SenderActions
                email={m.sender_email}
                name={m.sender_name}
                context="inbox"
                isVip={m.sender_email ? vipSet.has(m.sender_email.toLowerCase()) : false}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
