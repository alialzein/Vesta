/**
 * Dashboard view types for Phase 0.
 *
 * These intentionally mirror a subset of the planned V1 schema
 * (see docs/database/schema-v1.md) so that Phase 0 demo data can be
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
  | 'fyi';

/** Priority bucket drives the colored score chip (red/amber/green). */
export type PriorityBand = 'red' | 'amber' | 'green';

export type Chip = {
  label: string;
  tone: 'red' | 'amber' | 'blue' | 'neutral';
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
  /** Short, user-facing line shown under the title. */
  summary: string;
  /** 0–100, mirrors work_items.priority_score. */
  priorityScore: number;
  chips: Chip[];
  /** Human-readable due label, e.g. "Due today". Mirrors a formatted due_at. */
  dueLabel: string;
  /** Optional secondary due detail, e.g. "4:00 PM". */
  dueDetail?: string;
  /** User-visible AI reasoning. Mirrors ai_analyses.user_visible_reason. */
  urgencyReason: string;
  /** Suggested draft reply text. Mirrors draft_replies.ai_generated_body. */
  suggestedDraft: string;
  /** Risk chips shown in the AI Analysis panel. */
  riskChips: Chip[];
};

/** Top KPI metric card. Each card filters Today's Radar when clicked (later). */
export type KpiMetric = {
  id: string;
  value: number;
  label: string;
  /** Category this card maps onto for future click-to-filter behavior. */
  filter: WorkItemCategory | 'drafts';
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
  body: string;
  /** Highest urgency score in the queue — drives the ring. */
  topUrgencyScore: number;
};

/** A single chat message in the assistant panel (mock only in Phase 0). */
export type ChatMessage = {
  id: string;
  author: 'ai' | 'user';
  html: string;
};
