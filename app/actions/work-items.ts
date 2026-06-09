'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { parseQuickTask } from '@/lib/tasks/parse';

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

/**
 * Quick-add a manual to-do from a natural-language line ("Call the vendor tomorrow
 * 3pm"). The due date/time is parsed deterministically (no AI). Stored as a
 * mailbox-independent work_item (source 'manual', category 'task') so it shows on
 * Today's Radar alongside email items and supports the same done/snooze actions.
 */
export async function createManualTask(input: string): Promise<WorkItemActionResult> {
  const user = await requireUser();
  const { title, dueAt } = parseQuickTask(input);
  if (!title) return { ok: false, error: 'Please enter a task.' };

  // Light priority by due proximity so near-term tasks sort up the radar.
  let priority = 35;
  if (dueAt) {
    const ms = new Date(dueAt).getTime() - Date.now();
    if (ms <= 0) priority = 75;
    else if (ms <= 24 * 60 * 60 * 1000) priority = 65;
    else if (ms <= 3 * 24 * 60 * 60 * 1000) priority = 50;
    else priority = 40;
  }

  const supabase = createClient();
  const { error } = await supabase.from('work_items').insert({
    user_id: user.id,
    source: 'manual',
    title,
    category: 'task',
    status: 'open',
    priority_score: priority,
    due_at: dueAt,
    requires_reply: false,
    urgency_reason: dueAt ? 'Task you added.' : 'Task you added (no due date).',
    metadata: { origin: 'quick_add' },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}
