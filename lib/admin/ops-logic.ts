/**
 * Pure decision logic for the ops cron (unit tested): which users breached
 * their daily AI cost cap, and whether it's digest o'clock.
 */

export type CapBreach = { userId: string; spentUsd: number; capUsd: number };

/**
 * A user breaches when today's spend reaches their effective cap — the
 * per-user cap when set, else the global one. No cap anywhere = no breach,
 * ever (the operator opts in by setting limits).
 */
export function detectCapBreaches(
  spendByUser: Map<string, number>,
  globalCapUsd: number | null,
  perUserCapUsd: Map<string, number | null>,
): CapBreach[] {
  const breaches: CapBreach[] = [];
  for (const [userId, spent] of spendByUser) {
    const cap = perUserCapUsd.get(userId) ?? globalCapUsd;
    if (cap !== null && cap !== undefined && cap > 0 && spent >= cap) {
      breaches.push({ userId, spentUsd: spent, capUsd: cap });
    }
  }
  return breaches.sort((a, b) => b.spentUsd - a.spentUsd);
}

/** The digest goes out on the first cron run at/after the configured UTC
 *  hour, once per day, and only when something is actually wrong. */
export function shouldSendDigest(
  nowUtc: Date,
  digestHourUtc: number,
  alreadySentToday: boolean,
  attentionCount: number,
): boolean {
  return !alreadySentToday && attentionCount > 0 && nowUtc.getUTCHours() >= digestHourUtc;
}
