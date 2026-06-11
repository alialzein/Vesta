import 'server-only';
import OpenAI from 'openai';
import type { AiUsage } from '@/lib/ai/types';
import type { BriefingCandidate } from './rss';

/**
 * Personal Intelligence Brief — the "AI search" engine (manager-selectable in
 * the briefing preferences). The model uses the provider's web_search tool to
 * find RECENT items for the manager's topics and returns structured
 * candidates; the normal ranking prompt then personalizes them like any
 * other candidates.
 *
 * Anything going wrong here (model/tool unsupported, parse failure, timeouts)
 * returns null and the caller silently falls back to Google News RSS — the
 * briefing must never come up empty because of an engine experiment.
 */

type AiSearchResult = { candidates: BriefingCandidate[]; usage: AiUsage };

export async function aiSearchCandidates(opts: {
  apiKey: string;
  model: string;
  queries: string[];
  region?: string | null;
  today: string;
}): Promise<AiSearchResult | null> {
  if (opts.queries.length === 0) return null;
  try {
    const client = new OpenAI({ apiKey: opts.apiKey });
    const resp = await client.responses.create({
      model: opts.model,
      tools: [{ type: 'web_search' }],
      input: [
        'Search the web for RECENT news (last 48 hours preferred, last 7 days max) on each of these topics:',
        ...opts.queries.map((q) => `- ${q}`),
        opts.region ? `Prefer coverage relevant to region: ${opts.region}.` : '',
        `Today is ${opts.today}.`,
        'Return ONLY a JSON array (no prose, no code fences) of up to 25 items:',
        '[{"title": "...", "url": "https://...", "source": "publication name", "publishedAt": "ISO 8601 or null", "snippet": "1-2 sentence factual summary", "query": "which topic above this matches"}]',
        'Only include items you actually found via search, with their real URLs. Never invent items or URLs.',
      ]
        .filter(Boolean)
        .join('\n'),
    });

    const text = resp.output_text ?? '';
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end <= start) return null;
    const arr = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>[];

    const candidates: BriefingCandidate[] = [];
    for (const it of arr) {
      const title = String(it.title ?? '').trim();
      const url = String(it.url ?? '').trim();
      if (!title || !/^https?:\/\//i.test(url)) continue;
      let publishedAt: string | null = null;
      if (typeof it.publishedAt === 'string') {
        const d = new Date(it.publishedAt);
        if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
      }
      candidates.push({
        title,
        url,
        sourceName: it.source ? String(it.source).trim() || null : null,
        publishedAt,
        snippet: it.snippet ? String(it.snippet).trim().slice(0, 300) || null : null,
        query: it.query ? String(it.query).trim() || 'ai_search' : 'ai_search',
      });
    }
    if (candidates.length === 0) return null;

    return {
      candidates,
      usage: {
        inputTokens: resp.usage?.input_tokens ?? 0,
        outputTokens: resp.usage?.output_tokens ?? 0,
      },
    };
  } catch {
    return null; // caller falls back to Google News RSS
  }
}
