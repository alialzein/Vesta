import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { priorityBand } from '@/lib/priority';
import { Icon } from '@/components/ui/Icon';

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
 * Priorities — real work_items derived by the Phase 6 follow-up engine
 * ("waiting on you" threads with a heuristic urgency score). Populated by
 * Settings → Sync now. AI summaries/priority refine these in Phase 7; the demo
 * Today dashboard stays until then.
 */
export default async function PrioritiesPage() {
  await requireUser();
  const supabase = createClient();

  const { data: items } = await supabase
    .from('work_items')
    .select('id, title, summary, category, priority_score, urgency_reason, requires_reply')
    .eq('status', 'open')
    .order('priority_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  const list = items ?? [];

  return (
    <main className="v-scroll mx-auto h-screen w-full max-w-[820px] overflow-y-auto px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to dashboard"
          className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
        </Link>
        <div className="flex-1">
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight">Priorities</h1>
          <p className="mt-1 text-[13px] text-muted">
            People waiting on you, ranked by urgency. Synced from your mailbox.
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

      {list.length === 0 ? (
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
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((w) => {
            const band = priorityBand(w.priority_score ?? 0);
            return (
              <li
                key={w.id}
                className="flex items-start gap-3 rounded-[14px] border border-line bg-panel p-4 shadow-soft transition hover:border-line-strong"
              >
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
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
