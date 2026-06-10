/**
 * Admin Wave 4 — initial-import scan-back window (pure).
 *
 * When a mailbox is first connected, Graph's delta enumeration walks the entire
 * inbox history. The operator-configurable scan-back window (default 7 days)
 * bounds that first import: messages older than the cutoff are skipped (never
 * stored). Ongoing delta syncs are unaffected — they only carry new changes.
 */

export type DatedMessage = { receivedDateTime?: string; sentDateTime?: string };

/** The effective timestamp of a message for the scan-back comparison. */
function effectiveTime(msg: DatedMessage): string | null {
  return msg.receivedDateTime ?? msg.sentDateTime ?? null;
}

/** True when the message is at/after the cutoff (undated messages are kept). */
export function isWithinScanBack(msg: DatedMessage, cutoffIso: string): boolean {
  const t = effectiveTime(msg);
  return t === null || t >= cutoffIso;
}

/** Filter a fetched batch to the scan-back window (no cutoff = keep all). */
export function applyScanBack<T extends DatedMessage>(messages: T[], cutoffIso: string | null): T[] {
  if (!cutoffIso) return messages;
  return messages.filter((m) => isWithinScanBack(m, cutoffIso));
}

/** The cutoff ISO for a scan-back window of N days (from `now`). */
export function scanBackCutoffIso(days: number, now: number = Date.now()): string {
  return new Date(now - days * 86_400_000).toISOString();
}
