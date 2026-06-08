import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { SenderActions } from '@/components/triage/SenderActions';

export const dynamic = 'force-dynamic';

/** Format an ISO timestamp as a short date+time. */
function when(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Hidden review (Phase 6.5) — inbound mail triage filtered out as noise, kept so
 * the manager can see WHY and override (one-click "Always allow" / "Mark VIP").
 * Light/dark safe.
 */
export default async function HiddenPage() {
  await requireUser();
  const supabase = createClient();

  const [{ data: messages }, { data: vips }] = await Promise.all([
    supabase
      .from('email_messages')
      .select('id, subject, body_preview, sender_name, sender_email, received_at, excluded_reason')
      .eq('direction', 'inbound')
      .not('excluded_at', 'is', null)
      .is('deleted_at', null)
      .order('received_at', { ascending: false })
      .limit(100),
    supabase.from('people').select('email').eq('is_vip', true),
  ]);

  const vipSet = new Set((vips ?? []).map((v) => v.email?.toLowerCase()).filter(Boolean));
  const items = messages ?? [];

  return (
    <main className="v-scroll mx-auto h-screen w-full max-w-[820px] overflow-y-auto px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
        </Link>
        <div className="flex-1">
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight">Hidden mail</h1>
          <p className="mt-1 text-[13px] text-muted">
            Mail Vesta filtered out as noise. Allow anything it got wrong — it’ll stop hiding that
            sender.
          </p>
        </div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-2 rounded-[11px] border border-line bg-panel px-3 py-[9px] text-[13px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="mail" className="h-[15px] w-[15px]" />
          Inbox
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-soft text-green">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-[18px] font-semibold tracking-tight">
            Nothing hidden
          </h2>
          <p className="mx-auto mt-1 max-w-[420px] text-[13px] leading-relaxed text-muted">
            Vesta hasn’t filtered anything out. As mail comes in, noise (newsletters, alerts,
            automated senders) will be collected here for review.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((m) => (
            <li key={m.id} className="rounded-[14px] border border-line bg-panel p-4 shadow-soft">
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
              {m.excluded_reason && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-panel-2 px-2 py-[2px] text-[11px] font-medium text-muted">
                  <Icon name="info" className="h-3 w-3" />
                  {m.excluded_reason}
                </span>
              )}
              <SenderActions
                email={m.sender_email}
                name={m.sender_name}
                context="hidden"
                isVip={m.sender_email ? vipSet.has(m.sender_email.toLowerCase()) : false}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
