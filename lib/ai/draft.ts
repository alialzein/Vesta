/**
 * Phase 9 — draft-reply generation: the prompt contract + a defensive parser.
 *
 * Given one email thread (the latest inbound message + compact thread facts) and,
 * optionally, the manager's own tone/preferences, the model writes a *draft* reply
 * for the manager to review, edit, and explicitly approve. Nothing is ever sent
 * from here. Output is user-visible only — no hidden chain-of-thought.
 *
 * The contract mirrors docs/standards/ai/prompt-contracts.md (Draft reply):
 *   subject · body_text · tone · warnings · requires_human_review.
 */

// draft-v3: the prompt reads the manager's memory — hard "never do" limits
// (system rules) + project/company/person context notes (Phase 10).
// draft-v4: the prompt is TIME-AWARE — today's date, when the message being
// answered arrived, and per-message dates in the thread context. Fixes
// confident-but-stale drafts (e.g. accepting a "today or tomorrow?" meeting
// two days after it was asked, as if no time had passed).
export const DRAFT_PROMPT_VERSION = 'draft-v4';

/**
 * What the draft is FOR — drives the writing instruction:
 * - 'reply': the manager owes the sender an answer (waiting/decision/… items).
 * - 'follow_up': the manager already answered and is OWED something
 *   ('waiting_on_them' items) — the draft nudges the recipient, it never
 *   writes as if the manager must respond.
 */
export type DraftPurpose = 'reply' | 'follow_up';

/** One compact thread message for context ("who said what", oldest first). */
export type ThreadContextMsg = {
  /** "the manager" for outbound, else the sender's display name/email. */
  from: string;
  body: string;
  /** Short date label for when this message was sent (e.g. "Jun 9"), so the
   *  model can tell how the conversation sits in time. */
  at?: string | null;
};

/** Tones the manager can steer with (also accepted back from the model). */
export const DRAFT_TONES = ['professional', 'warm', 'concise', 'formal', 'friendly'] as const;
export type DraftTone = (typeof DRAFT_TONES)[number];

export type DraftSuggestion = {
  /** Reply subject (usually "RE: …"); the actual Graph reply keeps the thread subject. */
  subject: string;
  /** The reply body as plain text (paragraphs separated by blank lines). */
  bodyText: string;
  /** The tone the model wrote in (one of DRAFT_TONES, coerced). */
  tone: DraftTone;
  /** Short, user-visible cautions (sensitive topic, missing info, a promise made…). */
  warnings: string[];
  /** True when the model is unsure or the topic is sensitive — the UI leans on review. */
  requiresHumanReview: boolean;
};

export type DraftInput = {
  subject: string | null;
  /** Who we're replying to (display name), for the greeting. */
  recipientName: string | null;
  /** The manager's own name, so the model can sign off correctly. */
  managerName: string | null;
  /** Latest inbound message body (already cleaned + capped). */
  latestMessage: string;
  /** The manager's requested tone for this draft. */
  tone: DraftTone;
  /** Optional manager tone/preference lines (from Memory & Rules). */
  toneNotes?: string[];
  /** Hard "never do" limits from Memory & Rules — the model MUST obey these. */
  hardRules?: string[];
  /** Background facts (project/company/person context) to use when relevant. */
  contextNotes?: string[];
  /** Optional free-form instruction from the manager ("decline politely", "ask for the deck"). */
  instruction?: string | null;
  /** Reply (default) or follow-up nudge — see DraftPurpose. */
  purpose?: DraftPurpose;
  /** Recent thread messages (both directions, oldest first, already cleaned +
   *  capped) so the model knows what was already said — including the
   *  manager's own replies, which the latest inbound message alone misses. */
  threadContext?: ThreadContextMsg[];
  /** Today's date, human-readable (e.g. "Thursday, June 11, 2026") — without it
   *  the model has no idea relative words in old mail have already expired. */
  today?: string;
  /** When the message being answered arrived, human-readable with its age
   *  (e.g. "Tue, Jun 9, 8:39 PM UTC (2 days ago)"). */
  receivedAt?: string | null;
};

export const DRAFT_JSON_HINT = `{
  "subject": "the reply subject (keep the thread subject, usually prefixed RE:)",
  "body_text": "the full reply, ready to send, in the manager's voice. Use real line breaks between paragraphs. Do NOT include a subject line, quoted history, or email headers.",
  "tone": ${DRAFT_TONES.map((t) => `"${t}"`).join(' | ')},
  "warnings": ["short cautions for the manager, e.g. a sensitive topic, a promise made, or missing info"],
  "requires_human_review": true | false
}`;

export function buildDraftPrompt(input: DraftInput): { system: string; user: string } {
  const isFollowUp = input.purpose === 'follow_up';
  const system = [
    "You are Vesta, an executive assistant drafting an email reply on behalf of a manager.",
    isFollowUp
      ? 'The manager already replied in this thread and is now WAITING ON the recipient. Write a brief, polite follow-up that nudges the recipient for the update, answer, or confirmation they owe the manager. Reference what the manager asked for. Do NOT write as if the manager owes a reply, do NOT promise the manager will "look into" anything, and do NOT re-answer the recipient\'s earlier question.'
      : "Write a safe, ready-to-send reply to the latest message in the thread, in the manager's voice.",
    'Rules:',
    '- Never invent facts, figures, names, dates, commitments, or attachments that are not in the thread. If something needed is missing, write a safe holding reply or ask one concise clarifying question instead of guessing.',
    '- Do not overpromise or commit the manager to anything specific (amounts, deadlines, approvals) unless the thread already states it.',
    '- Keep it brief and purposeful: greeting, the substance, a clear close. Match the requested tone.',
    '- If the topic is sensitive (legal, contract, finance/payment, HR/termination, medical, security, confidential, or an upset client), keep the reply careful, add a warning, and set requires_human_review to true.',
    '- Sign off as the manager by name when known. Do not fabricate a signature block, title, or contact details.',
    '- TIME AWARENESS: use the dates provided. Relative words inside a message ("today", "tomorrow", "this afternoon", weekday names) refer to the date THAT message was received — if days have passed since, those times are already gone. Never accept, confirm, or propose a time that has already passed. When the reply comes after an asked-about time has slipped (a day or more), open with ONE short acknowledgement of the late reply, then move it forward: confirm whether it is still needed and ask for or propose NEW timing. Never write as if the reply is being sent the day the message arrived.',
    ...(input.hardRules && input.hardRules.length > 0
      ? [
          "The manager's hard rules — these are absolute and override everything else:",
          ...input.hardRules.map((r) => `- ${r}`),
        ]
      : []),
    'Return ONLY a JSON object — no prose, no code fences.',
    `Return exactly this JSON shape:\n${DRAFT_JSON_HINT}`,
  ].join('\n');

  const toneLine =
    input.toneNotes && input.toneNotes.length > 0
      ? `The manager's tone & preferences: ${input.toneNotes.join('; ')}`
      : '';

  // "Who said what" so the model never mistakes which side owes what — the
  // latest inbound message alone hid the manager's own replies (the source of
  // backwards waiting_on_them drafts).
  const contextBlock =
    input.threadContext && input.threadContext.length > 0
      ? [
          'Conversation so far (oldest first):',
          ...input.threadContext.map(
            (m) => `- ${m.at ? `[${m.at}] ` : ''}${m.from}: ${m.body}`,
          ),
        ].join('\n')
      : '';

  const contextNotesLine =
    input.contextNotes && input.contextNotes.length > 0
      ? ['Background the manager has saved (use only when relevant):', ...input.contextNotes.map((n) => `- ${n}`)].join('\n')
      : '';

  const receivedNote = input.receivedAt ? ` (received ${input.receivedAt})` : '';
  const user = [
    input.today ? `Today is ${input.today}.` : '',
    `Reply tone requested: ${input.tone}`,
    toneLine,
    contextNotesLine,
    input.instruction ? `Manager's instruction for this reply: ${input.instruction}` : '',
    `Subject: ${input.subject ?? '(none)'}`,
    `Writing to: ${input.recipientName ?? '(unknown)'}`,
    `Sign off as: ${input.managerName ?? '(the manager)'}`,
    contextBlock,
    isFollowUp
      ? `The recipient's last message${receivedNote} (the follow-up will thread onto it):`
      : `Latest message to reply to${receivedNote}:`,
    input.latestMessage || '(no body available)',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

import { extractJson } from './schema';

function asTone(v: unknown): DraftTone {
  return DRAFT_TONES.includes(v as DraftTone) ? (v as DraftTone) : 'professional';
}

function asWarnings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((w) => (typeof w === 'string' ? w.trim() : ''))
    .filter(Boolean)
    .slice(0, 5);
}

/** Parse + validate the model's raw text into a DraftSuggestion. Throws if unusable. */
export function parseDraft(raw: string, fallbackSubject: string | null): DraftSuggestion {
  const obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const bodyText = String(obj.body_text ?? '').trim();
  if (!bodyText) throw new Error('Empty draft body');
  const subject = String(obj.subject ?? '').trim();
  const warnings = asWarnings(obj.warnings);
  // A sensitive draft must always be reviewed, even if the model forgot to flag it.
  const requiresHumanReview =
    obj.requires_human_review === true || obj.requires_human_review === 'true';

  return {
    subject: subject || fallbackSubject || '(no subject)',
    bodyText,
    tone: asTone(obj.tone),
    warnings,
    requiresHumanReview,
  };
}
