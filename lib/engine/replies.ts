/**
 * Reply-intent pre-gate (Phase 8 — "Waiting on them"). Pure + deterministic.
 *
 * After the manager replies to a thread, this cheaply guesses whether that reply
 * EXPECTS a response — so the thread should be tracked as "waiting on them" — versus
 * a closing note ("thanks", "got it", "will do") that needs no follow-up. It is a
 * cheap first pass, not the final word: in the default mode it filters out the
 * obvious no-reply cases so AI only spends a call on plausible asks. AI confirms.
 */

// Phrasings that signal the manager is asking for / expecting something back.
const REQUEST_PATTERNS: RegExp[] = [
  /\?/, // any direct question
  /\b(can|could|would|will)\s+you\b/i,
  /\bplease\s+(send|share|confirm|review|let me know|advise|provide|update|reply|respond|get back|sign|approve)/i,
  /\b(let me know|get back to me|keep me posted|update me|looking forward)\b/i,
  /\b(send|share|forward|provide)\s+(me|us|over|it|the)\b/i,
  /\bwaiting (for|on)\b/i,
  /\bby\s+(eod|cob|end of day|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)\b/i,
  /\b(need|needs|require|requires|expecting)\b.{0,30}\b(from you|your|back)\b/i,
  /\bawait(ing)?\b/i,
  /\bwhen\s+(can|will|do|are|would)\b/i,
];

// Short acknowledgements that clearly close the loop and expect nothing back.
const CLOSING_ONLY =
  /^(thanks?|thank you|thx|ok|okay|k|got it|sounds good|will do|noted|cheers|great|perfect|done|received|appreciated|no problem|np|understood|agreed)[!.\s]*$/i;

/** True when the manager's reply plausibly asks for / expects a response. */
export function replyLikelyExpectsResponse(text: string | null | undefined): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (CLOSING_ONLY.test(t)) return false;
  return REQUEST_PATTERNS.some((re) => re.test(t));
}
