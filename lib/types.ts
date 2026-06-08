/**
 * Dashboard view types for Phase 0.
 *
 * These intentionally mirror a subset of the planned V1 schema
 * (see docs/reference/database/schema-v1.md) so that Phase 0 demo data can be
 * replaced by real Supabase rows later with minimal reshaping.
 *
 * No data is fetched here. These are UI-facing shapes only.
 */

/** Mirrors work_items.source. */
export type WorkItemSource = 'outlook' | 'teams' | 'manual' | 'ai_commitment' | 'calendar';

/** Mirrors work_items.category — the Today's Radar filter dimension. */
export type WorkItemCategory =
  | 'critical'
  | 'waiting'
  | 'followup'
  | 'delegate'
  | 'decision'
  | 'promise'
  | 'drafts'
  | 'fyi';

/** Priority bucket drives the colored score chip (red/amber/green). */
export type PriorityBand = 'red' | 'amber' | 'green';

export type Chip = {
  label: string;
  tone: 'red' | 'amber' | 'blue' | 'neutral';
};

/** A short activity fact shown in the rail's Activity tab. */
export type WorkItemActivity = {
  /** e.g. "Follow-ups", "Last manager reply", "Due", "Reminder". */
  label: string;
  value: string;
};

/**
 * A single Today's Radar row. Mirrors the key columns the dashboard reads
 * from work_items (+ a joined AI analysis summary).
 */
export type WorkItem = {
  id: string;
  title: string;
  /** Which filter tabs this item belongs to. Maps onto work_items.category. */
  categories: WorkItemCategory[];
  source: WorkItemSource;
  /** Encoded conversation id for the /thread/[id] view, when this item maps to an
   * Outlook conversation (work_items.source_external_id). */
  threadId?: string;
  /** ISO time of the latest message in the thread (shown in the viewer's tz). */
  lastActivityAt?: string;
  /** Person this item is from / about (sender or counterpart), when known. */
  person?: string;
  /** Short, user-facing line shown under the title. */
  summary: string;
  /** Short suggested next action shown on the radar row, when available. */
  suggestedAction?: string;
  /** 0–100, mirrors work_items.priority_score. */
  priorityScore: number;
  chips: Chip[];
  /** Human-readable due label, e.g. "Due today". Mirrors a formatted due_at. */
  dueLabel: string;
  /** Optional secondary due detail, e.g. "4:00 PM". */
  dueDetail?: string;
  /** User-visible AI reasoning. Mirrors ai_analyses.user_visible_reason. */
  urgencyReason: string;
  /** One-line recommended next step shown in the rail's Action tab. */
  nextBestAction: string;
  /** Suggested draft reply text. Mirrors draft_replies.ai_generated_body. */
  suggestedDraft: string;
  /** Risk chips shown in the AI Analysis panel. */
  riskChips: Chip[];
  /** Manager memories/rules the AI applied to this item (Memory tab). */
  memoryUsed: ManagerMemory[];
  /** Recent thread/activity facts (Activity tab). */
  activity: WorkItemActivity[];
};

/** A single AI Command Center card (Clear My Day, Meeting Prep, …). */
export type CommandCard = {
  id: string;
  title: string;
  description: string;
  /** CTA button label. */
  cta: string;
  /** Icon shown in the card's visual badge. */
  icon: CommandIcon;
  /** Which soft gradient to use (1–4), mapped to CSS vars in globals.css. */
  accent: 1 | 2 | 3 | 4;
};

/** Icon keys allowed for command cards (subset of the icon set). */
export type CommandIcon = 'sparkle' | 'calendar' | 'delegate' | 'inbox';

/** Top KPI metric card. Each card filters Today's Radar when clicked (later). */
export type KpiMetric = {
  id: string;
  value: number;
  /** Optional unit shown after the value, e.g. "h" for Time to Clear. */
  unit?: string;
  label: string;
  /** Small line under the number, e.g. "2 overdue". */
  helper: string;
  /** Drives the icon container accent color. */
  tone: 'red' | 'amber' | 'blue' | 'green';
  /** Category this card maps onto for future click-to-filter behavior. */
  filter: WorkItemCategory;
};

/** Mirrors manager_memories.memory_type. */
export type MemoryType =
  | 'vip'
  | 'tone'
  | 'delegation_rule'
  | 'do_not_do'
  | 'project_context'
  | 'company_context'
  | 'preference';

/** Mirrors a row of manager_memories. */
export type ManagerMemory = {
  id: string;
  type: MemoryType;
  text: string;
};

/** Morning brief hero content. Later sourced from daily_briefs. */
export type MorningBrief = {
  headline: string;
  /** Long-form HTML body (kept for future/expanded views). */
  body: string;
  /** One concise plain-text line shown in the compact brief card. */
  summaryLine: string;
  /** Highest urgency score in the queue — shown as a compact "Top risk" chip. */
  topUrgencyScore: number;
};

/** Tabs in the Contextual AI Assistant Rail. */
export type RailTab = 'action' | 'draft' | 'memory' | 'activity';

/** A single chat message in the assistant panel (mock only in Phase 0). */
export type ChatMessage = {
  id: string;
  author: 'ai' | 'user';
  html: string;
};
