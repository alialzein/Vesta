/**
 * @-mention parsing for the chat composer (pure, unit-tested).
 *
 * Typing "@" then 2+ characters at the END of the message opens people
 * suggestions from the manager's own senders — "Schedule a meeting with @zah…"
 * → pick → the plain email is inserted. Tokens may be one or two words so
 * full names ("zahraa daher") keep matching while the person types.
 */

export type MentionQuery = {
  /** What the manager typed after the "@" (the search term). */
  query: string;
  /** Index of the "@" in the value — replaced (to end) on accept. */
  start: number;
};

const MENTION_RE = /(^|\s)@([\p{L}\p{N}._%+-]+(?: [\p{L}\p{N}._%+-]+)?)$/u;

export function mentionQuery(value: string): MentionQuery | null {
  const m = value.match(MENTION_RE);
  if (!m) return null;
  const query = m[2];
  if (query.length < 2) return null;
  return { query, start: value.length - query.length - 1 };
}

/** Replace the active "@token" with the chosen email (plus a trailing space,
 *  which also deactivates the menu — emails typed by hand never re-trigger
 *  it because their "@" is not preceded by whitespace). */
export function applyMention(value: string, q: MentionQuery, email: string): string {
  return `${value.slice(0, q.start)}${email} `;
}
