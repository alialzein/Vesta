/**
 * Weekly Review (sidebar → Intelligence) — pure aggregation of what moved in the
 * last 7 days: items completed/dismissed, replies sent, inbound volume, the
 * day-by-day completion rhythm, and the senders who took the most attention.
 *
 * Pure + unit-tested; the route page only fetches rows and renders this shape.
 * Days bucket on UTC for now — per-manager timezone (profiles.timezone) is a
 * queued improvement that should land here and in due_at together.
 */

export type ResolvedItemRow = {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  metadata: unknown;
};

export type SentDraftRow = { id: string; subject: string | null; updated_at: string | null };

export type InboundMessageRow = { sender_name: string | null; sender_email: string | null };

export type WeeklyDay = { label: string; iso: string; count: number };

export type WeeklySender = { name: string; email: string | null; count: number };

export type CompletedItem = {
  id: string;
  title: string;
  category: string | null;
  resolvedAt: string | null;
  kind: 'done' | 'dismissed';
};

export type WeeklyReview = {
  completed: number;
  dismissed: number;
  repliesSent: number;
  inboundCount: number;
  /** Completions per day, oldest → today (7 buckets). */
  perDay: WeeklyDay[];
  /** Items marked done in the window, newest first. */
  completedItems: CompletedItem[];
  /** Senders with the most inbound mail in the window, busiest first (top 5). */
  topSenders: WeeklySender[];
  /** True when the whole week has nothing to show. */
  empty: boolean;
};

/** ISO timestamp `days` days before `now` — the review window's start. */
export function windowStart(now: Date, days = 7): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function resolvedMeta(row: ResolvedItemRow): { at: string | null; kind: 'done' | 'dismissed' } {
  const meta = (row.metadata as { resolved_at?: string; resolved_kind?: string } | null) ?? {};
  const kind =
    meta.resolved_kind === 'dismiss' || row.status === 'dismissed' ? 'dismissed' : 'done';
  return { at: typeof meta.resolved_at === 'string' ? meta.resolved_at : null, kind };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });

export function buildWeeklyReview(input: {
  resolved: ResolvedItemRow[];
  sent: SentDraftRow[];
  inbound: InboundMessageRow[];
  now?: Date;
}): WeeklyReview {
  const now = input.now ?? new Date();

  const resolved = input.resolved.map((r) => ({ row: r, ...resolvedMeta(r) }));
  const doneItems = resolved.filter((r) => r.kind === 'done');
  const dismissed = resolved.length - doneItems.length;

  // 7 buckets, oldest → today, keyed by UTC date.
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const perDay: WeeklyDay[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(todayUtc - (6 - i) * DAY_MS);
    return { label: WEEKDAY.format(day), iso: day.toISOString().slice(0, 10), count: 0 };
  });
  const bucketByIso = new Map(perDay.map((d) => [d.iso, d]));
  for (const r of doneItems) {
    if (!r.at) continue;
    const bucket = bucketByIso.get(r.at.slice(0, 10));
    if (bucket) bucket.count += 1;
  }

  const completedItems: CompletedItem[] = doneItems
    .map((r) => ({
      id: r.row.id,
      title: r.row.title?.trim() || '(no subject)',
      category: r.row.category,
      resolvedAt: r.at,
      kind: r.kind,
    }))
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
    .slice(0, 20);

  // Busiest senders — keyed by lowercased email (name-only rows key on the name).
  const senders = new Map<string, WeeklySender>();
  for (const m of input.inbound) {
    const email = m.sender_email?.toLowerCase() ?? null;
    const key = email ?? m.sender_name?.trim().toLowerCase();
    if (!key) continue;
    const existing = senders.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.name && m.sender_name) existing.name = m.sender_name;
    } else {
      senders.set(key, { name: m.sender_name?.trim() || email || 'Unknown', email, count: 1 });
    }
  }
  const topSenders = [...senders.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const repliesSent = input.sent.length;
  const inboundCount = input.inbound.length;

  return {
    completed: doneItems.length,
    dismissed,
    repliesSent,
    inboundCount,
    perDay,
    completedItems,
    topSenders,
    empty: resolved.length === 0 && repliesSent === 0 && inboundCount === 0,
  };
}
