/**
 * Personal Intelligence Brief — the personalization prompt + defensive parser.
 *
 * The model does NOT fetch news. It receives candidate headlines (from Google
 * News RSS or the AI-search engine) plus the manager's context, and returns
 * the few that matter — rewritten as executive intelligence: what happened,
 * WHY IT MATTERS to this manager, and what to do about it. It must never
 * invent stories: every output item references a given candidate index.
 */
import { extractJson } from './schema';
import type { BriefingCandidate } from '@/lib/briefing/rss';

export const BRIEFING_PROMPT_VERSION = 'briefing-v1';

export const BRIEFING_CATEGORIES = [
  'must_know',
  'industry',
  'technology',
  'client_competitor',
  'regulation_risk',
  'market',
  'other',
] as const;
export type BriefingCategory = (typeof BRIEFING_CATEGORIES)[number];

export type RankedBriefingItem = {
  /** Index into the candidate list — the proof the story wasn't invented. */
  candidateIndex: number;
  title: string;
  summary: string;
  whyItMatters: string;
  suggestedAction: string | null;
  category: BriefingCategory;
  /** 0–100 manager-relevance. */
  relevanceScore: number;
};

export const BRIEFING_JSON_HINT = `{
  "items": [
    {
      "candidateIndex": 0,
      "title": "clear, de-clickbaited headline",
      "summary": "1-2 plain sentences: what actually happened",
      "whyItMatters": "1 sentence: why THIS manager should care, tied to their role/topics/companies",
      "suggestedAction": "one concrete step (share with X, review Y, no action needed -> null)",
      "category": "must_know" | "industry" | "technology" | "client_competitor" | "regulation_risk" | "market" | "other",
      "relevanceScore": 0-100
    }
  ]
}`;

export function buildBriefingPrompt(input: {
  candidates: BriefingCandidate[];
  topics: string[];
  companies: string[];
  role?: string | null;
  tone?: string;
  itemsWanted: number;
  today: string;
}): { system: string; user: string } {
  const system = [
    "You are Vesta, a manager's chief of staff, curating their PERSONAL INTELLIGENCE BRIEF from candidate headlines.",
    'Return ONLY a JSON object — no prose, no code fences.',
    'Rules:',
    `- Select the ${input.itemsWanted} MOST relevant candidates for this manager. Fewer is fine if little is relevant; never pad with weak items.`,
    '- Use ONLY the given candidates (reference each by candidateIndex). Never invent stories, facts, numbers, or sources.',
    '- Deduplicate: if several candidates cover the same story, pick the best one.',
    '- De-clickbait titles; summaries are plain, factual, and short.',
    '- whyItMatters must be SPECIFIC to this manager (their role, topics, tracked companies) — not generic "this is important".',
    '- suggestedAction is one concrete step the manager could take, or null when it is purely awareness.',
    '- Rank by manager relevance (relevanceScore), most relevant first. "must_know" is reserved for items the manager would regret missing.',
    input.tone === 'detailed'
      ? '- Tone: a bit more analytical detail is welcome (2 sentences of summary).'
      : '- Tone: tight executive language. No fluff.',
    `Return exactly this shape:\n${BRIEFING_JSON_HINT}`,
  ].join('\n');

  const lines = input.candidates.map((c, i) => {
    const parts = [
      `[${i}]`,
      `title=${JSON.stringify(c.title)}`,
      c.sourceName ? `source=${JSON.stringify(c.sourceName)}` : null,
      c.publishedAt ? `published=${c.publishedAt}` : null,
      `matched=${JSON.stringify(c.query)}`,
      c.snippet ? `snippet=${JSON.stringify(c.snippet.slice(0, 200))}` : null,
    ].filter(Boolean);
    return parts.join(' | ');
  });

  const user = [
    `Today: ${input.today}`,
    input.role ? `Manager role: ${input.role}` : null,
    `Manager topics: ${input.topics.join(', ') || '(none set)'}`,
    input.companies.length > 0 ? `Tracked companies/clients/competitors: ${input.companies.join(', ')}` : null,
    `Candidates (${input.candidates.length}):`,
    ...lines,
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user };
}

function asCategory(v: unknown): BriefingCategory {
  return BRIEFING_CATEGORIES.includes(v as BriefingCategory) ? (v as BriefingCategory) : 'other';
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Parse + validate the model's selection. Items pointing at unknown
 *  candidates are dropped (the model must not invent news). Throws only when
 *  nothing usable came back. */
export function parseBriefing(raw: string, candidateCount: number): RankedBriefingItem[] {
  const obj = JSON.parse(extractJson(raw)) as { items?: unknown };
  if (!Array.isArray(obj.items)) throw new Error('Briefing has no items array');

  const seen = new Set<number>();
  const items: RankedBriefingItem[] = [];
  for (const it of obj.items as Record<string, unknown>[]) {
    const idx = typeof it.candidateIndex === 'number' ? it.candidateIndex : Number(it.candidateIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidateCount || seen.has(idx)) continue;
    const title = String(it.title ?? '').trim();
    const summary = String(it.summary ?? '').trim();
    const why = String(it.whyItMatters ?? '').trim();
    if (!title || !why) continue;
    seen.add(idx);
    items.push({
      candidateIndex: idx,
      title,
      summary: summary || title,
      whyItMatters: why,
      suggestedAction: it.suggestedAction ? String(it.suggestedAction).trim() || null : null,
      category: asCategory(it.category),
      relevanceScore: clampScore(it.relevanceScore),
    });
  }
  if (items.length === 0) throw new Error('Briefing selection was empty/invalid');
  items.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return items;
}
