import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_DRAFT_STATUSES, type DraftRow } from '@/lib/drafts/serialize';
import type { DraftRecipient } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';

export const dynamic = 'force-dynamic';

/**
 * Draft Replies — every saved draft in one place (the sidebar's "Draft Replies").
 * Lists the live drafts (AI-generated or hand-edited, not yet sent) and deep-links
 * each one back into the dashboard composer, so a draft started yesterday is one
 * click from review → Approve & Send. Nothing here sends anything by itself.
 */

type DraftListRow = Pick<
  DraftRow,
  'id' | 'work_item_id' | 'subject' | 'status' | 'updated_at' | 'body_text' | 'user_edited_body' | 'to_recipients'
> & {
  work_items: { id: string; title: string | null; status: string | null } | null;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'AI draft', className: 'bg-accent-soft text-accent' },
  edited: { label: 'Edited by you', className: 'bg-amber-soft text-amber' },
  approved: { label: 'Approved', className: 'bg-green-soft text-green' },
  failed: { label: 'Send failed — retry', className: 'bg-red-soft text-red' },
};

function toLine(to: unknown): string | null {
  if (!Array.isArray(to) || to.length === 0) return null;
  const list = to as DraftRecipient[];
  const first = list[0]?.name || list[0]?.email;
  if (!first) return null;
  return list.length > 1 ? `To ${first} +${list.length - 1}` : `To ${first}`;
}

export default async function DraftsPage() {
  await requireUser();
  const supabase = createClient();

  const { data } = await supabase
    .from('draft_replies')
    .select(
      'id, work_item_id, subject, status, updated_at, body_text, user_edited_body, to_recipients, work_items(id, title, status)',
    )
    .in('status', [...ACTIVE_DRAFT_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(50);

  const drafts = (data ?? []) as unknown as DraftListRow[];

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
            Draft replies
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Replies waiting for your review. Nothing is ever sent without your approval.
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

      {drafts.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name="drafts" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-[18px] font-semibold tracking-tight">
            No drafts waiting
          </h2>
          <p className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-muted">
            Pick an email on Today&rsquo;s Radar and hit <b>Draft reply</b> — Vesta writes it, you
            edit and approve. Saved drafts wait here until you send or discard them.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-soft transition hover:brightness-110"
          >
            Go to Today&rsquo;s Radar
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {drafts.map((d) => {
            const badge = STATUS_BADGE[d.status ?? 'draft'] ?? STATUS_BADGE.draft;
            const preview = (d.user_edited_body ?? d.body_text ?? '').trim();
            const to = toLine(d.to_recipients);
            // Open items reopen straight into the composer; items already
            // resolved keep their draft visible but explain why it's parked.
            const itemOpen =
              d.work_items?.status === 'open' || d.work_items?.status === 'snoozed';
            const href =
              itemOpen && d.work_item_id ? `/?item=${d.work_item_id}&compose=1` : null;
            const body = (
              <>
                <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[12px] bg-accent-soft text-accent">
                  <Icon name="drafts" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="m-0 truncate text-[14px] font-semibold text-ink">
                      {d.subject?.trim() || d.work_items?.title?.trim() || '(no subject)'}
                    </h3>
                    <span
                      className={`flex-none rounded-full px-[8px] py-[2px] text-[10.5px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-[2px] flex items-baseline gap-2">
                    {to && <span className="flex-none text-[12px] font-medium text-ink-soft">{to}</span>}
                    {d.updated_at && (
                      <span className="font-mono text-[11px] text-muted">
                        <LocalTime iso={d.updated_at} />
                      </span>
                    )}
                  </div>
                  {preview && (
                    <p className="mt-[3px] line-clamp-2 text-[12.5px] leading-snug text-muted">
                      {preview}
                    </p>
                  )}
                  {!itemOpen && (
                    <p className="mt-[4px] text-[11.5px] text-muted">
                      The item this reply belongs to is no longer open — the draft is kept, but
                      review it from the thread if it still needs to go out.
                    </p>
                  )}
                </div>
                {href && <Icon name="chevronRight" className="mt-1 h-4 w-4 flex-none text-muted" />}
              </>
            );
            const rowClass =
              'flex items-start gap-3 rounded-[14px] border border-line bg-panel p-4 shadow-soft transition hover:border-line-strong';
            return (
              <li key={d.id}>
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
      )}
    </main>
  );
}
