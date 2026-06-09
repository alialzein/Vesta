'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Phase 8 — manager actions on a Today's Radar item. All are RLS-scoped (the
 * authenticated client only touches the manager's own rows) and revalidate the
 * dashboard so the radar/KPIs refresh. The dashboard reads `status = 'open'`
 * (plus snoozed items whose time is due), so each action simply moves the item
 * out of that set.
 */

export type WorkItemActionResult = { ok: boolean; error?: string };

/**
 * Clear an item off the radar. `done` = handled/completed; `dismiss` = not
 * actionable (e.g. an FYI you've read). We stamp `metadata.resolved_at` so the
 * sync can resurface a *dismissed* thread if the person replies again — dismiss
 * means "handled for now", not "mute this sender".
 */
export async function resolveWorkItem(
  id: string,
  kind: 'done' | 'dismiss',
): Promise<WorkItemActionResult> {
  await requireUser();
  const supabase = createClient();

  // Merge resolved_at into the existing metadata instead of replacing the jsonb.
  const { data: existing } = await supabase
    .from('work_items')
    .select('metadata')
    .eq('id', id)
    .maybeSingle();
  const nowIso = new Date().toISOString();
  const metadata = {
    ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
    resolved_at: nowIso,
    resolved_kind: kind,
  };

  const { error } = await supabase
    .from('work_items')
    .update({
      status: kind === 'done' ? 'done' : 'dismissed',
      completed_at: kind === 'done' ? nowIso : null,
      metadata,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}

/**
 * Snooze an item until `untilIso`. It leaves the radar now and comes back on its
 * own once the time passes (the dashboard surfaces snoozed items that are due).
 */
export async function snoozeWorkItem(
  id: string,
  untilIso: string,
): Promise<WorkItemActionResult> {
  await requireUser();
  const when = new Date(untilIso);
  if (Number.isNaN(when.getTime())) return { ok: false, error: 'Invalid snooze time.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('work_items')
    .update({ status: 'snoozed', snoozed_until: when.toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}
