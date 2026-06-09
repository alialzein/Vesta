import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Chip, DraftView, KpiMetric, MorningBrief, WorkItem, WorkItemCategory } from '@/lib/types';
import { encodeThreadId } from '@/lib/thread';
import { toDraftView, ACTIVE_DRAFT_STATUSES, type DraftRow } from '@/lib/drafts/serialize';

/**
 * Real dashboard data (Phase 6-derived). Maps the manager's `work_items` (the
 * follow-up engine's "waiting on you" set, already triaged + addressing-gated)
 * into the Today dashboard shapes — Today's Radar rows, the metric strip, and a
 * heuristic Morning Brief. No AI yet: the rail's draft/memory/next-action fields
 * are filled with honest heuristics/placeholders until Phase 7.
 */

type WorkItemRow = {
  id: string;
  title: string | null;
  summary: string | null;
  category: string | null;
  priority_score: number | null;
  urgency_reason: string | null;
  suggested_action: string | null;
  due_at: string | null;
  source: string | null;
  source_external_id: string | null;
  status: string | null;
  snoozed_until: string | null;
};

const WORK_ITEM_COLS =
  'id, title, summary, category, priority_score, urgency_reason, suggested_action, due_at, source, source_external_id, status, snoozed_until';

const CATEGORY_LABEL: Record<string, string> = {
  critical: 'Critical',
  waiting: 'Waiting on you',
  followup: 'Follow-up',
  delegate: 'Can delegate',
  decision: 'Decision',
  promise: 'Promise',
  task: 'Task',
  waiting_on_them: 'Waiting on them',
  fyi: 'FYI',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * Trim the quoted reply chain out of a body preview so the row shows just the new
 * message, not "…On Mon, Jun 8 … wrote: <the whole previous email>". Cuts at common
 * reply markers (only when they appear mid-text, never at the very start), then
 * collapses whitespace.
 */
function cleanPreview(s: string | null): string {
  if (!s) return '';
  let t = s.replace(/\r/g, ' ');
  const markers = [
    /\bOn\s.+?\bwrote:/s,
    /\bFrom:\s.+?\bSent:/s,
    /-{3,}\s*Original Message\s*-{3,}/i,
    /_{5,}/,
  ];
  for (const m of markers) {
    const idx = t.search(m);
    if (idx > 0) t = t.slice(0, idx);
  }
  return t.replace(/\s+/g, ' ').trim();
}

/** Pull the counterpart's name out of an urgency reason ("Maya is waiting…" or
 *  "Waiting on Maya to reply"). */
function personFrom(reason: string | null): string | undefined {
  const waiting = reason?.match(/^(.+?)\s+is waiting/i);
  if (waiting?.[1]) return waiting[1].trim();
  const owed = reason?.match(/^Waiting on (.+?) to reply/i);
  return owed?.[1]?.trim() || undefined;
}

function dueOf(due: string | null, category: WorkItemCategory): { label: string; detail?: string } {
  if (due) {
    const d = new Date(due);
    return {
      label: `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      detail: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
  }
  return { label: category === 'waiting' ? 'Waiting on you' : 'In your queue' };
}

function chipsFor(category: WorkItemCategory, score: number): Chip[] {
  const chips: Chip[] = [];
  if (category === 'waiting') chips.push({ label: 'Waiting on you', tone: 'red' });
  else if (category === 'followup') chips.push({ label: 'Follow-up', tone: 'amber' });
  else if (category === 'fyi') chips.push({ label: 'FYI', tone: 'neutral' });
  else if (category === 'task') chips.push({ label: 'Task', tone: 'blue' });
  else if (category === 'waiting_on_them')
    chips.push({ label: 'Waiting on them', tone: 'amber' });
  else chips.push({ label: CATEGORY_LABEL[category] ?? category, tone: 'blue' });
  if (score >= 80) chips.push({ label: 'High priority', tone: 'red' });
  return chips;
}

function toWorkItem(
  w: WorkItemRow,
  lastActivityAt?: string,
  unread?: boolean,
  draft?: DraftView,
): WorkItem {
  const category = (w.category ?? 'fyi') as WorkItemCategory;
  const score = w.priority_score ?? 0;
  const person = personFrom(w.urgency_reason);
  const due = dueOf(w.due_at, category);
  const summary = cleanPreview(w.summary) || w.urgency_reason?.trim() || 'Open item from your mailbox.';
  // Only Outlook threads can be replied to; manual tasks have nothing to answer.
  const canDraft = w.source === 'outlook' && !!w.source_external_id;

  return {
    id: w.id,
    title: w.title?.trim() || '(no subject)',
    categories: [category],
    source: (w.source as WorkItem['source']) ?? 'outlook',
    threadId:
      w.source === 'outlook' && w.source_external_id
        ? encodeThreadId(w.source_external_id)
        : undefined,
    lastActivityAt,
    unread,
    person,
    summary,
    suggestedAction: w.suggested_action ?? undefined,
    priorityScore: score,
    chips: chipsFor(category, score),
    dueLabel: due.label,
    dueDetail: due.detail,
    urgencyReason: w.urgency_reason ?? summary,
    // AI fields — Phase 7. Honest heuristics/placeholders for now.
    nextBestAction:
      w.suggested_action ??
      (category === 'waiting'
        ? `Reply to ${person ?? 'them'} to unblock this.`
        : category === 'task'
          ? 'Do this task, then mark it done.'
          : category === 'waiting_on_them'
            ? `Follow up with ${person ?? 'them'} if you haven't heard back.`
            : 'Review the latest message and reply.'),
    suggestedDraft:
      draft?.bodyText ||
      (canDraft
        ? 'Generate an AI reply for this thread, then review and approve before it sends.'
        : 'This is a task, not an email thread — there is nothing to reply to.'),
    riskChips: chipsFor(category, score),
    memoryUsed: [],
    activity: [
      { label: 'Priority', value: `${score}/100` },
      { label: 'Category', value: CATEGORY_LABEL[category] ?? category },
      { label: 'Source', value: 'Outlook' },
      ...(w.due_at ? [{ label: 'Due', value: due.label.replace(/^Due /, '') }] : []),
    ],
    canDraft,
    draft,
  };
}

function buildKpis(items: WorkItem[]): KpiMetric[] {
  const count = (c: WorkItemCategory) => items.filter((i) => i.categories.includes(c)).length;
  const high = items.filter((i) => i.priorityScore >= 80).length;
  const top = items.reduce((m, i) => Math.max(m, i.priorityScore), 0);
  return [
    { id: 'kpi-waiting', value: count('waiting'), label: 'Waiting on You', helper: 'Awaiting your reply', tone: 'amber', filter: 'waiting' },
    { id: 'kpi-high', value: high, label: 'High Priority', helper: 'Score 80+', tone: 'red', filter: 'critical' },
    { id: 'kpi-followup', value: count('followup'), label: 'Follow-ups', helper: 'Repeated nudges', tone: 'amber', filter: 'followup' },
    { id: 'kpi-open', value: items.length, label: 'Open Items', helper: 'In your queue', tone: 'blue', filter: 'waiting' },
    { id: 'kpi-fyi', value: count('fyi'), label: 'FYI', helper: 'Lower priority', tone: 'green', filter: 'fyi' },
    { id: 'kpi-top', value: top, label: 'Top Priority', helper: 'Highest score', tone: 'red', filter: 'critical' },
  ];
}

function buildBrief(items: WorkItem[]): MorningBrief {
  if (items.length === 0) {
    return {
      headline: "You're all clear.",
      body: 'Nothing is waiting on you right now. New items will appear as mail syncs.',
      summaryLine: 'No open items waiting on you.',
      topUrgencyScore: 0,
    };
  }
  const waiting = items.filter((i) => i.categories.includes('waiting')).length;
  const followup = items.filter((i) => i.categories.includes('followup')).length;
  const top = items[0];
  const topScore = items.reduce((m, i) => Math.max(m, i.priorityScore), 0);
  const headline = top.person
    ? `${top.person} is waiting on your reply.`
    : `${waiting || items.length} ${waiting === 1 ? 'thing needs' : 'things need'} your attention.`;
  return {
    headline,
    body: `You have <b>${items.length}</b> open ${items.length === 1 ? 'item' : 'items'}: <b>${waiting}</b> waiting on you and <b>${followup}</b> with follow-ups. The top one is <b>${escapeHtml(top.title)}</b>.`,
    summaryLine: `${waiting} waiting · ${followup} follow-up${followup === 1 ? '' : 's'} · Top: ${top.title}`,
    topUrgencyScore: topScore,
  };
}

export type DashboardData = { workItems: WorkItem[]; kpis: KpiMetric[]; brief: MorningBrief };

/**
 * The signed-in manager's real Today dashboard data (RLS-scoped via the
 * authenticated client). Returns empty arrays + an "all clear" brief when there
 * is nothing open — the dashboard renders the empty state, not demo data.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createClient();
  const { data } = await supabase
    .from('work_items')
    .select(WORK_ITEM_COLS)
    // Open items, plus snoozed ones whose snooze time has passed (those come back
    // to the radar on their own — see the due filter below).
    .in('status', ['open', 'snoozed'])
    .order('priority_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50);
  const now = Date.now();
  const rows = ((data ?? []) as WorkItemRow[]).filter(
    (r) =>
      r.status !== 'snoozed' ||
      (r.snoozed_until != null && new Date(r.snoozed_until).getTime() <= now),
  );

  // Pull each thread's latest message time so rows/rail can show "last email" in
  // the manager's local time (work_items.updated_at is a sync timestamp, not the
  // email's time). Keyed by conversation id (source_external_id).
  const convIds = rows
    .filter((r) => r.source === 'outlook' && r.source_external_id)
    .map((r) => r.source_external_id as string);
  const lastByConv = new Map<string, string>();
  // Unread state lives on the messages, not the thread: the latest INBOUND message's
  // is_read tells the manager whether they've actually opened the newest reply.
  const unreadByConv = new Map<string, boolean>();
  if (convIds.length > 0) {
    const [{ data: threads }, { data: inbound }] = await Promise.all([
      supabase
        .from('email_threads')
        .select('graph_conversation_id, latest_inbound_at, latest_message_at')
        .in('graph_conversation_id', convIds),
      supabase
        .from('email_messages')
        .select('graph_conversation_id, is_read, received_at')
        .in('graph_conversation_id', convIds)
        .eq('direction', 'inbound')
        .is('deleted_at', null)
        .order('received_at', { ascending: false }),
    ]);
    for (const t of threads ?? []) {
      const at = t.latest_inbound_at ?? t.latest_message_at;
      if (t.graph_conversation_id && at) lastByConv.set(t.graph_conversation_id, at);
    }
    // Rows arrive newest-first, so the first one seen per conversation is the latest
    // inbound message — its read state is the one that matters.
    for (const m of inbound ?? []) {
      if (m.graph_conversation_id && !unreadByConv.has(m.graph_conversation_id)) {
        unreadByConv.set(m.graph_conversation_id, m.is_read === false);
      }
    }
  }

  // Any already-generated/edited draft replies for these items, so the rail can
  // show "draft ready" and the composer reopens with the saved text.
  const itemIds = rows.map((r) => r.id);
  const draftByItem = new Map<string, DraftView>();
  if (itemIds.length > 0) {
    const { data: drafts } = await supabase
      .from('draft_replies')
      .select('*')
      .in('work_item_id', itemIds)
      .in('status', [...ACTIVE_DRAFT_STATUSES])
      .order('updated_at', { ascending: false });
    // Newest-first, so the first draft seen per item is the live one.
    for (const d of (drafts ?? []) as DraftRow[]) {
      if (d.work_item_id && !draftByItem.has(d.work_item_id)) {
        draftByItem.set(d.work_item_id, toDraftView(d));
      }
    }
  }

  const workItems = rows.map((w) =>
    toWorkItem(
      w,
      w.source_external_id ? lastByConv.get(w.source_external_id) : undefined,
      w.source_external_id ? unreadByConv.get(w.source_external_id) : undefined,
      draftByItem.get(w.id),
    ),
  );
  return { workItems, kpis: buildKpis(workItems), brief: buildBrief(workItems) };
}
