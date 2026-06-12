import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { priorityBand } from '@/lib/priority';
import { Icon } from '@/components/ui/Icon';
import { encodeThreadId } from '@/lib/thread';

export const dynamic = 'force-dynamic';

const bandClass: Record<'red' | 'amber' | 'green', string> = {
  red: 'bg-red-soft text-red',
  amber: 'bg-amber-soft text-amber',
  green: 'bg-green-soft text-green',
};

const categoryLabel: Record<string, string> = {
  waiting: 'Waiting on you',
  followup: 'Follow-up',
  fyi: 'FYI',
};

/**
 * Priorities ("Waiting on you") — real work_items derived by the follow-up engine,
 * the full ranked list of every conversation waiting on the manager's reply.
 * Renders inside the AppShell (sidebar + topbar provide nav and the page title).
 */
export default async function PrioritiesPage() {
  await requireUser();
  const supabase = createClient();

  const { data: items } = await supabase
    .from('work_items')
    .select(
      'id, title, summary, category, priority_score, urgency_reason, requires_reply, source, source_external_id',
    )
    .eq('status', 'open')
    .order('priority_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  const list = items ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <h2 className="mt-3 font-display text-[18px] font-semibold tracking-tight">
          Nothing waiting on you
        </h2>
        <p className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-muted">
          When you sync your mailbox, threads where someone is waiting on your reply show up here,
          ranked by urgency. Connect and sync in Settings to populate it.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-soft transition hover:brightness-110"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {list.map((w) => {
        const band = priorityBand(w.priority_score ?? 0);
        const href =
          w.source === 'outlook' && w.source_external_id
            ? `/thread/${encodeThreadId(w.source_external_id)}`
            : null;
        const body = (
          <>
            <span
              className={`grid h-[42px] w-[42px] flex-none place-items-center rounded-[12px] font-mono text-[15px] font-bold ${bandClass[band]}`}
            >
              {w.priority_score ?? 0}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="m-0 truncate text-[14px] font-semibold text-ink">
                  {w.title || '(no subject)'}
                </h3>
                {w.category && (
                  <span className="flex-none rounded-full bg-accent-soft px-[8px] py-[2px] text-[10.5px] font-semibold text-accent">
                    {categoryLabel[w.category] ?? w.category}
                  </span>
                )}
              </div>
              {w.urgency_reason && (
                <p className="mt-[2px] text-[12.5px] text-ink-soft">{w.urgency_reason}</p>
              )}
              {w.summary && (
                <p className="mt-[3px] line-clamp-2 text-[12.5px] leading-snug text-muted">
                  {w.summary}
                </p>
              )}
            </div>
            {href && <Icon name="chevronRight" className="mt-1 h-4 w-4 flex-none text-muted" />}
          </>
        );
        const rowClass =
          'flex items-start gap-3 rounded-[14px] border border-line bg-panel p-4 shadow-soft transition hover:border-line-strong';
        return (
          <li key={w.id}>
            {href ? (
              <Link href={href} prefetch className={rowClass}>
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
