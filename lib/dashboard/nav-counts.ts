import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_DRAFT_STATUSES } from '@/lib/drafts/serialize';
import type { NavCounts } from '@/components/dashboard/Sidebar';

/**
 * Real sidebar badge counts for app-shell pages (the dashboard derives the same
 * numbers from its already-loaded items). Mirrors getDashboardData's visibility
 * rules — open items plus snoozed ones whose snooze has lapsed — so the badges
 * never disagree with what Today's Radar actually shows.
 */
export async function getNavCounts(): Promise<NavCounts> {
  const supabase = createClient();
  const { data } = await supabase
    .from('work_items')
    .select('id, category, status, snoozed_until')
    .in('status', ['open', 'snoozed'])
    .limit(200);

  const now = Date.now();
  const rows = (data ?? []).filter(
    (r) =>
      r.status !== 'snoozed' ||
      (r.snoozed_until != null && new Date(r.snoozed_until).getTime() <= now),
  );

  let drafts = 0;
  if (rows.length > 0) {
    const { count } = await supabase
      .from('draft_replies')
      .select('id', { count: 'exact', head: true })
      .in('work_item_id', rows.map((r) => r.id))
      .in('status', [...ACTIVE_DRAFT_STATUSES]);
    drafts = count ?? 0;
  }

  return {
    today: rows.length,
    waiting: rows.filter((r) => r.category === 'waiting').length,
    drafts,
  };
}
