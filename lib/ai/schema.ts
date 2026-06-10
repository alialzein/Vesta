/**
 * Phase 7 — the analysis JSON contract + a defensive parser.
 *
 * We ask the model for a small JSON object and validate/coerce it here, so a
 * malformed or partial response never breaks the dashboard — worst case we fall
 * back to safe defaults. Output is user-visible only (no chain-of-thought).
 */
import { AI_CATEGORIES, type AiAnalysis, type AiCategory } from './types';

// v2: prompt gains today's date + a compact both-direction conversation block.
export const PROMPT_VERSION = 'v2';

/** The shape we ask the model to return (embedded in the prompt). */
export const ANALYSIS_JSON_HINT = `{
  "summary": "1-2 plain sentences: what this thread is about and what's needed",
  "category": ${AI_CATEGORIES.map((c) => `"${c}"`).join(' | ')},
  "priority": 0-100 integer (how urgently the manager must act),
  "deadline": "YYYY-MM-DD" or null (only if a due date is stated or clearly implied),
  "nextAction": "one concrete next step for the manager",
  "reason": "one sentence: why this matters to the manager"
}`;

function clampPriority(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function asCategory(v: unknown): AiCategory {
  return AI_CATEGORIES.includes(v as AiCategory) ? (v as AiCategory) : 'followup';
}

function asDeadline(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

/** Pull the first JSON object out of model text (handles code fences / preamble). */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object in model output');
  }
  return body.slice(start, end + 1);
}

/** Parse + validate the model's raw text into an AiAnalysis. Throws if unusable. */
export function parseAnalysis(raw: string): AiAnalysis {
  const obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const summary = String(obj.summary ?? '').trim();
  const nextAction = String(obj.nextAction ?? '').trim();
  const reason = String(obj.reason ?? '').trim();
  if (!summary && !nextAction && !reason) throw new Error('Empty analysis');
  return {
    summary: summary || 'Open item from your mailbox.',
    category: asCategory(obj.category),
    priority: clampPriority(obj.priority),
    deadline: asDeadline(obj.deadline),
    nextAction: nextAction || 'Review the thread and reply.',
    reason: reason || summary || 'Needs your attention.',
  };
}
