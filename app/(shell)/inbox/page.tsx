import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { SenderActions } from '@/components/triage/SenderActions';
import { encodeThreadId } from '@/lib/thread';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  subject: string | null;
  body_preview: string | null;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null;
  is_read: boolean | null;
  graph_conversation_id: string | null;
};

/**
 * Inbox — real synced Outlook mail, **grouped by conversation** so replies to the
 * same email collapse into one thread row (not separate items). Each row opens the
 * full-screen thread view (/thread/[id]). Only mail that passed triage is shown
 * (excluded_at null); hidden noise lives under "Hidden". RLS-scoped.
 * Renders inside the AppShell (sidebar + topbar provide nav and the page title).
 */
export default async function InboxPage() {
  await requireUser();
  const supabase = createClient();

  const [{ data: messages }, { data: vips }] = await Promise.all([
    supabase
      .from('email_messages')
      .select(
        'id, subject, body_preview, sender_name, sender_email, received_at, is_read, graph_conversation_id',
      )
      .eq('direction', 'inbound')
      .is('excluded_at', null)
      .is('deleted_at', null)
      .order('received_at', { ascending: false })
      .limit(150),
    supabase.from('people').select('email').eq('is_vip', true),
  ]);

  const vipSet = new Set((vips ?? []).map((v) => v.email?.toLowerCase()).filter(Boolean));

  // Group by conversation. Rows arrive newest-first, so the first row seen per
  // conversation is its latest message; the Map preserves that latest-first order.
  const threads = new Map<string, { latest: Row; count: number; unread: boolean }>();
  for (const m of (messages ?? []) as Row[]) {
    const key = m.graph_conversation_id || `msg:${m.id}`;
    const t = threads.get(key);
    if (!t) threads.set(key, { latest: m, count: 1, unread: m.is_read === false });
    else {
      t.count += 1;
      t.unread = t.unread || m.is_read === false;
    }
  }
  // Cap the rendered list (perf fix, 2026-06-12): every row hydrates two
  // client islands (LocalTime + SenderActions), and 150 conversations made
  // the page noticeably slow to open — on phones especially. 60 newest
  // threads cover the working set; older mail stays reachable in Outlook.
  const all = [...threads.values()];
  const items = all.slice(0, 60);
  const truncated = all.length - items.length;

  if (items.length === 0) {
    return (
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
          prefetch
          className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-soft transition hover:brightness-110"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <>
    <ul className="flex list-none flex-col gap-2 p-0">
      {items.map(({ latest: m, count, unread }) => {
        const href = m.graph_conversation_id
          ? `/thread/${encodeThreadId(m.graph_conversation_id)}`
          : null;
        return (
          <li
            key={m.graph_conversation_id || m.id}
            className={[
              'rounded-[14px] border border-line bg-panel shadow-soft transition hover:border-line-strong',
              unread ? 'border-l-[3px] border-l-accent' : '',
            ].join(' ')}
          >
            <Link
              href={href ?? '#'}
              prefetch={Boolean(href)}
              className="block p-4"
              aria-label={`Open conversation: ${m.subject || 'no subject'}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] font-semibold text-ink">
                  {m.sender_name || m.sender_email || 'Unknown sender'}
                </span>
                <span className="flex-none font-mono text-[11px] text-muted">
                  <LocalTime iso={m.received_at} />
                </span>
              </div>
              <p className="mt-[2px] truncate text-[13.5px] font-medium text-ink-soft">
                {m.subject || '(no subject)'}
                {count > 1 && (
                  <span className="ml-2 rounded-full bg-panel-2 px-2 py-[1px] text-[11px] font-semibold text-muted">
                    {count}
                  </span>
                )}
              </p>
              {m.body_preview && (
                <p className="mt-[3px] line-clamp-2 text-[12.5px] leading-snug text-muted">
                  {m.body_preview}
                </p>
              )}
            </Link>
            <div className="px-4 pb-3">
              <SenderActions
                email={m.sender_email}
                name={m.sender_name}
                context="inbox"
                isVip={m.sender_email ? vipSet.has(m.sender_email.toLowerCase()) : false}
              />
            </div>
          </li>
        );
      })}
    </ul>
    {truncated > 0 && (
      <p className="mt-3 text-center text-[12px] text-muted">
        Showing your latest {items.length} conversations — older mail lives in Outlook.
      </p>
    )}
    </>
  );
}
