/**
 * Phase 11 — the AI Daily Brief. Once per morning, the model reads the
 * manager's open queue and writes a short personal brief: a headline, two or
 * three honest sentences, and ONE item to start with (the "focus") plus the
 * reason. Pure prompt + parser (the server action does the calling/caching);
 * the deterministic brief remains the fallback, so this never has to exist
 * for the dashboard to work.
 */
import { extractJson } from './schema';

export const BRIEF_PROMPT_VERSION = 'brief-v2';

/** Compact, prompt-ready view of one open work item. */
export type BriefItem = {
  id: string;
  title: string;
  /** Who it's from (sender name), when known. */
  person?: string;
  category: string;
  /** 0–100 urgency score (the radar's ranking). */
  score: number;
  /** e.g. "Overdue (was due Jun 9)" or "Due tomorrow" — empty if none. */
  due?: string;
  overdue?: boolean;
  /** True when the latest message arrived in the last 24h. */
  fresh?: boolean;
  /** One-line summary of the thread/task. */
  summary?: string;
};

export type DailyBrief = {
  /** One short, specific headline (max ~12 words). */
  headline: string;
  /** 2–3 plain sentences. Honest, concrete, no hype. */
  body: string;
  /** The one item to start with — must be one of the given ids, or null. */
  focusItemId: string | null;
  /** One sentence: why start there. */
  focusReason: string | null;
};

export const BRIEF_JSON_HINT = `{
  "headline": "one short, specific headline (max 12 words)",
  "body": "2-3 plain sentences about the morning's queue",
  "focusItemId": "the id of the ONE item to start with, or null",
  "focusReason": "one sentence: why start there, or null"
}`;

export function buildBriefPrompt(input: {
  items: BriefItem[];
  /** Human-readable date, e.g. "Thursday, June 11, 2026". */
  today: string;
  managerName?: string;
}): { system: string; user: string } {
  const system = [
    "You are Vesta, a busy manager's chief of staff. Write their MORNING BRIEF from the open queue below.",
    'Return ONLY a JSON object — no prose, no code fences.',
    'Rules:',
    '- Be honest and concrete. Never invent items, deadlines, or senders; use only what is given.',
    '- The headline names the single most important thing (a person or an overdue deadline beats a count).',
    '- The body is 2-3 short sentences: what actually needs the manager today, what is overdue or about to be, and anything that can wait. Plain language, no emojis, no hype.',
    '- NEVER state queue-wide facts: no item counts ("two items in your queue"), no "nothing is overdue", no "neither has a due date". The app shows live numbers right next to your words, and the queue changes during the day — a stale claim destroys trust. Name specific people and specific items instead.',
    '- Pick exactly ONE focusItemId — the item to start with. Prefer: overdue > a person blocked waiting > highest score. Its focusReason is one plain sentence about THAT item (never about the rest of the queue).',
    '- If the queue is empty, say so plainly and set focusItemId/focusReason to null.',
    `Return exactly this shape:\n${BRIEF_JSON_HINT}`,
  ].join('\n');

  const lines = input.items.map((i) => {
    const parts = [
      `id=${i.id}`,
      `title=${JSON.stringify(i.title)}`,
      i.person ? `from=${JSON.stringify(i.person)}` : null,
      `category=${i.category}`,
      `score=${i.score}`,
      i.due ? `due=${JSON.stringify(i.due)}${i.overdue ? ' (OVERDUE)' : ''}` : null,
      i.fresh ? 'new-since-yesterday' : null,
      i.summary ? `summary=${JSON.stringify(i.summary.slice(0, 160))}` : null,
    ].filter(Boolean);
    return `- ${parts.join(' | ')}`;
  });

  const user = [
    `Today: ${input.today}`,
    input.managerName ? `Manager: ${input.managerName}` : null,
    `Open queue (${input.items.length} item${input.items.length === 1 ? '' : 's'}, ranked):`,
    ...lines,
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

/** Parse + coerce the model's raw text into a DailyBrief. A focusItemId that
 *  isn't in `validIds` is dropped (the model must not invent items). Throws
 *  only when there is no JSON at all — the caller then keeps the
 *  deterministic brief. */
export function parseBrief(raw: string, validIds: ReadonlySet<string>): DailyBrief {
  const obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const headline = String(obj.headline ?? '').trim();
  const body = String(obj.body ?? '').trim();
  if (!headline || !body) throw new Error('Brief is missing headline or body');

  let focusItemId: string | null = null;
  if (typeof obj.focusItemId === 'string' && validIds.has(obj.focusItemId)) {
    focusItemId = obj.focusItemId;
  }
  const focusReason =
    focusItemId && obj.focusReason ? String(obj.focusReason).trim() || null : null;

  return { headline, body, focusItemId, focusReason };
}
