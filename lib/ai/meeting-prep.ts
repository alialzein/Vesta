/**
 * Meeting Prep (Phase 12, v1) — the REAL version of the old demo drawer.
 * Before a meeting, Vesta reads what it already knows about the attendees
 * (their recent email threads + the open radar items tied to them) and writes
 * a one-page prep: what's live with these people, what's still open, and the
 * questions worth asking.
 *
 * Pure prompt + defensive parser (no I/O) — the server action does the
 * calling. Grounding contract: the model may use ONLY the context given here;
 * with no email context it must say so instead of inventing history.
 */
import { extractJson } from './schema';

export const MEETING_PREP_PROMPT_VERSION = 'meeting-prep-v1';

export type PrepThread = {
  subject: string;
  /** Sender display ("Maya Khoury <maya@x.com>"). */
  from: string;
  /** Manager-local date of the latest message, YYYY-MM-DD. */
  date: string;
  preview: string;
};

export type PrepOpenItem = {
  title: string;
  category: string | null;
  due: string | null;
};

export type MeetingPrep = {
  /** What's live with these people — max 5 short bullets. */
  keyPoints: string[];
  /** Unresolved things to settle in (or before) the meeting — max 4. */
  openItems: string[];
  /** Questions worth asking — max 4. */
  questions: string[];
};

const MAX_POINTS = 5;
const MAX_OPEN = 4;
const MAX_QUESTIONS = 4;
const LINE_CAP = 200;

export const MEETING_PREP_JSON_HINT = `{
  "keyPoints": ["max ${MAX_POINTS} short bullets: what is live with these people right now"],
  "openItems": ["max ${MAX_OPEN}: unresolved asks/decisions to settle in this meeting"],
  "questions": ["max ${MAX_QUESTIONS}: sharp questions the manager should ask"]
}`;

export function buildMeetingPrepPrompt(input: {
  subject: string;
  /** "Friday, June 13, 3:00 PM" in the manager's zone. */
  whenLocal: string;
  organizer: string | null;
  attendees: string[];
  threads: PrepThread[];
  openItems: PrepOpenItem[];
  today: string;
}): { system: string; user: string } {
  const system = [
    "You are Vesta, a busy manager's chief of staff, prepping them for ONE meeting.",
    'Return ONLY a JSON object — no prose, no code fences.',
    'Rules:',
    '- Use ONLY the email threads and open items given below. NEVER invent people, promises, numbers, or history.',
    '- Be concrete and short: each bullet is one plain sentence the manager can scan in seconds. Name who said what.',
    '- openItems = things still unresolved with these attendees that this meeting could settle.',
    '- questions = sharp, specific questions grounded in the context (never generic filler like "what are the next steps?").',
    '- If there is NO email context, say exactly that in one keyPoints bullet ("No recent email history with these attendees.") and keep the other arrays empty — an honest blank beats invented prep.',
    `Return exactly this shape:\n${MEETING_PREP_JSON_HINT}`,
  ].join('\n');

  const threadLines = input.threads.map(
    (t) => `- [${t.date}] ${t.from} — ${JSON.stringify(t.subject)}: ${t.preview}`,
  );
  const itemLines = input.openItems.map(
    (i) =>
      `- ${JSON.stringify(i.title)}${i.category ? ` (${i.category})` : ''}${i.due ? ` — due ${i.due}` : ''}`,
  );

  const user = [
    `Today: ${input.today}`,
    `Meeting: ${JSON.stringify(input.subject)} — ${input.whenLocal}`,
    input.organizer ? `Organizer: ${input.organizer}` : null,
    `Attendees: ${input.attendees.join(', ') || '(none listed)'}`,
    '',
    threadLines.length > 0
      ? `Recent email threads with these attendees (newest first):\n${threadLines.join('\n')}`
      : 'Recent email threads with these attendees: none.',
    '',
    itemLines.length > 0
      ? `Open radar items tied to these people:\n${itemLines.join('\n')}`
      : 'Open radar items tied to these people: none.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { system, user };
}

function asLines(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, max)
    .map((s) => (s.length > LINE_CAP ? `${s.slice(0, LINE_CAP - 1)}…` : s));
}

/** Parse + clamp the model's reply. Throws only when there's no JSON at all
 *  or nothing usable — the caller then shows an honest error. */
export function parseMeetingPrep(raw: string): MeetingPrep {
  const obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const prep: MeetingPrep = {
    keyPoints: asLines(obj.keyPoints, MAX_POINTS),
    openItems: asLines(obj.openItems, MAX_OPEN),
    questions: asLines(obj.questions, MAX_QUESTIONS),
  };
  if (prep.keyPoints.length + prep.openItems.length + prep.questions.length === 0) {
    throw new Error('Prep came back empty');
  }
  return prep;
}
