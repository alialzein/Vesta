/**
 * Phase 8 — AI quick-capture ("✨ tell Vesta"). Turns a free-text note into a
 * structured task: a clean title, a kind (task / reminder / call / meeting), a due
 * time, and the other person if named. Server-only call; the caller always has the
 * deterministic parser as a fallback, so this never has to be perfect.
 */
import { extractJson } from './schema';

export const CAPTURE_KINDS = ['task', 'reminder', 'call', 'meeting'] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

export type Capture = {
  title: string;
  kind: CaptureKind;
  /** Resolved due time as ISO, or null. */
  dueAt: string | null;
  /** The other person, if the note names one. */
  person: string | null;
};

export const CAPTURE_JSON_HINT = `{
  "title": "short imperative title, typos cleaned up",
  "kind": "task" | "reminder" | "call" | "meeting",
  "dueAt": "ISO 8601 datetime (with offset) or null",
  "person": "the other person's name, or null"
}`;

/** `localNow` is the manager's local time string (carries their offset) so the model
 *  can resolve relative dates ("tomorrow 3pm", "Friday") in the right zone. */
export function buildCapturePrompt(text: string, localNow: string): { system: string; user: string } {
  const system = [
    "You are Vesta, a manager's assistant. Turn a short note into ONE structured task.",
    'Return ONLY a JSON object — no prose, no code fences.',
    'kind: "call" for a phone call, "meeting" for a meeting with others, "reminder" for a timed nudge, else "task".',
    'dueAt: resolve relative dates (today, tomorrow, Friday, next week, in 3 days) against the given current time, in the SAME timezone offset. A date with no time → 09:00 (evening words → 18:00). If no date/time is stated or implied, dueAt is null. Never invent a date.',
    'Clean obvious typos in the title (e.g. "tommorw" is just "tomorrow", not part of the title).',
    `Return exactly this shape:\n${CAPTURE_JSON_HINT}`,
  ].join('\n');

  const user = [`Current time: ${localNow}`, `Note: ${text}`].join('\n');
  return { system, user };
}

/** Parse + coerce the model's raw text into a Capture. Falls back per-field; throws
 *  only if there's no JSON at all (caller then uses the deterministic parser). */
export function parseCapture(raw: string, fallbackTitle: string): Capture {
  const obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const title = String(obj.title ?? '').trim() || fallbackTitle;
  const kind = (CAPTURE_KINDS as readonly string[]).includes(obj.kind as string)
    ? (obj.kind as CaptureKind)
    : 'task';
  let dueAt: string | null = null;
  if (typeof obj.dueAt === 'string') {
    const d = new Date(obj.dueAt);
    if (!Number.isNaN(d.getTime())) dueAt = d.toISOString();
  }
  const person = obj.person ? String(obj.person).trim() || null : null;
  return { title, kind, dueAt, person };
}
