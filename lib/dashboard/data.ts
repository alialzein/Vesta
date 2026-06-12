import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type {
  DraftView,
  ManagerMemory,
  MemoryRecord,
  MemoryType,
  MorningBrief,
  WorkItem,
  WorkItemCategory,
} from '@/lib/types';
import { encodeThreadId } from '@/lib/thread';
import { appliesTo, type MemoryRow as AiMemoryRow } from '@/lib/ai/memory';
import { toDraftView, ACTIVE_DRAFT_STATUSES, type DraftRow } from '@/lib/drafts/serialize';
import {
  CATEGORY_LABEL,
  chipsFor,
  cleanPreview,
  dueOf,
  escapeHtml,
  personFrom,
  senderDisplay,
} from '@/lib/dashboard/present';
import { isBriefStale, type BriefSections } from '@/lib/dashboard/brief-guard';
import { todayInTz } from '@/lib/time/zone';

/**
 * Real dashboard data (Phase 6-derived). Maps the manager's `work_items` (the
 * follow-up engine's "waiting on you" set, already triaged + addressing-gated)
 * into the Today dashboard shapes — Today's Radar rows and a heuristic Morning
 * Brief (slice counts render inside the radar's filter chips). The rail's
 * draft/memory/next-action fields are filled by the Phase 7+ AI pipeline.
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

/** Latest inbound sender of a thread (email_messages.sender_name/sender_email). */
type SenderInfo = { name: string | null; email: string | null };

function toWorkItem(
  w: WorkItemRow,
  lastActivityAt?: string,
  unread?: boolean,
  draft?: DraftView,
  sender?: SenderInfo,
  memoryUsed: ManagerMemory[] = [],
  timezone?: string,
): WorkItem {
  const category = (w.category ?? 'fyi') as WorkItemCategory;
  const score = w.priority_score ?? 0;
  // Real sender first; the AI-parsed name is only a fallback (manual items, or
  // threads whose messages haven't synced) — it used to show "She"/"The manager".
  const person =
    senderDisplay(sender?.name, sender?.email) ?? personFrom(w.urgency_reason);
  const personEmail = sender?.email ?? undefined;
  // Due labels in the MANAGER's timezone — the server may run in UTC.
  const due = dueOf(w.due_at, category, timezone);
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
    personEmail,
    summary,
    priorityScore: score,
    chips: chipsFor(category),
    dueLabel: due.label,
    dueDetail: due.detail,
    overdue: due.overdue,
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
    riskChips: chipsFor(category),
    memoryUsed,
    activity: [
      { label: 'Priority', value: `${score}/100` },
      { label: 'Category', value: CATEGORY_LABEL[category] ?? category },
      { label: 'Source', value: 'Outlook' },
      ...(w.due_at
        ? [
            {
              label: 'Due',
              value: due.overdue ? `Overdue (${due.detail})` : due.label.replace(/^Due /, ''),
            },
          ]
        : []),
    ],
    canDraft,
    draft,
  };
}

// The KPI strip is gone (2026-06-12 declutter pass): its counts now live
// inside the radar's filter chips, computed in TodaysRadar from the same
// items — one source, one surface, no second row of numbers.

function buildBrief(items: WorkItem[]): MorningBrief {
  if (items.length === 0) {
    return {
      headline: "You're all clear.",
      body: 'Nothing is waiting on you right now. New items will appear as mail syncs.',
      summaryLine: 'No open items waiting on you.',
    };
  }
  const waiting = items.filter((i) => i.categories.includes('waiting')).length;
  const followup = items.filter((i) => i.categories.includes('followup')).length;
  const top = items[0];
  const headline = top.person
    ? `${top.person} is waiting on your reply.`
    : waiting > 0
      ? `${waiting} of ${items.length} ${waiting === 1 ? 'needs' : 'need'} you today.`
      : `${items.length} ${items.length === 1 ? 'item' : 'items'} in your queue.`;
  return {
    headline,
    body: `You have <b>${items.length}</b> open ${items.length === 1 ? 'item' : 'items'}: <b>${waiting}</b> waiting on you and <b>${followup}</b> with follow-ups. The top one is <b>${escapeHtml(top.title)}</b>.`,
    summaryLine: `${waiting} waiting · ${followup} follow-up${followup === 1 ? '' : 's'} · Top: ${top.title}`,
  };
}

export type DashboardData = {
  workItems: WorkItem[];
  brief: MorningBrief;
  /** The manager's Memory & Rules rows (active + paused + pending suggestions). */
  memories: MemoryRecord[];
  /** The manager's IANA timezone (profiles.timezone; auto-detected, default UTC). */
  timezone: string;
};

/** Raw manager_memories slice the dashboard reads. */
type MemoryDbRow = AiMemoryRow & {
  source: string | null;
  metadata: unknown;
  created_at: string;
};

const MEMORY_COLS = 'id, memory_type, memory_text, scope, scope_ref, source, is_active, metadata, created_at';

function toMemoryRecord(r: MemoryDbRow): MemoryRecord {
  const status = (r.metadata as { status?: string } | null)?.status;
  return {
    id: r.id,
    type: r.memory_type as MemoryType,
    text: r.memory_text,
    scopeEmail: r.scope === 'person' ? (r.scope_ref ?? null) : null,
    source: r.source ?? 'manual',
    isActive: r.is_active,
    // Pending = a suggestion that was parked inactive awaiting approval.
    // (Paused-by-the-manager rows are inactive too, but never status='pending'.)
    pending: !r.is_active && status === 'pending',
    createdAt: r.created_at,
  };
}

/** The active memories that apply to this sender — the rail's "memory used". */
function memoryUsedFor(rows: MemoryDbRow[], sender?: SenderInfo): ManagerMemory[] {
  return rows
    .filter((r) => r.is_active && appliesTo(r, { email: sender?.email, name: sender?.name }))
    .slice(0, 6)
    .map((r) => ({ id: r.id, type: r.memory_type as MemoryType, text: r.memory_text }));
}

/**
 * The signed-in manager's real Today dashboard data (RLS-scoped via the
 * authenticated client). Returns empty arrays + an "all clear" brief when there
 * is nothing open — the dashboard renders the empty state, not demo data.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createClient();
  const [{ data }, { data: tzProfile }] = await Promise.all([
    supabase
      .from('work_items')
      .select(WORK_ITEM_COLS)
      // Open items, plus snoozed ones whose snooze time has passed (those come back
      // to the radar on their own — see the due filter below).
      .in('status', ['open', 'snoozed'])
      .order('priority_score', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(50),
    // The manager's timezone drives "today" for the daily brief cache.
    supabase.from('profiles').select('timezone').limit(1).maybeSingle(),
  ]);
  const timezone = tzProfile?.timezone ?? 'UTC';
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
  // Who the thread is from — the latest inbound message's real sender (the same
  // query also feeds the unread dot, so this costs zero extra round-trips).
  const senderByConv = new Map<string, { name: string | null; email: string | null }>();
  if (convIds.length > 0) {
    const [{ data: threads }, { data: inbound }] = await Promise.all([
      supabase
        .from('email_threads')
        .select('graph_conversation_id, latest_inbound_at, latest_message_at')
        .in('graph_conversation_id', convIds),
      supabase
        .from('email_messages')
        .select('graph_conversation_id, is_read, received_at, sender_name, sender_email')
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
    // inbound message — its read state and sender are the ones that matter.
    for (const m of inbound ?? []) {
      if (m.graph_conversation_id && !unreadByConv.has(m.graph_conversation_id)) {
        unreadByConv.set(m.graph_conversation_id, m.is_read === false);
        senderByConv.set(m.graph_conversation_id, {
          name: m.sender_name,
          email: m.sender_email,
        });
      }
    }
  }

  // Any already-generated/edited draft replies for these items, so the rail can
  // show "draft ready" and the composer reopens with the saved text. The same
  // round also loads Memory & Rules (Phase 10) — the workspace list plus each
  // item's "memory used" in the rail.
  const itemIds = rows.map((r) => r.id);
  const draftByItem = new Map<string, DraftView>();
  const [draftsRes, memoriesRes, briefRes] = await Promise.all([
    itemIds.length > 0
      ? supabase
          .from('draft_replies')
          .select('*')
          .in('work_item_id', itemIds)
          .in('status', [...ACTIVE_DRAFT_STATUSES])
          .order('updated_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('manager_memories')
      .select(MEMORY_COLS)
      .order('created_at', { ascending: false })
      .limit(200),
    // Phase 11 — today's cached AI brief (generated once per day by
    // generateDailyBrief; absent on the first load of the morning). "Today"
    // is the manager's calendar date, so the brief rolls over at their
    // midnight, not UTC's.
    supabase
      .from('daily_briefs')
      .select('title, summary, sections')
      .eq('brief_date', todayInTz(timezone))
      .maybeSingle(),
  ]);
  // Newest-first, so the first draft seen per item is the live one.
  for (const d of ((draftsRes.data ?? []) as DraftRow[])) {
    if (d.work_item_id && !draftByItem.has(d.work_item_id)) {
      draftByItem.set(d.work_item_id, toDraftView(d));
    }
  }
  const memoryRows = (memoriesRes.data ?? []) as MemoryDbRow[];

  const workItems = rows.map((w) => {
    const sender = w.source_external_id ? senderByConv.get(w.source_external_id) : undefined;
    return toWorkItem(
      w,
      w.source_external_id ? lastByConv.get(w.source_external_id) : undefined,
      w.source_external_id ? unreadByConv.get(w.source_external_id) : undefined,
      draftByItem.get(w.id),
      sender,
      memoryUsedFor(memoryRows, sender),
      timezone,
    );
  });

  // Overlay today's cached AI brief onto the deterministic one (counts stay
  // live in the UI; the AI supplies the narrative + the focus pick) — but ONLY
  // when the cached narrative still matches the live queue. A brief written
  // before something became overdue (or whose focus pick is gone) is a lie;
  // the deterministic brief stays and the dashboard regenerates once.
  const brief = buildBrief(workItems);
  const aiBrief = briefRes.data;
  if (aiBrief?.title && aiBrief.summary && workItems.length > 0) {
    const sections = (aiBrief.sections as BriefSections | null) ?? {};
    if (isBriefStale(sections, workItems)) {
      brief.stale = true;
    } else {
      // The focus pick only survives while that item is still on the radar
      // (the guard already checks this; kept as defense in depth).
      const focusItemId =
        sections.focus_item_id && workItems.some((w) => w.id === sections.focus_item_id)
          ? sections.focus_item_id
          : null;
      brief.headline = aiBrief.title;
      brief.summaryLine = aiBrief.summary;
      brief.aiGenerated = true;
      brief.focusItemId = focusItemId;
      brief.focusReason = focusItemId ? (sections.focus_reason ?? null) : null;
    }
  }

  return {
    workItems,
    brief,
    memories: memoryRows.map(toMemoryRecord),
    timezone,
  };
}
