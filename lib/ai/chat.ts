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

export const CHAT_PROMPT_VERSION = 'chat-v4';

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

/**
 * Chat orders (Phases A+B) — the model may PROPOSE one action per turn; it
 * never executes. Items are referenced by index into the work list it was
 * given (the briefing's anti-hallucination trick), local times as
 * "YYYY-MM-DD HH:mm" in the manager's timezone. Everything is validated here
 * and re-validated server-side; the manager confirms with a tap.
 */
export type ChatActionProposal =
  | { kind: 'mark_done'; itemIndex: number }
  | { kind: 'snooze'; itemIndex: number; untilLocal: string }
  | { kind: 'create_task'; title: string; dueLocal: string | null }
  | { kind: 'draft_reply'; itemIndex: number; instruction: string }
  | {
      kind: 'create_reminder';
      /** Tie the reminder to an open item (null = standalone subject). */
      itemIndex: number | null;
      /** What the reminder email is about. */
      subject: string;
      /** Recipient; null = the manager himself. */
      toEmail: string | null;
      firstAtLocal: string;
      /** null = one-shot; minutes between sends otherwise (min 15). */
      repeatMinutes: number | null;
      /** Total sends, 1–10 ("hourly, 3 times" → 3). */
      count: number;
    };

export type ParsedChatReply = {
  reply: string;
  remember: ChatMemoryProposal[];
  action: ChatActionProposal | null;
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
  ],
  "action": null | { "kind": "mark_done", "itemIndex": 0 }
          | { "kind": "snooze", "itemIndex": 0, "untilLocal": "YYYY-MM-DD HH:mm" }
          | { "kind": "create_task", "title": "...", "dueLocal": "YYYY-MM-DD HH:mm" | null }
          | { "kind": "draft_reply", "itemIndex": 0, "instruction": "what the reply should say" }
          | { "kind": "create_reminder", "itemIndex": 0 | null, "subject": "what it is about", "toEmail": "a@b.com" | null, "firstAtLocal": "YYYY-MM-DD HH:mm", "repeatMinutes": 60 | null, "count": 1 }
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
    `- All time reasoning uses the manager's local time (given below). Be explicit about dates when deadlines are involved.`,
    '- Plain conversational text: short paragraphs, hyphen bullets when listing. No markdown headers, no asterisks, no emoji.',
    '',
    'How to act (the "action" field) — orders the manager gives you:',
    `- When ${name} clearly tells you to DO one of these, propose it: mark an item done (mark_done), snooze an item until a time (snooze), create a task on the radar (create_task), draft a reply on an item (draft_reply — the draft will wait for their approval, you never send), or schedule an EMAIL reminder (create_reminder — e.g. "email me about this thread at 3pm, every hour, 3 times": firstAtLocal=the 3pm slot, repeatMinutes=60, count=3; toEmail null means the manager himself; never invent another person's email — use one only when ${name} typed it).`,
    '- "Remind me to X tomorrow 3pm" alone = create_task (a radar item). Use create_reminder only when they clearly want an EMAIL (they say email/send/inbox or a repeat pattern).',
    '- You only PROPOSE: the manager confirms with a tap before anything happens. Your reply should state what you are proposing in one short sentence.',
    '- Reference items ONLY by their [index] from the open-items list below. If you cannot tell which item they mean, or a time/date is missing, ask in the reply and set action to null.',
    `- Times are the manager's LOCAL time as "YYYY-MM-DD HH:mm" (24h). Resolve words like "tomorrow 3pm" or "Monday morning" (morning=09:00, noon=12:00, afternoon=15:00, evening=18:00) from the local time given below.`,
    '- One action per turn, only when explicitly ordered. Questions, opinions, and "should I…?" are NOT orders — answer them with action null.',
    '- You cannot send regular email or schedule meetings yet (coming soon). For those, say so honestly and point to the right screen.',
    '',
    'How to learn (the "remember" field) — this is what makes you THEIR Vesta:',
    `- After answering, extract durable facts from what ${name} just said — things a great chief of staff would note down: people and how to treat them (vip), standing preferences and working style (preference, tone), projects and companies (project_context, company_context), delegation habits (delegation_rule), hard limits (do_not_do), and personal context like family, health, dates that matter (personal).`,
    '- Write each fact so it is useful months from now (name the person/project; no "this"/"that").',
    `- Do NOT remember: one-off tasks, anything already in the standing memories below, things you said yourself, passwords/secrets, or chit-chat. Most turns deserve an empty list — quality over quantity (max ${MAX_REMEMBER}).`,
    '- Acknowledge ONLY when "remember" is non-empty, in one short clause woven into the answer (e.g. "Noted."). When "remember" is empty, never say "Noted", "I\'ll keep that in mind", or anything that implies you saved something — just answer the question.',
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

  const workLines = ctx.workItems.slice(0, 15).map((w, i) => {
    const bits = [
      `"${cap(w.title, 90)}"`,
      w.category ? `[${w.category}]` : null,
      `priority ${w.priority}`,
      w.dueAt ? `due ${w.dueAt}` : null,
      w.summary ? cap(w.summary, 140) : null,
      w.reason ? cap(w.reason, 100) : null,
      w.suggestedAction ? `next: ${cap(w.suggestedAction, 100)}` : null,
    ].filter(Boolean);
    // [i] is the actionable handle — actions may only reference these indexes.
    return `[${i}] ${bits.join(' | ')}`;
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

/** Local wall-time as the prompt requires it: "YYYY-MM-DD HH:mm". */
const LOCAL_TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Validate one proposed action. Anything off-contract → null (the reply
 *  still shows; the model was told to ask when unsure, so a dropped action
 *  is always safe). `itemCount` = how many work items the model was shown. */
function asAction(v: unknown, itemCount: number): ChatActionProposal | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  const kind = String(a.kind ?? '');
  const idx = typeof a.itemIndex === 'number' ? a.itemIndex : Number(a.itemIndex);
  const validIdx = Number.isInteger(idx) && idx >= 0 && idx < itemCount;

  if (kind === 'mark_done') {
    return validIdx ? { kind, itemIndex: idx } : null;
  }
  if (kind === 'snooze') {
    const untilLocal = String(a.untilLocal ?? '').trim();
    return validIdx && LOCAL_TIME_RE.test(untilLocal) ? { kind, itemIndex: idx, untilLocal } : null;
  }
  if (kind === 'create_task') {
    const title = cap(String(a.title ?? ''), 200);
    if (title.length < 3) return null;
    const rawDue = a.dueLocal == null ? null : String(a.dueLocal).trim();
    const dueLocal = rawDue && LOCAL_TIME_RE.test(rawDue) ? rawDue : null;
    return { kind, title, dueLocal };
  }
  if (kind === 'draft_reply') {
    const instruction = cap(String(a.instruction ?? ''), 500);
    return validIdx && instruction.length >= 3 ? { kind, itemIndex: idx, instruction } : null;
  }
  if (kind === 'create_reminder') {
    const subject = cap(String(a.subject ?? ''), 150);
    const firstAtLocal = String(a.firstAtLocal ?? '').trim();
    if (subject.length < 3 || !LOCAL_TIME_RE.test(firstAtLocal)) return null;
    const rawEmail = a.toEmail == null ? null : String(a.toEmail).trim().toLowerCase();
    const toEmail = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail) ? rawEmail : null;
    const rawRepeat = a.repeatMinutes == null ? null : Number(a.repeatMinutes);
    const repeatMinutes =
      rawRepeat != null && Number.isFinite(rawRepeat) && rawRepeat > 0
        ? Math.max(15, Math.round(rawRepeat))
        : null;
    const rawCount = Number(a.count);
    const count = Number.isFinite(rawCount)
      ? Math.max(1, Math.min(10, Math.round(rawCount)))
      : 1;
    return {
      kind,
      itemIndex: validIdx ? idx : null,
      subject,
      toEmail,
      firstAtLocal,
      repeatMinutes: count > 1 ? repeatMinutes : null,
      count: repeatMinutes ? count : 1,
    };
  }
  return null;
}

/** Parse + validate the model's chat turn. Bad `remember` entries and
 *  off-contract actions are dropped silently (proposing nothing is always
 *  safe); a missing/empty reply throws. */
export function parseChatReply(raw: string, itemCount = 0): ParsedChatReply {
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
  return { reply, remember, action: asAction(obj.action, itemCount) };
}

/** The human-readable line a confirmation card shows for a proposal.
 *  `itemTitle` is the REAL title resolved from the index server-side. */
export function actionLabel(action: ChatActionProposal, itemTitle?: string | null): string {
  const title = itemTitle ? `"${cap(itemTitle, 70)}"` : 'this item';
  switch (action.kind) {
    case 'mark_done':
      return `Mark ${title} as done`;
    case 'snooze':
      return `Snooze ${title} until ${action.untilLocal}`;
    case 'create_task':
      return action.dueLocal
        ? `Add task "${cap(action.title, 70)}" due ${action.dueLocal}`
        : `Add task "${cap(action.title, 70)}"`;
    case 'draft_reply':
      return `Draft a reply on ${title} (for your approval)`;
    case 'create_reminder': {
      const to = action.toEmail ? `to ${action.toEmail}` : 'to you';
      const series =
        action.repeatMinutes && action.count > 1
          ? `, ${action.repeatMinutes === 60 ? 'hourly' : `every ${action.repeatMinutes} min`} × ${action.count}`
          : '';
      return `Email reminder ${to} about "${cap(action.subject, 60)}" starting ${action.firstAtLocal}${series}`;
    }
  }
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
