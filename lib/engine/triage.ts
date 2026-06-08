/**
 * Email triage engine (Phase 6.5) — pure, no DB, unit-tested.
 *
 * Decides whether a synced email should be imported as actionable work
 * ("included") or hidden as noise ("excluded"), and WHY. Mailboxes are noisy:
 * alerts, newsletters, automated notifications. This keeps the Priorities/Inbox
 * views focused on real correspondence the manager can act on.
 *
 * The decision is layered and manager-controlled (see classifyEmail):
 *   1. Manager allow-list / VIP  → always include
 *   2. Manager mute-list         → always exclude
 *   3. Mode = everything         → include everything else
 *   4. Mode = flagged            → include only mail the manager flagged
 *   5. Mode = focused (default)  → keep flagged/VIP/high-importance; drop clearly
 *      automated/bulk senders and anything Outlook sorted to "Other"
 *
 * Every decision carries a human `reason` and structured `signals` so the UI can
 * explain it and the manager can tune (project priority: user-visible reasons).
 */

export type TriageMode = 'focused' | 'flagged' | 'everything';

export type FlagStatus = 'notFlagged' | 'flagged' | 'complete';
export type Importance = 'low' | 'normal' | 'high';
export type InferenceClassification = 'focused' | 'other';

/** What the classifier needs to know about one message (provider-agnostic). */
export type TriageInput = {
  fromEmail?: string | null;
  fromName?: string | null;
  subject?: string | null;
  /** Microsoft Focused Inbox signal (Graph `inferenceClassification`). */
  inferenceClassification?: InferenceClassification | null;
  /** From Graph `flag.flagStatus`. */
  flagStatus?: FlagStatus | null;
  importance?: Importance | null;
  /** Internet headers, keys lowercased (List-Unsubscribe, Precedence, …). Optional. */
  headers?: Record<string, string> | null;
};

/** A manager-controlled rule (stored in manager_rules; see the migration notes). */
export type TriageRule = {
  kind: 'mute' | 'allow';
  match: 'sender' | 'domain' | 'subject';
  value: string;
};

export type TriageConfig = {
  mode: TriageMode;
  rules?: TriageRule[];
  /** Lowercased emails of people flagged is_vip — always included. */
  vipEmails?: string[];
  /** Lowercased domains treated as VIP — always included. */
  vipDomains?: string[];
};

export type TriageDecision = {
  include: boolean;
  /** Human, e.g. "Newsletter (unsubscribe header)". */
  reason: string;
  /** Structured tags that fired, e.g. ['automated:no-reply','inference:other']. */
  signals: string[];
  /** Description of the matched manager rule, if any. */
  matchedRule?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function norm(s?: string | null): string {
  return (s ?? '').trim().toLowerCase();
}

function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : '';
}

function localPartOf(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

/**
 * Local-parts that almost always indicate machine senders. Matched as whole
 * tokens against the local part split on . _ - + so "noreply", "no-reply",
 * "do.not.reply", "mailer-daemon", "news+123" are caught, but a human like
 * "alert.hansen" or "marketingmanager" is NOT (we match tokens, not substrings).
 */
const AUTOMATED_LOCALPARTS = new Set([
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'notification',
  'notifications',
  'alert',
  'alerts',
  'mailer',
  'mailer-daemon',
  'maildaemon',
  'postmaster',
  'newsletter',
  'newsletters',
  'news',
  'marketing',
  'updates',
  'noreply-',
  'bounce',
  'bounces',
  'auto',
  'automated',
  'system',
]);

function looksAutomatedSender(email: string): boolean {
  const local = localPartOf(email);
  // Whole-string fast paths (no separators), e.g. "noreply@".
  if (AUTOMATED_LOCALPARTS.has(local)) return true;
  // Token match on . _ - + boundaries.
  const tokens = local.split(/[._+-]+/).filter(Boolean);
  if (tokens.some((t) => AUTOMATED_LOCALPARTS.has(t))) return true;
  // Common compound spellings without separators.
  return /^(no.?reply|donotreply|mailer.?daemon)/.test(local);
}

/**
 * Dedicated campaign/ESP sending subdomains. Marketing platforms blast from a
 * subdomain like mail.brand.com, email.brand.com or news.brand.com, while a real
 * person at the same company writes from the apex (someone@brand.com). We treat
 * the leading label of a 3+ label domain as a bulk marker — but NOT the apex
 * itself (mail.com / email.com are human webmail providers, not subdomains).
 */
const BULK_SUBDOMAIN_LABELS = new Set([
  'mail',
  'email',
  'mailer',
  'mailing',
  'newsletter',
  'newsletters',
  'news',
  'marketing',
  'mktg',
  'campaign',
  'campaigns',
]);

function looksBulkSender(email: string): boolean {
  const labels = domainOf(email).split('.').filter(Boolean);
  // Require a real base domain beneath the subdomain (sub.domain.tld); a 2-label
  // domain is the apex (e.g. mail.com), which must not be treated as bulk.
  if (labels.length < 3) return false;
  return BULK_SUBDOMAIN_LABELS.has(labels[0]);
}

/** Bulk/automated header signals → returns a human reason if any fired. */
function bulkHeaderReason(headers?: Record<string, string> | null): string | null {
  if (!headers) return null;
  if (headers['list-unsubscribe'] || headers['list-id'])
    return 'Newsletter / bulk (unsubscribe header)';
  const precedence = norm(headers['precedence']);
  if (precedence === 'bulk' || precedence === 'list' || precedence === 'junk') return 'Bulk mail';
  const autoSubmitted = norm(headers['auto-submitted']);
  if (autoSubmitted && autoSubmitted !== 'no') return 'Automated message';
  // Empty Return-Path (<>) marks a bounce / system notification.
  const returnPath = norm(headers['return-path']);
  if (returnPath === '<>' || returnPath === '') {
    if ('return-path' in headers) return 'Bounce / system message';
  }
  return null;
}

function ruleMatches(rule: TriageRule, email: string, subject: string): boolean {
  const value = norm(rule.value);
  if (!value) return false;
  if (rule.match === 'sender') return email === value;
  if (rule.match === 'domain') return domainOf(email) === value || email.endsWith('@' + value);
  // subject contains
  return subject.includes(value);
}

// ---------------------------------------------------------------------------
// Main classifier
// ---------------------------------------------------------------------------

export function classifyEmail(input: TriageInput, config: TriageConfig): TriageDecision {
  const email = norm(input.fromEmail);
  const subject = norm(input.subject);
  const domain = email ? domainOf(email) : '';
  const signals: string[] = [];

  const rules = config.rules ?? [];
  const vipEmails = config.vipEmails ?? [];
  const vipDomains = config.vipDomains ?? [];

  // 1. Allow-list / VIP always wins.
  const allowRule = rules.find((r) => r.kind === 'allow' && ruleMatches(r, email, subject));
  if (allowRule) {
    return {
      include: true,
      reason: `Always allowed (${allowRule.match}: ${allowRule.value})`,
      signals: ['allow:rule'],
      matchedRule: `allow ${allowRule.match}=${allowRule.value}`,
    };
  }
  if (email && vipEmails.includes(email)) {
    return { include: true, reason: 'From a VIP', signals: ['allow:vip-sender'] };
  }
  if (domain && vipDomains.includes(domain)) {
    return { include: true, reason: 'From a VIP domain', signals: ['allow:vip-domain'] };
  }

  // 2. Mute-list always excludes (after allow/VIP).
  const muteRule = rules.find((r) => r.kind === 'mute' && ruleMatches(r, email, subject));
  if (muteRule) {
    return {
      include: false,
      reason: `Muted (${muteRule.match}: ${muteRule.value})`,
      signals: ['mute:rule'],
      matchedRule: `mute ${muteRule.match}=${muteRule.value}`,
    };
  }

  const isFlagged = input.flagStatus === 'flagged';
  const isHigh = input.importance === 'high';
  if (isFlagged) signals.push('flagged');
  if (isHigh) signals.push('importance:high');

  // 3. Everything mode: import all that survived mute.
  if (config.mode === 'everything') {
    return {
      include: true,
      reason: 'Imported (mode: everything)',
      signals: [...signals, 'mode:everything'],
    };
  }

  // 4. Flagged mode: only mail the manager flagged.
  if (config.mode === 'flagged') {
    return isFlagged
      ? { include: true, reason: 'You flagged this', signals: [...signals, 'mode:flagged'] }
      : { include: false, reason: 'Not flagged', signals: [...signals, 'mode:flagged'] };
  }

  // 5. Focused mode (default).
  // Manager's own flag overrides automated/Other filtering.
  if (isFlagged) {
    return { include: true, reason: 'You flagged this', signals: [...signals, 'mode:focused'] };
  }

  // 5a. Clearly automated / bulk → hide (wins over importance: machines can fake it).
  const headerReason = bulkHeaderReason(input.headers);
  if (headerReason) {
    signals.push('automated:header');
    return { include: false, reason: headerReason, signals };
  }
  if (email && looksAutomatedSender(email)) {
    signals.push('automated:no-reply');
    return { include: false, reason: 'Automated sender (no-reply / notifications)', signals };
  }
  // A campaign/ESP sending subdomain (mail.brand.com, news.brand.com) → bulk.
  if (email && looksBulkSender(email)) {
    signals.push('automated:bulk-domain');
    return { include: false, reason: 'Newsletter / bulk sender', signals };
  }

  // 5b. Outlook sorted it to "Other" → hide, unless the manager marked it high importance.
  if (input.inferenceClassification === 'other') {
    signals.push('inference:other');
    if (isHigh) {
      return { include: true, reason: 'Marked high importance', signals };
    }
    return { include: false, reason: 'Outlook sorted this to Other', signals };
  }

  if (input.inferenceClassification === 'focused') signals.push('inference:focused');
  return { include: true, reason: 'Focused inbox', signals: [...signals, 'mode:focused'] };
}
