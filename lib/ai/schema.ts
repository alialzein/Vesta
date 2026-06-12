/**
 * Phase 7 — the analysis JSON contract + a defensive parser.
 *
 * We ask the model for a small JSON object and validate/coerce it here, so a
 * malformed or partial response never breaks the dashboard — worst case we fall
 * back to safe defaults. Output is user-visible only (no chain-of-thought).
 */
import { AI_CATEGORIES, type AiAnalysis, type AiCategory } from './types';

// v2: prompt gains today's date + a compact both-direction conversation block.
// v3: prompt gains the manager's memory — standing notes (VIPs, delegation
//     rules, hard limits, context) + a sender-is-VIP signal (Phase 10).
// v4: deadline gains an optional TIME (deadlineTime) — a "meet at 3 PM" thread
//     was due-stamped 9 AM and showed Overdue all morning.
// v5: relative deadline words resolve against the MESSAGE's date (thread lines
//     now carry dates) — "today or tomorrow?" asked on Jun 9 was returning no
//     deadline at all instead of an overdue Jun 10.
export const PROMPT_VERSION = 'v5';

/** The shape we ask the model to return (embedded in the prompt). */
export const ANALYSIS_JSON_HINT = `{
  "summary": "1-2 plain sentences: what this thread is about and what's needed",
  "category": ${AI_CATEGORIES.map((c) => `"${c}"`).join(' | ')},
  "priority": 0-100 integer (how urgently the manager must act),
  "deadline": "YYYY-MM-DD" or null (only if a due date is stated or clearly implied),
  "deadlineTime": "HH:MM" 24-hour or null (only if the thread states a specific time, e.g. "3:00 PM" -> "15:00"; never guess one),
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

function asDeadlineTime(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
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
  const deadline = asDeadline(obj.deadline);
  return {
    summary: summary || 'Open item from your mailbox.',
    category: asCategory(obj.category),
    priority: clampPriority(obj.priority),
    deadline,
    // A time without a date is meaningless — only keep it alongside a date.
    deadlineTime: deadline ? asDeadlineTime(obj.deadlineTime) : null,
    nextAction: nextAction || 'Review the thread and reply.',
    reason: reason || summary || 'Needs your attention.',
  };
}
