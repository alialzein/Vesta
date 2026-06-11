/**
 * Ask Vesta chat — prompt building + defensive parsing (pure, no I/O).
 *
 * The design goal: the manager is "talking to himself" — Vesta answers from
 * everything it already knows about THIS manager (standing memories, rules,
 * today's real workload, today's briefing) and LEARNS from every exchange.
 *
 * Learning contract: alongside its reply the model proposes `remember`
 * entries — durable facts worth keeping. Each is validated here and saved by
 * the action into the EXISTING manager_memories table (source='chat'), so
 * everything Vesta learns is visible — and deletable — in Memory & Rules.
 * The model never writes memory directly; this parser is the gate.
 */
import { extractJson } from './schema';

export const CHAT_PROMPT_VERSION = 'chat-v1';

/** Memory types the chat may write — exactly the manager_memories vocabulary. */
export const CHAT_MEMORY_TYPES = [
  'vip',
  'tone',
  'delegation_rule',
  'do_not_do',
  'project_context',
  'company_context',
  'preference',
  'personal',
] as const;
export type ChatMemoryType = (typeof CHAT_MEMORY_TYPES)[number];

export type ChatMemoryProposal = { type: ChatMemoryType; text: string };

export type ParsedChatReply = {
  reply: string;
  remember: ChatMemoryProposal[];
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type ChatWorkLine = {
  title: string;
  category: string | null;
  priority: number;
  dueAt: string | null;
  summary: string | null;
  /** The user-visible urgency reason (names who is waiting and why). */
  reason: string | null;
  suggestedAction: string | null;
};

export type ChatContext = {
  managerName: string | null;
  role: string | null;
  timezone: string;
  /** Local "now" in the manager's timezone, long form (weekday + date + time). */
  now: string;
  /** Active standing memories (what Vesta already knows). */
  memories: { type: string; text: string }[];
  /** Enabled deterministic rules (names + descriptions). */
  rules: { name: string; description: string | null }[];
  workCounts: { open: number; waiting: number; drafts: number };
  /** Top open items by priority (compact lines). */
  workItems: ChatWorkLine[];
  /** Today's personal-briefing headlines, when built. */
  briefingHeadlines: string[];
  /** Today's daily inbox brief summary, when built. */
  dailyBrief: string | null;
};

const CHAT_JSON_HINT = `{
  "reply": "your answer to the manager, plain conversational text",
  "remember": [
    { "type": "personal" | "preference" | "vip" | "tone" | "delegation_rule" | "do_not_do" | "project_context" | "company_context", "text": "one durable fact, written so it is useful months from now" }
  ]
}`;

const HISTORY_CAP = 20; // turns sent back to the model
const TURN_CHAR_CAP = 1200; // chars per history turn
const MEMORY_LINE_CAP = 220;
const MAX_REMEMBER = 3;
const REMEMBER_TEXT_CAP = 300;

function cap(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function buildChatPrompt(input: {
  context: ChatContext;
  history: ChatTurn[];
  message: string;
}): { system: string; user: string } {
  const { context: ctx } = input;
  const name = ctx.managerName?.trim() || 'the manager';

  const system = [
    `You are Vesta — ${name}'s chief of staff and second brain. ${name} talks to you the way they would think out loud to themselves: you know their world and you remember what matters.`,
    'Return ONLY a JSON object — no prose outside it, no code fences.',
    '',
    'How to answer (the "reply" field):',
    '- Be warm, sharp, and direct. Short answers for short questions. Never flattering filler.',
    `- Ground every claim in the context below (memories, rules, today's workload, today's briefing). Never invent emails, people, numbers, or news.`,
    '- If asked about something not in the context, say so plainly and point to where in Vesta it lives (Inbox, Waiting on Me, Draft Replies, Briefing, Memory & Rules).',
    '- You cannot send email or change items from this chat yet. When asked to act, give the next step in the app instead (e.g. open the item and use Draft reply).',
    `- All time reasoning uses the manager's local time (given below). Be explicit about dates when deadlines are involved.`,
    '- Plain conversational text: short paragraphs, hyphen bullets when listing. No markdown headers, no asterisks, no emoji.',
    '',
    'How to learn (the "remember" field) — this is what makes you THEIR Vesta:',
    `- After answering, extract durable facts from what ${name} just said — things a great chief of staff would note down: people and how to treat them (vip), standing preferences and working style (preference, tone), projects and companies (project_context, company_context), delegation habits (delegation_rule), hard limits (do_not_do), and personal context like family, health, dates that matter (personal).`,
    '- Write each fact so it is useful months from now (name the person/project; no "this"/"that").',
    `- Do NOT remember: one-off tasks, anything already in the standing memories below, things you said yourself, passwords/secrets, or chit-chat. Most turns deserve an empty list — quality over quantity (max ${MAX_REMEMBER}).`,
    '- When you do record something, acknowledge it naturally in one short clause of the reply (e.g. "Noted — I\'ll keep that in mind.").',
    '',
    `Return exactly this shape:\n${CHAT_JSON_HINT}`,
  ].join('\n');

  const memoryBlock =
    ctx.memories.length > 0
      ? [
          `What you already know about ${name} (standing memories — do not re-remember these):`,
          ...ctx.memories.slice(0, 40).map((m) => `- [${m.type}] ${cap(m.text, MEMORY_LINE_CAP)}`),
        ].join('\n')
      : `You have no standing memories about ${name} yet — pay extra attention to facts worth remembering.`;

  const rulesBlock =
    ctx.rules.length > 0
      ? [
          'Their standing rules:',
          ...ctx.rules.slice(0, 10).map((r) => `- ${r.name}${r.description ? `: ${cap(r.description, 160)}` : ''}`),
        ].join('\n')
      : '';

  const workLines = ctx.workItems.slice(0, 15).map((w) => {
    const bits = [
      `"${cap(w.title, 90)}"`,
      w.category ? `[${w.category}]` : null,
      `priority ${w.priority}`,
      w.dueAt ? `due ${w.dueAt}` : null,
      w.summary ? cap(w.summary, 140) : null,
      w.reason ? cap(w.reason, 100) : null,
      w.suggestedAction ? `next: ${cap(w.suggestedAction, 100)}` : null,
    ].filter(Boolean);
    return `- ${bits.join(' | ')}`;
  });
  const workBlock = [
    `Today's workload: ${ctx.workCounts.open} open items, ${ctx.workCounts.waiting} waiting on ${name}, ${ctx.workCounts.drafts} drafts pending review.`,
    ...(workLines.length > 0 ? ['Top open items:', ...workLines] : []),
  ].join('\n');

  const briefingBlock =
    ctx.briefingHeadlines.length > 0
      ? ['Today\'s personal briefing headlines (world news picked for them):', ...ctx.briefingHeadlines.slice(0, 8).map((h) => `- ${cap(h, 120)}`)].join('\n')
      : '';

  const historyBlock =
    input.history.length > 0
      ? [
          'Conversation so far:',
          ...input.history
            .slice(-HISTORY_CAP)
            .map((t) => `${t.role === 'user' ? name : 'Vesta'}: ${cap(t.content, TURN_CHAR_CAP)}`),
        ].join('\n')
      : '';

  const user = [
    `Manager: ${name}${ctx.role ? ` — ${ctx.role}` : ''}`,
    `Local time now: ${ctx.now} (${ctx.timezone})`,
    memoryBlock,
    rulesBlock,
    workBlock,
    ctx.dailyBrief ? `Today's inbox brief: ${cap(ctx.dailyBrief, 500)}` : '',
    briefingBlock,
    historyBlock,
    `${name} says:`,
    input.message,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

/** Parse + validate the model's chat turn. Bad `remember` entries are dropped
 *  silently (learning is best-effort); a missing/empty reply throws. */
export function parseChatReply(raw: string): ParsedChatReply {
  const obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const reply = String(obj.reply ?? '').trim();
  if (!reply) throw new Error('Chat reply was empty');

  const remember: ChatMemoryProposal[] = [];
  const seen = new Set<string>();
  if (Array.isArray(obj.remember)) {
    for (const it of obj.remember as Record<string, unknown>[]) {
      if (remember.length >= MAX_REMEMBER) break;
      const type = String(it?.type ?? '').trim() as ChatMemoryType;
      const text = cap(String(it?.text ?? ''), REMEMBER_TEXT_CAP);
      if (!CHAT_MEMORY_TYPES.includes(type)) continue;
      if (text.length < 8) continue; // too short to be a durable fact
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      remember.push({ type, text });
    }
  }
  return { reply, remember };
}

/** A conversation title from the first message (used by the action + UI). */
export function titleFromMessage(message: string): string {
  const t = message.replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 59)}…` : t || 'New conversation';
}

/** Case-insensitive near-duplicate check against existing memory texts, so the
 *  same fact told twice doesn't pile up in Memory & Rules. */
export function isDuplicateMemory(text: string, existing: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const t = norm(text);
  if (!t) return true;
  return existing.some((e) => {
    const x = norm(e);
    return x === t || x.includes(t) || t.includes(x);
  });
}
