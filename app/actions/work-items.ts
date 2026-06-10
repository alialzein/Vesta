'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { parseQuickTask } from '@/lib/tasks/parse';
import { getAiConfig } from '@/lib/ai/config';
import { getAiClient } from '@/lib/ai/client';
import { buildCapturePrompt, parseCapture } from '@/lib/ai/quick-capture';
import { estimateCostUsd } from '@/lib/ai/cost';
import { recordAiUsage } from '@/lib/ai/usage';
import { getConfiguredAiRates } from '@/lib/admin/settings';

/** Priority by how soon a task is due, so near-term tasks sort up the radar. */
function priorityForDue(dueAt: string | null): number {
  if (!dueAt) return 35;
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms <= 0) return 75;
  if (ms <= 24 * 60 * 60 * 1000) return 65;
  if (ms <= 3 * 24 * 60 * 60 * 1000) return 50;
  return 40;
}

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

  const supabase = createClient();
  const { error } = await supabase.from('work_items').insert({
    user_id: user.id,
    source: 'manual',
    title,
    category: 'task',
    status: 'open',
    priority_score: priorityForDue(dueAt),
    due_at: dueAt,
    requires_reply: false,
    urgency_reason: dueAt ? 'Task you added.' : 'Task you added (no due date).',
    metadata: { origin: 'quick_add' },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}

/**
 * AI quick-capture (the "✨" button). Turns free text into a structured task — clean
 * title, kind (task/reminder/call/meeting), due time, person — with one AI call. If
 * AI isn't configured or errors, it falls back to the deterministic createManualTask,
 * so it never hard-fails. `localNow` is the manager's local time (carries their tz).
 */
export async function createTaskWithAi(
  input: string,
  localNow: string,
): Promise<WorkItemActionResult> {
  const user = await requireUser();
  const text = input.trim();
  if (!text) return { ok: false, error: 'Please enter a task.' };

  const cfg = getAiConfig();
  const client = getAiClient();
  if (!cfg || !client) return createManualTask(text); // no AI → deterministic

  const fallback = parseQuickTask(text);
  let capture;
  let usage;
  try {
    const prompt = buildCapturePrompt(text, localNow);
    const res = await client.complete(prompt);
    usage = res.usage;
    capture = parseCapture(res.content, fallback.title || text);
  } catch {
    return createManualTask(text); // AI failed → deterministic
  }

  const dueAt = capture.dueAt ?? fallback.dueAt;
  const kindLabel =
    capture.kind === 'call'
      ? 'Call'
      : capture.kind === 'meeting'
        ? 'Meeting'
        : capture.kind === 'reminder'
          ? 'Reminder'
          : 'Task';
  const who = capture.person ? ` with ${capture.person}` : '';

  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from('work_items')
    .insert({
      user_id: user.id,
      source: 'manual',
      title: capture.title,
      category: 'task',
      status: 'open',
      priority_score: priorityForDue(dueAt),
      due_at: dueAt,
      requires_reply: false,
      urgency_reason: `${kindLabel}${who} you added.`,
      metadata: { origin: 'ai_quick_add', kind: capture.kind, person: capture.person },
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  // Record the AI call for cost/usage tracking (best-effort) — in ai_analyses
  // (per-item history) and the unified ai_usage ledger the admin console reads.
  if (usage && inserted) {
    const cost = estimateCostUsd(cfg.model, usage, await getConfiguredAiRates());
    await supabase.from('ai_analyses').insert({
      user_id: user.id,
      work_item_id: inserted.id,
      model: cfg.model,
      prompt_version: 'capture-v1',
      input_summary: text.slice(0, 500),
      category: 'task',
      token_input: usage.inputTokens,
      token_output: usage.outputTokens,
      cost_estimate_usd: cost,
    });
    await recordAiUsage({
      userId: user.id,
      feature: 'capture',
      provider: cfg.provider,
      model: cfg.model,
      tokenInput: usage.inputTokens,
      tokenOutput: usage.outputTokens,
      costUsd: cost,
      workItemId: inserted.id,
    });
  }

  revalidatePath('/');
  return { ok: true };
}
