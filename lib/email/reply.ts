/**
 * Phase 9 — pure helpers for building a reply: who it goes to, how the body is
 * composed (the manager's text above the quoted original), and a deterministic
 * sensitive-topic safety net. No I/O — all unit-tested. The actual Graph reply is
 * built server-side by createReply/createReplyAll (lib/graph/send.ts), which sets
 * the real recipients + quote; these mirror that for display, storage, and a
 * client-side preview so the manager always sees who a reply will reach.
 */

export type Recipient = { name?: string | null; email?: string | null };

export type ReplyRecipients = { to: Recipient[]; cc: Recipient[] };

/** Lowercased, de-duped, non-empty email set helper. */
function normEmail(r: Recipient): string {
  return (r.email ?? '').trim().toLowerCase();
}

/**
 * Work out who a reply is addressed to, mirroring Outlook's Reply / Reply All:
 *  - reply (default): just the original sender.
 *  - reply all: the sender plus everyone on the original To/Cc.
 * The manager's own addresses are always removed (you don't email yourself), and
 * recipients are de-duplicated by email (first occurrence wins, keeping a name).
 */
export function buildReplyRecipients(
  message: { from?: Recipient | null; to?: Recipient[] | null; cc?: Recipient[] | null },
  managerEmails: string[],
  opts: { replyAll: boolean },
): ReplyRecipients {
  const mine = new Set(managerEmails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  const sender = message.from ?? null;

  const seen = new Set<string>();
  const keep = (list: Recipient[]): Recipient[] => {
    const out: Recipient[] = [];
    for (const r of list) {
      const e = normEmail(r);
      if (!e || mine.has(e) || seen.has(e)) continue;
      seen.add(e);
      out.push({ name: r.name ?? null, email: r.email ?? null });
    }
    return out;
  };

  // To always leads with the sender (unless that's the manager).
  const to = keep(sender ? [sender] : []);
  if (!opts.replyAll) return { to, cc: [] };

  // Reply All: original To joins To; original Cc joins Cc (minus dupes already in To).
  to.push(...keep(message.to ?? []));
  const cc = keep(message.cc ?? []);
  return { to, cc };
}

/** Basic email shape check (good enough to keep obvious typos out of a send). */
export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/**
 * Turn a typed recipient string into a Recipient, accepting "Name <email>" or a
 * bare "email". Returns null when there's no valid email — so the UI can reject it.
 */
export function normalizeRecipient(input: string): Recipient | null {
  const raw = input.trim();
  if (!raw) return null;
  const angle = raw.match(/^(.*)<([^>]+)>$/);
  const name = angle ? angle[1].trim().replace(/^"|"$/g, '') : '';
  const email = (angle ? angle[2] : raw).trim();
  if (!isValidEmail(email)) return null;
  return { name: name || null, email };
}

/** Drop empty/invalid entries and de-duplicate a recipient list by email. */
export function dedupeRecipients(list: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of list) {
    const e = (r.email ?? '').trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push({ name: r.name ?? null, email: r.email ?? null });
  }
  return out;
}

/** Format recipients for a Microsoft Graph message field (toRecipients, etc.). */
export function toGraphRecipients(
  list: Recipient[],
): { emailAddress: { address: string; name?: string } }[] {
  return list
    .filter((r) => (r.email ?? '').trim())
    .map((r) => ({
      emailAddress: r.name
        ? { address: (r.email as string).trim(), name: r.name }
        : { address: (r.email as string).trim() },
    }));
}

/** Escape text for safe inclusion in HTML. */
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/**
 * Turn the manager's plain-text reply into simple, safe HTML: blank lines become
 * paragraph breaks, single newlines become <br>. Used as the top of the sent body.
 */
export function replyTextToHtml(text: string): string {
  const paras = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return paras || '<p></p>';
}

/**
 * Compose the final HTML body sent to Graph: the manager's reply on top, then the
 * quoted original conversation (as returned by Graph's createReply) below it.
 */
export function composeReplyHtml(replyText: string, quotedHtml: string | null | undefined): string {
  const top = replyTextToHtml(replyText);
  if (!quotedHtml) return top;
  return `${top}\n<br>\n${quotedHtml}`;
}

/**
 * Deterministic sensitive-topic detector (safety net independent of the model).
 * Returns the matched topic labels so the composer can always show a caution —
 * even if the AI didn't flag it — per docs/standards/ai/safety-rules.md.
 */
const SENSITIVE_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'legal', re: /\b(legal|lawsuit|attorney|lawyer|litigation|nda|liabilit)/i },
  { label: 'contract', re: /\b(contract|agreement|terms|sign(ed|ature)?|renewal)\b/i },
  { label: 'finance', re: /\b(invoice|payment|refund|wire transfer|budget|salary|pricing|discount|po number|purchase order)\b/i },
  { label: 'HR', re: /\b(hr|terminat|fired|layoff|resign|harassment|disciplinary|onboarding offer)\b/i },
  { label: 'medical', re: /\b(medical|health|diagnos|sick leave|disability)\b/i },
  { label: 'security', re: /\b(password|api key|secret|breach|vulnerab|credential)\b/i },
  { label: 'confidential', re: /\b(confidential|private|do not share|nda)\b/i },
];

export function detectSensitiveTopics(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const { label, re } of SENSITIVE_PATTERNS) {
    if (re.test(text)) found.add(label);
  }
  return [...found];
}
