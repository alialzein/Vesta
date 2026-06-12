/**
 * Phase 7 — AI analysis types (provider-agnostic).
 *
 * The analysis is intentionally small and structured so it maps cleanly onto the
 * existing work_items fields (summary / category / priority_score / suggested_action
 * / urgency_reason / due_at) and the ai_analyses record. No hidden chain-of-thought
 * is ever requested or stored — only user-visible reasoning.
 */

export const AI_CATEGORIES = [
  'waiting',
  'followup',
  'fyi',
  'decision',
  'delegate',
  'critical',
] as const;
export type AiCategory = (typeof AI_CATEGORIES)[number];

export type AiAnalysis = {
  /** 1–2 plain sentences: what this thread is about and what's needed. */
  summary: string;
  category: AiCategory;
  /** 0–100, how urgently the manager must act. */
  priority: number;
  /** Explicit/implied due date as YYYY-MM-DD, or null. */
  deadline: string | null;
  /** Due TIME as HH:MM (24h, manager-local) — only when the thread states one
   *  (e.g. "meet at 3:00 PM"); null = date-only, the store defaults to 9 AM. */
  deadlineTime: string | null;
  /** One concrete next step for the manager. */
  nextAction: string;
  /** One sentence, user-visible: why this matters. */
  reason: string;
};

export type AiUsage = { inputTokens: number; outputTokens: number };

export type AiRawResult = { content: string; usage: AiUsage };

/** A provider turns a system+user prompt into raw model text + token usage. */
export interface AiClient {
  readonly provider: string;
  readonly model: string;
  complete(input: { system: string; user: string }): Promise<AiRawResult>;
}
