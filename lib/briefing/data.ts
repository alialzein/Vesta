import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { todayInTz } from '@/lib/time/zone';

/**
 * Personal Intelligence Brief — shared shapes + the page loader.
 * (Kept out of the actions file: 'use server' modules may only export
 * async functions.)
 */

export type BriefingPrefs = {
  enabled: boolean;
  sourceEngine: 'google_rss' | 'ai_search';
  itemsPerDay: number;
  languages: string[];
  region: string | null;
  topics: string[];
  companies: string[];
  blockedSources: string[];
  tone: 'executive' | 'detailed';
};

export type BriefingItemView = {
  id: string;
  rank: number;
  title: string;
  summary: string | null;
  whyItMatters: string | null;
  suggestedAction: string | null;
  category: string | null;
  relevanceScore: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  status: 'unread' | 'read' | 'saved' | 'dismissed';
};

export type PrefsRow = Database['public']['Tables']['briefing_preferences']['Row'];
export type ItemRow = Database['public']['Tables']['briefing_items']['Row'];

export const DEFAULT_PREFS: BriefingPrefs = {
  enabled: true,
  sourceEngine: 'google_rss',
  itemsPerDay: 8,
  languages: ['en'],
  region: null,
  topics: [],
  companies: [],
  blockedSources: [],
  tone: 'executive',
};

export function toPrefs(row: PrefsRow | null): BriefingPrefs {
  if (!row) return DEFAULT_PREFS;
  return {
    enabled: row.enabled,
    sourceEngine: row.source_engine === 'ai_search' ? 'ai_search' : 'google_rss',
    itemsPerDay: Math.max(3, Math.min(15, row.items_per_day || 8)),
    languages: row.languages?.length ? row.languages : ['en'],
    region: row.region,
    topics: row.topics ?? [],
    companies: row.companies ?? [],
    blockedSources: row.blocked_sources ?? [],
    tone: row.tone === 'detailed' ? 'detailed' : 'executive',
  };
}

export function toItemView(r: ItemRow): BriefingItemView {
  return {
    id: r.id,
    rank: r.rank,
    title: r.title,
    summary: r.summary,
    whyItMatters: r.why_it_matters,
    suggestedAction: r.suggested_action,
    category: r.category,
    relevanceScore: r.relevance_score,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    publishedAt: r.published_at,
    status: (['read', 'saved', 'dismissed'].includes(r.status)
      ? r.status
      : 'unread') as BriefingItemView['status'],
  };
}

export type BriefingData = {
  prefs: BriefingPrefs;
  /** True when the manager has saved preferences at least once. */
  configured: boolean;
  /** Today's items (manager's calendar date), rank order, dismissed excluded. */
  items: BriefingItemView[];
  /** Items the manager saved for later (any day), newest first. */
  saved: BriefingItemView[];
  briefDate: string;
  timezone: string;
};

/** Everything the Briefing page needs (RLS-scoped). */
export async function getBriefingData(): Promise<BriefingData> {
  const supabase = createClient();
  const [{ data: prefsRow }, { data: tzProfile }] = await Promise.all([
    supabase.from('briefing_preferences').select('*').limit(1).maybeSingle(),
    supabase.from('profiles').select('timezone').limit(1).maybeSingle(),
  ]);
  const timezone = tzProfile?.timezone ?? 'UTC';
  const briefDate = todayInTz(timezone);

  const [{ data: todayRows }, { data: savedRows }] = await Promise.all([
    supabase
      .from('briefing_items')
      .select('*')
      .eq('brief_date', briefDate)
      .neq('status', 'dismissed')
      .order('rank', { ascending: true })
      .limit(30),
    supabase
      .from('briefing_items')
      .select('*')
      .eq('status', 'saved')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const items = ((todayRows ?? []) as ItemRow[]).map(toItemView);
  const savedToday = new Set(items.filter((i) => i.status === 'saved').map((i) => i.id));
  const saved = ((savedRows ?? []) as ItemRow[])
    .map(toItemView)
    .filter((i) => !savedToday.has(i.id));

  return {
    prefs: toPrefs((prefsRow as PrefsRow | null) ?? null),
    configured: prefsRow != null,
    items,
    saved,
    briefDate,
    timezone,
  };
}
