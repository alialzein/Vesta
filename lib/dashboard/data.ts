import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Chip, KpiMetric, MorningBrief, WorkItem, WorkItemCategory } from '@/lib/types';

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
};

const WORK_ITEM_COLS =
  'id, title, summary, category, priority_score, urgency_reason, suggested_action, due_at, source';

const CATEGORY_LABEL: Record<string, string> = {
  critical: 'Critical',
  waiting: 'Waiting on you',
  followup: 'Follow-up',
  delegate: 'Can delegate',
  decision: 'Decision',
  promise: 'Promise',
  fyi: 'FYI',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Pull the counterpart's name out of an urgency reason ("Maya is waiting…"). */
function personFrom(reason: string | null): string | undefined {
  const m = reason?.match(/^(.+?)\s+is waiting/i);
  return m?.[1]?.trim() || undefined;
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
  else chips.push({ label: CATEGORY_LABEL[category] ?? category, tone: 'blue' });
  if (score >= 80) chips.push({ label: 'High priority', tone: 'red' });
  return chips;
}

function toWorkItem(w: WorkItemRow): WorkItem {
  const category = (w.category ?? 'fyi') as WorkItemCategory;
  const score = w.priority_score ?? 0;
  const person = personFrom(w.urgency_reason);
  const due = dueOf(w.due_at, category);
  const summary = w.summary?.trim() || w.urgency_reason?.trim() || 'Open item from your mailbox.';

  return {
    id: w.id,
    title: w.title?.trim() || '(no subject)',
    categories: [category],
    source: (w.source as WorkItem['source']) ?? 'outlook',
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
        : 'Open the thread to review and respond.'),
    suggestedDraft: 'AI draft replies arrive in a later phase — open this thread in Outlook to reply.',
    riskChips: chipsFor(category, score),
    memoryUsed: [],
    activity: [
      { label: 'Priority', value: `${score}/100` },
      { label: 'Category', value: CATEGORY_LABEL[category] ?? category },
      { label: 'Source', value: 'Outlook' },
      ...(w.due_at ? [{ label: 'Due', value: due.label.replace(/^Due /, '') }] : []),
    ],
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
    .eq('status', 'open')
    .order('priority_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50);
  const workItems = ((data ?? []) as WorkItemRow[]).map(toWorkItem);
  return { workItems, kpis: buildKpis(workItems), brief: buildBrief(workItems) };
}
