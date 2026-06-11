import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { SenderActions } from '@/components/triage/SenderActions';

export const dynamic = 'force-dynamic';

/**
 * Hidden review (Phase 6.5) — inbound mail triage filtered out as noise, kept so
 * the manager can see WHY and override (one-click "Always allow" / "Mark VIP").
 * Renders inside the AppShell (sidebar + topbar provide nav and the page title).
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

  if (items.length === 0) {
    return (
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
    );
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {items.map((m) => (
        <li key={m.id} className="rounded-[14px] border border-line bg-panel p-4 shadow-soft">
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
  );
}
