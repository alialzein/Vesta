import type { WorkItem } from '@/lib/types';
import { BRIEF_PROMPT_VERSION } from '@/lib/ai/brief';

/**
 * Stale-brief guard (declutter PR 2 — "a brief that can't lie").
 *
 * The AI daily brief is written once per manager-day and cached. The radar,
 * however, changes during the day — items become overdue, get resolved, new
 * mail lands. The owner caught the worst case live: the cached brief said
 * "there is no overdue item in the queue" right next to a red Overdue card.
 *
 * Fix, in two halves:
 *  1. brief-v2 forbids queue-wide claims (counts / "nothing is overdue") at
 *     the SOURCE — the app renders live numbers next to the narrative.
 *  2. This guard compares the queue state stored WITH the brief (its
 *     fingerprint) against the live queue; when they differ materially the
 *     overlay keeps the deterministic brief and the dashboard regenerates
 *     once. Pure + injectable so it is unit-testable.
 */

/** Queue state captured at generation time, stored in daily_briefs.sections. */
export type BriefStateFingerprint = { open: number; overdue: number };

/** The slice of daily_briefs.sections this module reads/writes. */
export type BriefSections = {
  focus_item_id?: string | null;
  focus_reason?: string | null;
  prompt_version?: string;
  state?: BriefStateFingerprint;
};

export function briefFingerprint(items: ReadonlyArray<Pick<WorkItem, 'overdue'>>): BriefStateFingerprint {
  return {
    open: items.length,
    overdue: items.filter((i) => i.overdue).length,
  };
}

/**
 * True when the cached AI brief was written for a materially different queue
 * and must not be shown (the dashboard then regenerates once):
 *
 * - written by an older prompt version, or with no fingerprint at all
 *   (pre-v2 briefs may contain queue-wide claims — self-heals to v2);
 * - something became overdue AFTER the brief was written (the framing and
 *   the focus pick are likely wrong — overdue beats everything);
 * - the AI's focus pick is no longer on the radar (its "start here" is gone,
 *   so a fresh pick is worth one call).
 */
export function isBriefStale(
  sections: BriefSections | null | undefined,
  items: ReadonlyArray<Pick<WorkItem, 'id' | 'overdue'>>,
): boolean {
  if (!sections?.state || sections.prompt_version !== BRIEF_PROMPT_VERSION) return true;
  const live = briefFingerprint(items);
  if (live.overdue > sections.state.overdue) return true;
  if (sections.focus_item_id && !items.some((i) => i.id === sections.focus_item_id)) return true;
  return false;
}
