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

export const DRAFT_PROMPT_VERSION = 'draft-v1';

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
  /** Optional manager tone/preference lines (from onboarding memories). */
  toneNotes?: string[];
  /** Optional free-form instruction from the manager ("decline politely", "ask for the deck"). */
  instruction?: string | null;
};

export const DRAFT_JSON_HINT = `{
  "subject": "the reply subject (keep the thread subject, usually prefixed RE:)",
  "body_text": "the full reply, ready to send, in the manager's voice. Use real line breaks between paragraphs. Do NOT include a subject line, quoted history, or email headers.",
  "tone": ${DRAFT_TONES.map((t) => `"${t}"`).join(' | ')},
  "warnings": ["short cautions for the manager, e.g. a sensitive topic, a promise made, or missing info"],
  "requires_human_review": true | false
}`;

export function buildDraftPrompt(input: DraftInput): { system: string; user: string } {
  const system = [
    "You are Vesta, an executive assistant drafting an email reply on behalf of a manager.",
    'Write a safe, ready-to-send reply to the latest message in the thread, in the manager\'s voice.',
    'Rules:',
    '- Never invent facts, figures, names, dates, commitments, or attachments that are not in the thread. If something needed is missing, write a safe holding reply or ask one concise clarifying question instead of guessing.',
    '- Do not overpromise or commit the manager to anything specific (amounts, deadlines, approvals) unless the thread already states it.',
    '- Keep it brief and purposeful: greeting, the substance, a clear close. Match the requested tone.',
    '- If the topic is sensitive (legal, contract, finance/payment, HR/termination, medical, security, confidential, or an upset client), keep the reply careful, add a warning, and set requires_human_review to true.',
    '- Sign off as the manager by name when known. Do not fabricate a signature block, title, or contact details.',
    'Return ONLY a JSON object — no prose, no code fences.',
    `Return exactly this JSON shape:\n${DRAFT_JSON_HINT}`,
  ].join('\n');

  const toneLine =
    input.toneNotes && input.toneNotes.length > 0
      ? `The manager's tone & preferences: ${input.toneNotes.join('; ')}`
      : '';

  const user = [
    `Reply tone requested: ${input.tone}`,
    toneLine,
    input.instruction ? `Manager's instruction for this reply: ${input.instruction}` : '',
    '',
    `Subject: ${input.subject ?? '(none)'}`,
    `Replying to: ${input.recipientName ?? '(unknown)'}`,
    `Sign off as: ${input.managerName ?? '(the manager)'}`,
    '',
    'Latest message to reply to:',
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
