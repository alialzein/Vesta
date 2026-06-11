import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import {
  buildWeeklyReview,
  windowStart,
  type InboundMessageRow,
  type ResolvedItemRow,
  type SentDraftRow,
} from '@/lib/review/weekly';
import { avatarHue, initialsOf } from '@/lib/avatar';
import { CATEGORY_LABEL } from '@/lib/dashboard/present';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';

export const dynamic = 'force-dynamic';

/**
 * Weekly Review (sidebar → Intelligence) — what actually moved in the last
 * 7 days: completions, replies sent, noise dismissed, inbound volume, the
 * day-by-day rhythm, and the senders who took the most attention. All numbers
 * come from the manager's own rows (work_items, draft_replies, email_messages);
 * the aggregation is the pure, unit-tested `buildWeeklyReview`.
 */
export default async function WeeklyReviewPage() {
  await requireUser();
  const supabase = createClient();
  const since = windowStart(new Date());

  const [resolvedRes, sentRes, inboundRes, openRes] = await Promise.all([
    supabase
      .from('work_items')
      .select('id, title, category, status, metadata')
      .in('status', ['done', 'dismissed'])
      .gte('metadata->>resolved_at', since)
      .limit(300),
    supabase
      .from('draft_replies')
      .select('id, subject, updated_at')
      .eq('status', 'sent')
      .gte('updated_at', since)
      .limit(300),
    supabase
      .from('email_messages')
      .select('sender_name, sender_email')
      .eq('direction', 'inbound')
      .is('deleted_at', null)
      .gte('received_at', since)
      .limit(1000),
    supabase.from('work_items').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const review = buildWeeklyReview({
    resolved: (resolvedRes.data ?? []) as ResolvedItemRow[],
    sent: (sentRes.data ?? []) as SentDraftRow[],
    inbound: (inboundRes.data ?? []) as InboundMessageRow[],
  });
  const openCount = openRes.count ?? 0;
  const maxDay = Math.max(1, ...review.perDay.map((d) => d.count));

  const kpis: { label: string; value: number; helper: string; tone: string }[] = [
    { label: 'Completed', value: review.completed, helper: 'Marked done this week', tone: 'bg-green-soft text-green' },
    { label: 'Replies sent', value: review.repliesSent, helper: 'Approved & sent by you', tone: 'bg-accent-soft text-accent' },
    { label: 'Dismissed', value: review.dismissed, helper: 'Didn’t need you after all', tone: 'bg-panel-2 text-muted' },
    { label: 'Inbound emails', value: review.inboundCount, helper: 'Hit your mailbox this week', tone: 'bg-amber-soft text-amber' },
  ];

  return (
    <main className="v-scroll mx-auto h-screen w-full max-w-[820px] overflow-y-auto px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          prefetch
          aria-label="Back to dashboard"
          className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
        </Link>
        <div className="flex-1">
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight">
            Weekly Review
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            What moved in the last 7 days — and what took your attention.
          </p>
        </div>
        <Link
          href="/"
          prefetch
          className="inline-flex items-center gap-2 rounded-[11px] border border-line bg-panel px-3 py-[9px] text-[13px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="home" className="h-[15px] w-[15px]" />
          Radar
        </Link>
      </div>

      {review.empty ? (
        <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name="trend" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-[18px] font-semibold tracking-tight">
            Your first review is brewing
          </h2>
          <p className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-muted">
            Once mail syncs and you start clearing the radar — marking items done, sending
            replies — this page turns into your week at a glance: what you finished, who took
            your time, and the rhythm of your days.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ------------------------------- KPIs ------------------------------- */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-[14px] border border-line bg-panel p-4 shadow-soft"
              >
                <span
                  className={`inline-grid h-9 min-w-9 place-items-center rounded-[10px] px-2 font-mono text-[17px] font-bold ${k.tone}`}
                >
                  {k.value}
                </span>
                <p className="mb-0 mt-2 text-[13px] font-semibold text-ink">{k.label}</p>
                <p className="mb-0 mt-[2px] text-[11.5px] text-muted">{k.helper}</p>
              </div>
            ))}
          </div>

          {/* ------------------------ day-by-day rhythm ------------------------ */}
          <section className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-soft">
            <h2 className="m-0 font-display text-[17px] font-medium tracking-tight">
              Your week, day by day
            </h2>
            <p className="mt-1 text-[12.5px] text-muted">Items you marked done each day.</p>
            <div className="mt-4 grid grid-cols-7 items-end gap-2" aria-hidden="true">
              {review.perDay.map((d) => (
                <div key={d.iso} className="flex flex-col items-center gap-1">
                  <span className="font-mono text-[11px] font-semibold text-ink-soft">
                    {d.count > 0 ? d.count : ''}
                  </span>
                  <div className="flex h-24 w-full items-end rounded-md bg-panel-2">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-accent to-accent-2 opacity-90"
                      style={{ height: `${Math.round((d.count / maxDay) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mb-0 mt-4 text-[12px] text-muted">
              <b className="text-ink-soft">{openCount}</b>{' '}
              {openCount === 1 ? 'item carries' : 'items carry'} over into next week.
            </p>
          </section>

          {/* ------------------------- completed list -------------------------- */}
          {review.completedItems.length > 0 && (
            <section className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-soft">
              <h2 className="m-0 font-display text-[17px] font-medium tracking-tight">
                Completed this week
              </h2>
              <ul className="mt-3 flex list-none flex-col gap-2 p-0">
                {review.completedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-[12px] border border-line bg-card p-3"
                  >
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-green-soft text-green">
                      <Icon name="check" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
                      {item.title}
                    </span>
                    {item.category && (
                      <span className="flex-none rounded-full bg-panel-2 px-[8px] py-[2px] text-[10.5px] font-semibold text-muted">
                        {CATEGORY_LABEL[item.category] ?? item.category}
                      </span>
                    )}
                    {item.resolvedAt && (
                      <span className="flex-none font-mono text-[11px] text-muted">
                        <LocalTime iso={item.resolvedAt} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ------------------------- busiest senders ------------------------- */}
          {review.topSenders.length > 0 && (
            <section className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-soft">
              <h2 className="m-0 font-display text-[17px] font-medium tracking-tight">
                Who took your attention
              </h2>
              <p className="mt-1 text-[12.5px] text-muted">
                The senders behind this week&rsquo;s inbound mail.
              </p>
              <ul className="mt-3 flex list-none flex-col gap-2 p-0">
                {review.topSenders.map((s) => {
                  const hue = avatarHue(s.email ?? s.name);
                  return (
                    <li key={s.email ?? s.name} className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 flex-none place-items-center rounded-full text-[12px] font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, hsl(${hue} 65% 45%), hsl(${(hue + 40) % 360} 65% 35%))`,
                        }}
                      >
                        {initialsOf(s.name, s.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">
                          {s.name}
                        </span>
                        {s.email && (
                          <span className="block truncate text-[11.5px] text-muted">{s.email}</span>
                        )}
                      </span>
                      <span className="flex-none rounded-full bg-panel-2 px-[9px] py-[2px] font-mono text-[11px] font-semibold text-muted">
                        {s.count} {s.count === 1 ? 'email' : 'emails'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
