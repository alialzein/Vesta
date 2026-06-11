'use server';

import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/dashboard/data';
import { buildBriefPrompt, parseBrief, BRIEF_PROMPT_VERSION, type BriefItem } from '@/lib/ai/brief';
import { getEffectiveAi } from '@/lib/ai/runtime';
import { estimateCostUsd } from '@/lib/ai/cost';
import { recordAiUsage } from '@/lib/ai/usage';
import { longTodayInTz, todayInTz } from '@/lib/time/zone';
import type { WorkItem } from '@/lib/types';

/**
 * Phase 11 — generate (and cache) today's AI daily brief.
 *
 * Called by the dashboard on first load of the day when no cached brief exists.
 * One AI call per user per day: the result is stored in `daily_briefs`
 * (unique user_id + brief_date), so reloads and other devices read the cache.
 * Every failure path returns ok:false and the dashboard simply keeps its
 * deterministic brief — this feature can never break the morning.
 */

export type BriefResult =
  | { ok: true; headline: string; body: string; focusItemId: string | null; focusReason: string | null }
  | { ok: false; reason: string };


function toBriefItem(w: WorkItem): BriefItem {
  const fresh = w.lastActivityAt
    ? Date.now() - new Date(w.lastActivityAt).getTime() < 24 * 60 * 60 * 1000
    : false;
  return {
    id: w.id,
    title: w.title,
    person: w.person ?? undefined,
    category: w.categories[0] ?? 'fyi',
    score: w.priorityScore,
    due: w.overdue ? (w.dueDetail ? `Overdue (${w.dueDetail})` : 'Overdue') : w.dueLabel || undefined,
    overdue: w.overdue,
    fresh,
    summary: w.summary,
  };
}

export async function generateDailyBrief(): Promise<BriefResult> {
  const user = await requireUser();
  const supabase = createClient();
  // "Today" follows the manager's clock — the brief rolls over at THEIR midnight.
  const { data: tzProfile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const tz = tzProfile?.timezone ?? 'UTC';
  const briefDate = todayInTz(tz);

  // Already written today (another tab/device won the race)? Serve the cache.
  const { data: cached } = await supabase
    .from('daily_briefs')
    .select('title, summary, sections')
    .eq('brief_date', briefDate)
    .maybeSingle();
  if (cached?.title && cached.summary) {
    const sections = (cached.sections as { focus_item_id?: string; focus_reason?: string } | null) ?? {};
    return {
      ok: true,
      headline: cached.title,
      body: cached.summary,
      focusItemId: sections.focus_item_id ?? null,
      focusReason: sections.focus_reason ?? null,
    };
  }

  // The same enriched view the radar shows (real senders, due labels, ranking).
  const { workItems } = await getDashboardData();
  if (workItems.length === 0) {
    return { ok: false, reason: 'Nothing in the queue — the all-clear brief needs no AI.' };
  }

  const eff = await getEffectiveAi(user.id, 'analysis');
  if (!eff) return { ok: false, reason: 'AI is not configured.' };
  if (eff.blocked) return { ok: false, reason: eff.blockedReason ?? 'AI is paused for this account.' };
  const { cfg, client, rates } = eff;

  const items = workItems.slice(0, 12).map(toBriefItem);
  const today = longTodayInTz(tz);

  try {
    const prompt = buildBriefPrompt({ items, today });
    const res = await client.complete(prompt);
    const brief = parseBrief(res.content, new Set(items.map((i) => i.id)));

    // Cache for the rest of the day (and for the other laptop/tab).
    await supabase.from('daily_briefs').upsert(
      {
        user_id: user.id,
        brief_date: briefDate,
        title: brief.headline,
        summary: brief.body,
        sections: {
          focus_item_id: brief.focusItemId,
          focus_reason: brief.focusReason,
          prompt_version: BRIEF_PROMPT_VERSION,
          item_count: workItems.length,
        },
        generated_by_model: cfg.model,
      },
      { onConflict: 'user_id,brief_date' },
    );

    await recordAiUsage({
      userId: user.id,
      feature: 'brief',
      provider: cfg.provider,
      model: cfg.model,
      tokenInput: res.usage.inputTokens,
      tokenOutput: res.usage.outputTokens,
      costUsd: estimateCostUsd(cfg.model, res.usage, rates),
      metadata: { prompt_version: BRIEF_PROMPT_VERSION },
    });

    return { ok: true, headline: brief.headline, body: brief.body, focusItemId: brief.focusItemId, focusReason: brief.focusReason };
  } catch (err) {
    await recordAiUsage({
      userId: user.id,
      feature: 'brief',
      provider: cfg.provider,
      model: cfg.model,
      error: err instanceof Error ? err.message : 'brief generation failed',
      metadata: { prompt_version: BRIEF_PROMPT_VERSION },
    });
    return { ok: false, reason: 'Could not generate the brief — the morning continues without it.' };
  }
}
