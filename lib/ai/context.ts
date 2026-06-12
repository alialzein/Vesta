/**
 * Phase 7 — pure prompt building + body cleanup.
 *
 * We send the model only what it needs: the latest message (HTML stripped to text,
 * quoted reply chains removed, and capped) plus the Phase 6 thread state as compact
 * facts. This keeps long threads cheap — a 20-message thread costs about the same as
 * a 2-message one — while still giving real context.
 */
import { ANALYSIS_JSON_HINT } from './schema';
import type { ThreadContextMsg } from './draft';

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
  /** Today (YYYY-MM-DD) so "tomorrow"/"by Friday" resolve to real dates and the
   *  model can tell an already-passed deadline from an upcoming one. */
  today?: string | null;
  /** Recent thread messages (both directions, oldest first, cleaned + capped) —
   *  the latest inbound alone hid earlier asks, stated deadlines, and the
   *  manager's own replies. */
  threadContext?: ThreadContextMsg[];
  /** The manager's standing memory notes that apply here (Phase 10): VIPs,
   *  delegation rules, hard limits, project/company context. */
  managerNotes?: string[];
  /** The sender is a VIP (people.is_vip or a VIP memory) — rank accordingly. */
  senderIsVip?: boolean;
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
    'Deadlines: resolve relative words ("today", "tomorrow", "by Friday") against the date of the MESSAGE that says them (see the message times below), NOT against today\'s date. A question that needs an answer by a certain day — e.g. "should we meet today or tomorrow?" — implies a deadline of the LATEST day it mentions, even when that day has already passed (the manager must see it as overdue). If no due date is stated or clearly implied, set deadline to null.',
    [
      'Category — decide by WHO is waiting on whom, judged from the email content:',
      '- "waiting": a person is waiting for the MANAGER\'s reply, decision, or approval. A sender asking for an update or chasing the manager counts as "waiting".',
      '- "followup": the manager already responded and is now waiting on SOMEONE ELSE to get back to them.',
      '- "decision": the manager must make an explicit choice or approval (a stronger form of "waiting").',
      '- "delegate": best handed to a teammate rather than answered by the manager.',
      '- "fyi": an automated notification, receipt, ticket/status update, account-verification, or no-reply/system message where no person is personally waiting on the manager.',
      '- "critical": urgent AND high-stakes (use sparingly).',
      'Rules: reminders from the sender mean THEY are waiting on the manager → use "waiting", never "followup". Automated / no-reply / "do not reply" / verify-your-account / closed-ticket messages are "fyi", not "waiting".',
    ].join('\n'),
    "If the manager's standing notes are provided, let them shape the priority, category, and next action: VIP senders/topics rank higher; a matching delegation rule usually makes \"delegate\" the right category (name the delegate in next_action); never suggest an action the notes forbid.",
    `Return exactly this JSON shape:\n${ANALYSIS_JSON_HINT}`,
  ].join('\n');

  const contextBlock =
    input.threadContext && input.threadContext.length > 0
      ? [
          'Conversation so far (oldest first):',
          // The date prefix lets relative words ("tomorrow") resolve against the
          // message that said them — without it every deadline floats to today.
          ...input.threadContext.map((m) => `- ${m.at ? `[${m.at}] ` : ''}${m.from}: ${m.body}`),
        ].join('\n')
      : '';

  const notesBlock =
    input.managerNotes && input.managerNotes.length > 0
      ? [
          "Manager's standing notes (apply where relevant):",
          ...input.managerNotes.map((n) => `- ${n}`),
        ].join('\n')
      : '';

  const user = [
    `Subject: ${input.subject ?? '(none)'}`,
    `From: ${input.senderName ?? '(unknown)'}`,
    input.senderIsVip ? 'This sender is a VIP for the manager.' : '',
    input.today ? `Today's date: ${input.today}` : '',
    notesBlock,
    `Messages in thread: ${input.messageCount}`,
    `Reminders the sender has sent: ${input.followupCount}`,
    input.isWaitingOnManager
      ? 'The latest message is from the sender; the manager has not replied to it yet.'
      : '',
    input.latestAt ? `Latest message time: ${input.latestAt}` : '',
    contextBlock,
    'Latest message:',
    input.latestMessage || '(no body available)',
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}
