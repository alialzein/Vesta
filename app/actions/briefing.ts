'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import { toPrefs, type BriefingPrefs, type PrefsRow } from '@/lib/briefing/data';
import {
  buildQueries,
  dedupeKeyOf,
  googleNewsFeedUrl,
  mergeCandidates,
  parseRssItems,
  type BriefingCandidate,
} from '@/lib/briefing/rss';
import { aiSearchCandidates } from '@/lib/briefing/ai-search';
import { buildBriefingPrompt, parseBriefing, BRIEFING_PROMPT_VERSION } from '@/lib/ai/briefing';
import { getEffectiveAi } from '@/lib/ai/runtime';
import { estimateCostUsd } from '@/lib/ai/cost';
import { recordAiUsage } from '@/lib/ai/usage';
import { getAiConfig } from '@/lib/ai/config';
import { longTodayInTz, todayInTz } from '@/lib/time/zone';

/**
 * Personal Intelligence Brief — server actions.
 *
 * Generation runs ONCE per day per manager (first visit; Refresh forces a
 * re-run): fetch candidates from the chosen engine (Google News RSS, or AI
 * web-search with silent RSS fallback), rank/personalize with one AI call,
 * store the selection in briefing_items. Privacy rule: only the manager's
 * topic keywords leave the app — never anything from the mailbox.
 */

/** Save the manager's briefing preferences (upsert; first save creates the row). */
export async function saveBriefingPreferences(
  prefs: Partial<BriefingPrefs>,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const supabase = createClient();
  const clean = (list?: string[]) =>
    [...new Set((list ?? []).map((s) => s.trim()).filter(Boolean))].slice(0, 25);
  const { error } = await supabase.from('briefing_preferences').upsert(
    {
      user_id: user.id,
      ...(prefs.enabled !== undefined ? { enabled: prefs.enabled } : {}),
      ...(prefs.sourceEngine ? { source_engine: prefs.sourceEngine } : {}),
      ...(prefs.itemsPerDay ? { items_per_day: Math.max(3, Math.min(15, prefs.itemsPerDay)) } : {}),
      ...(prefs.languages ? { languages: clean(prefs.languages) } : {}),
      ...(prefs.region !== undefined ? { region: prefs.region?.trim() || null } : {}),
      ...(prefs.topics ? { topics: clean(prefs.topics) } : {}),
      ...(prefs.companies ? { companies: clean(prefs.companies) } : {}),
      ...(prefs.blockedSources ? { blocked_sources: clean(prefs.blockedSources) } : {}),
      ...(prefs.tone ? { tone: prefs.tone } : {}),
    },
    { onConflict: 'user_id' },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath('/briefing');
  return { ok: true };
}

/** Mark an item read / saved / dismissed. */
export async function setBriefingItemStatus(
  itemId: string,
  status: 'read' | 'saved' | 'dismissed' | 'unread',
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase
    .from('briefing_items')
    .update({ status })
    .eq('id', itemId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Fetch one Google News feed with a timeout; failures yield an empty list. */
async function fetchFeed(url: string, query: string): Promise<BriefingCandidate[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'VestaBriefing/1.0 (+rss reader)' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    return parseRssItems(await res.text(), query);
  } catch {
    return [];
  }
}

export type GenerateBriefingResult =
  | { ok: true; generated: number }
  | { ok: false; reason: string };

/**
 * Generate today's briefing (no-op when today's items already exist, unless
 * `force`). One AI ranking call; candidates come from the preferred engine.
 */
export async function generateBriefing(force = false): Promise<GenerateBriefingResult> {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: prefsRow }, { data: profile }] = await Promise.all([
    supabase.from('briefing_preferences').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('timezone, role').eq('id', user.id).maybeSingle(),
  ]);
  const prefs = toPrefs((prefsRow as PrefsRow | null) ?? null);
  if (!prefs.enabled) return { ok: false, reason: 'The briefing is turned off in preferences.' };
  if (prefs.topics.length === 0 && prefs.companies.length === 0) {
    return { ok: false, reason: 'Pick at least one topic to follow (Preferences).' };
  }

  const tz = profile?.timezone ?? 'UTC';
  const briefDate = todayInTz(tz);

  if (!force) {
    const { count } = await supabase
      .from('briefing_items')
      .select('id', { count: 'exact', head: true })
      .eq('brief_date', briefDate);
    if ((count ?? 0) > 0) return { ok: true, generated: 0 }; // today is already built
  }

  const eff = await getEffectiveAi(user.id, 'analysis');
  if (!eff) return { ok: false, reason: 'AI is not configured.' };
  if (eff.blocked) return { ok: false, reason: eff.blockedReason ?? 'AI is paused for this account.' };
  const { cfg, client, rates } = eff;

  // ---- Candidates from the chosen engine --------------------------------
  const queries = buildQueries(prefs);
  const lang = prefs.languages[0] ?? 'en';
  const today = longTodayInTz(tz);
  let candidates: BriefingCandidate[] = [];
  let engineUsed: 'google_rss' | 'ai_search' = 'google_rss';

  if (prefs.sourceEngine === 'ai_search') {
    const envCfg = getAiConfig();
    const search = envCfg
      ? await aiSearchCandidates({
          apiKey: envCfg.apiKey,
          model: cfg.model,
          queries,
          region: prefs.region,
          today,
        })
      : null;
    if (search) {
      engineUsed = 'ai_search';
      candidates = mergeCandidates([search.candidates], {
        blockedSources: prefs.blockedSources,
        maxAgeHours: 7 * 24,
      });
      await recordAiUsage({
        userId: user.id,
        feature: 'brief',
        provider: cfg.provider,
        model: cfg.model,
        tokenInput: search.usage.inputTokens,
        tokenOutput: search.usage.outputTokens,
        costUsd: estimateCostUsd(cfg.model, search.usage, rates),
        metadata: { kind: 'briefing_search', prompt_version: BRIEFING_PROMPT_VERSION },
      });
    }
    // null → silently fall back to RSS below.
  }

  if (candidates.length === 0) {
    const feeds = await Promise.all(
      queries.map((q) => fetchFeed(googleNewsFeedUrl(q, { lang, region: prefs.region ?? undefined }), q)),
    );
    candidates = mergeCandidates(feeds, { blockedSources: prefs.blockedSources });
    engineUsed = 'google_rss';
  }
  if (candidates.length === 0) {
    return { ok: false, reason: 'No fresh news found for your topics — try broader topics or another region.' };
  }

  // Skip stories the manager has already seen on previous days.
  const keys = candidates.map((c) => dedupeKeyOf(c.title));
  const { data: seenRows } = await supabase
    .from('briefing_items')
    .select('dedupe_key')
    .in('dedupe_key', keys);
  const seen = new Set((seenRows ?? []).map((r) => r.dedupe_key));
  const fresh = candidates.filter((c) => !seen.has(dedupeKeyOf(c.title)));
  if (fresh.length === 0) return { ok: false, reason: 'Nothing new since your last briefing.' };

  // ---- One AI ranking/personalization call -------------------------------
  const prompt = buildBriefingPrompt({
    candidates: fresh.slice(0, 40),
    topics: prefs.topics,
    companies: prefs.companies,
    role: profile?.role ?? null,
    tone: prefs.tone,
    itemsWanted: prefs.itemsPerDay,
    today,
  });

  try {
    const res = await client.complete(prompt);
    const ranked = parseBriefing(res.content, Math.min(fresh.length, 40));

    const rows = ranked.slice(0, prefs.itemsPerDay).map((it, i) => {
      const c = fresh[it.candidateIndex];
      return {
        user_id: user.id,
        brief_date: briefDate,
        rank: i,
        title: it.title,
        summary: it.summary,
        why_it_matters: it.whyItMatters,
        suggested_action: it.suggestedAction,
        category: it.category,
        relevance_score: it.relevanceScore,
        source_name: c.sourceName,
        source_url: c.url,
        published_at: c.publishedAt,
        dedupe_key: dedupeKeyOf(c.title),
        metadata: {
          engine: engineUsed,
          matched_query: c.query,
          prompt_version: BRIEFING_PROMPT_VERSION,
        } as Json,
      };
    });

    if (force) {
      // A refresh replaces today's unhandled items; saved ones are kept.
      await supabase
        .from('briefing_items')
        .delete()
        .eq('brief_date', briefDate)
        .neq('status', 'saved');
    }
    // Ignore per-row dedupe conflicts (story already stored on an earlier day).
    const { error } = await supabase
      .from('briefing_items')
      .upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
    if (error) return { ok: false, reason: error.message };

    await recordAiUsage({
      userId: user.id,
      feature: 'brief',
      provider: cfg.provider,
      model: cfg.model,
      tokenInput: res.usage.inputTokens,
      tokenOutput: res.usage.outputTokens,
      costUsd: estimateCostUsd(cfg.model, res.usage, rates),
      metadata: {
        kind: 'briefing_rank',
        engine: engineUsed,
        prompt_version: BRIEFING_PROMPT_VERSION,
        candidates: fresh.length,
        selected: rows.length,
      },
    });

    revalidatePath('/briefing');
    return { ok: true, generated: rows.length };
  } catch (err) {
    await recordAiUsage({
      userId: user.id,
      feature: 'brief',
      provider: cfg.provider,
      model: cfg.model,
      error: err instanceof Error ? err.message : 'briefing generation failed',
      metadata: { kind: 'briefing_rank', prompt_version: BRIEFING_PROMPT_VERSION },
    });
    return { ok: false, reason: 'Could not build the briefing — try Refresh in a moment.' };
  }
}
