/**
 * Phase 7 — pure prompt building + body cleanup.
 *
 * We send the model only what it needs: the latest message (HTML stripped to text,
 * quoted reply chains removed, and capped) plus the Phase 6 thread state as compact
 * facts. This keeps long threads cheap — a 20-message thread costs about the same as
 * a 2-message one — while still giving real context.
 */
import { ANALYSIS_JSON_HINT } from './schema';

export const BODY_CAP = 1800;

export type AnalysisInput = {
  subject: string | null;
  /** Latest inbound message body (already cleaned + capped). */
  latestMessage: string;
  senderName: string | null;
  messageCount: number;
  followupCount: number;
  isWaitingOnManager: boolean;
  latestAt: string | null;
};

/** Strip HTML to readable text (no tags, decoded common entities). */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|br|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Remove quoted reply chains and cap length, so we send just the new content. */
export function cleanForAi(text: string, cap = BODY_CAP): string {
  let t = text.replace(/\r/g, ' ');
  const markers = [
    /\bOn\s.+?\bwrote:/s,
    /\bFrom:\s.+?\bSent:/s,
    /-{3,}\s*Original Message\s*-{3,}/i,
    /_{5,}/,
  ];
  for (const m of markers) {
    const i = t.search(m);
    if (i > 0) t = t.slice(0, i);
  }
  return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, cap);
}

/** Pick the best available body and clean it for the model. */
export function bodyForAi(input: {
  body_text?: string | null;
  body_html?: string | null;
  body_preview?: string | null;
}): string {
  const raw = input.body_text?.trim() || htmlToText(input.body_html) || input.body_preview?.trim() || '';
  return cleanForAi(raw);
}

export function buildPrompt(input: AnalysisInput): { system: string; user: string } {
  const system = [
    "You are Vesta, an executive assistant that triages a manager's email.",
    'Analyze ONE email thread and return ONLY a JSON object — no prose, no code fences.',
    'Be concise and concrete; write for the manager. Never invent facts not in the email.',
    'If no due date is stated or clearly implied, set deadline to null.',
    [
      'Category — pick the single best fit:',
      '- "waiting": the manager owes the next reply or decision (the ball is in the manager\'s court).',
      '- "followup": the manager is waiting on SOMEONE ELSE, or needs to chase/remind them.',
      '- "decision": the manager must make an explicit choice or approval.',
      '- "delegate": best handed off to a teammate.',
      '- "fyi": informational only; no action needed.',
      '- "critical": urgent AND high-stakes (use sparingly).',
      'When the facts say the manager is the one who must reply, prefer "waiting" over "followup".',
    ].join('\n'),
    `Return exactly this JSON shape:\n${ANALYSIS_JSON_HINT}`,
  ].join('\n');

  const user = [
    `Subject: ${input.subject ?? '(none)'}`,
    `From: ${input.senderName ?? '(unknown)'}`,
    `Messages in thread: ${input.messageCount}`,
    `Times they have followed up: ${input.followupCount}`,
    `Currently waiting on the manager to reply: ${input.isWaitingOnManager ? 'yes' : 'no'}`,
    input.latestAt ? `Latest message time: ${input.latestAt}` : '',
    '',
    'Latest message:',
    input.latestMessage || '(no body available)',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}
