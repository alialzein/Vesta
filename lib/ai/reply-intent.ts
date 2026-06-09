/**
 * Phase 8 — "Waiting on them" reply-intent confirmation (separate from the main
 * thread analyzer). Given the MANAGER'S OWN reply, the model decides whether it
 * genuinely expects a response back (so the item stays on the radar) or just closes
 * the loop (so it's demoted). Kept apart from the inbound-thread prompt so neither
 * confuses the other. User-visible output only — no hidden reasoning.
 */
import { extractJson } from './schema';

export type ReplyIntent = {
  expectsReply: boolean;
  summary: string;
  nextAction: string;
  reason: string;
};

export type ReplyIntentInput = {
  subject: string | null;
  recipientName: string | null;
  /** The manager's own reply, already cleaned + capped. */
  reply: string;
};

export const REPLY_INTENT_JSON_HINT = `{
  "expectsReply": true | false,
  "summary": "1 plain sentence: what you asked them / are waiting for",
  "nextAction": "one concrete follow-up step for the manager",
  "reason": "one sentence: why this matters to the manager"
}`;

export function buildReplyIntentPrompt(input: ReplyIntentInput): { system: string; user: string } {
  const system = [
    "You are Vesta, an executive assistant tracking a manager's email.",
    "You are given the MANAGER'S OWN reply in a thread. Decide whether that reply EXPECTS a response back from the recipient — a question, a request, an awaited deliverable, or an approval the manager still needs — versus simply closing the loop (a thank-you, an acknowledgement, an FYI, or a final answer that needs nothing back).",
    'Return ONLY a JSON object — no prose, no code fences. Never invent facts not in the reply.',
    'Set expectsReply=true ONLY if the manager is genuinely owed a reply. A pleasantry or a statement with no ask is expectsReply=false.',
    `Return exactly this JSON shape:\n${REPLY_INTENT_JSON_HINT}`,
  ].join('\n');

  const user = [
    `Subject: ${input.subject ?? '(none)'}`,
    `Sent to: ${input.recipientName ?? '(unknown)'}`,
    '',
    "Manager's reply:",
    input.reply || '(no body available)',
  ].join('\n');

  return { system, user };
}

/** Parse + coerce the model's raw text into a ReplyIntent. Throws if unusable. */
export function parseReplyIntent(raw: string): ReplyIntent {
  const obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const summary = String(obj.summary ?? '').trim();
  const nextAction = String(obj.nextAction ?? '').trim();
  const reason = String(obj.reason ?? '').trim();
  const expectsReply = obj.expectsReply === true || obj.expectsReply === 'true';
  return {
    expectsReply,
    summary: summary || "You're waiting on a reply.",
    nextAction: nextAction || "Follow up if you haven't heard back.",
    reason: reason || summary || "You're owed a response.",
  };
}
