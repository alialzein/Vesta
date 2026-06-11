/**
 * Personal Intelligence Brief — Google News RSS source (pure helpers).
 *
 * Free, keyless, and privacy-clean: only the manager's TOPIC KEYWORDS are sent
 * to Google News — never email content or anything from the mailbox. Each
 * topic/company becomes one RSS search feed; the parser below turns the XML
 * into candidate items for the AI ranker.
 */

export type BriefingCandidate = {
  title: string;
  url: string;
  sourceName: string | null;
  /** Publisher homepage from the feed's <source url="…"> (favicon/logo). */
  sourceHomepage?: string | null;
  publishedAt: string | null; // ISO
  snippet: string | null;
  /** Which preference (topic/company) surfaced this candidate. */
  query: string;
};

/** Build the Google News search-RSS URL for one query. */
export function googleNewsFeedUrl(
  query: string,
  opts: { lang?: string; region?: string } = {},
): string {
  const lang = (opts.lang || 'en').toLowerCase();
  const region = (opts.region || 'US').toUpperCase();
  const params = new URLSearchParams({
    q: query,
    hl: lang,
    gl: region,
    ceid: `${region}:${lang}`,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

/** The feed queries for a manager's preferences: topics + tracked companies.
 *  Capped so one generation stays a handful of fast feed fetches. */
export function buildQueries(prefs: { topics: string[]; companies: string[] }, cap = 8): string[] {
  const all = [...prefs.topics, ...prefs.companies]
    .map((q) => q.trim())
    .filter(Boolean);
  return [...new Set(all)].slice(0, cap);
}

/** Decode the handful of XML/HTML entities Google News feeds actually use. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Strip tags from a description snippet (Google packs anchor markup in,
 *  usually entity-encoded — so decode FIRST, then drop the revealed tags). */
function stripTags(s: string): string {
  return decodeEntities(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagContent(block: string, tag: string): string | null {
  // CDATA first, then plain content.
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return plain ? plain[1].trim() : null;
}

/** Parse a Google News RSS document into candidates. Defensive: a malformed
 *  feed yields fewer items, never a throw. */
export function parseRssItems(xml: string, query: string): BriefingCandidate[] {
  const out: BriefingCandidate[] = [];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const block of items) {
    const rawTitle = tagContent(block, 'title');
    const url = tagContent(block, 'link');
    if (!rawTitle || !url) continue;
    const sourceName = tagContent(block, 'source');
    const sourceHomepage = block.match(/<source[^>]+url=["']([^"']+)["']/i)?.[1] ?? null;
    // Google appends " - Source" to titles; drop it when it matches the source tag.
    let title = decodeEntities(rawTitle);
    if (sourceName && title.endsWith(` - ${decodeEntities(sourceName)}`)) {
      title = title.slice(0, -(` - ${decodeEntities(sourceName)}`.length)).trim();
    }
    const pubDate = tagContent(block, 'pubDate');
    let publishedAt: string | null = null;
    if (pubDate) {
      const d = new Date(pubDate);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    const description = tagContent(block, 'description');
    out.push({
      title,
      url: decodeEntities(url),
      sourceName: sourceName ? decodeEntities(sourceName) : null,
      sourceHomepage: sourceHomepage ? decodeEntities(sourceHomepage) : null,
      publishedAt,
      snippet: description ? stripTags(description).slice(0, 300) : null,
      query,
    });
  }
  return out;
}

/** Stable dedupe key from the normalized title — the same story from two
 *  feeds (or two days) collapses to one. djb2 hex over the cleaned title. */
export function dedupeKeyOf(title: string): string {
  const norm = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 120);
  let h = 5381;
  for (let i = 0; i < norm.length; i++) h = ((h << 5) + h + norm.charCodeAt(i)) >>> 0;
  return `t:${h.toString(16)}:${norm.slice(0, 40).replace(/\s+/g, '-')}`;
}

/** Merge candidates from all feeds: drop blocked sources and stale items,
 *  dedupe by title, newest first, capped for the ranking prompt. */
export function mergeCandidates(
  lists: BriefingCandidate[][],
  opts: { blockedSources?: string[]; maxAgeHours?: number; cap?: number; now?: Date } = {},
): BriefingCandidate[] {
  const blocked = (opts.blockedSources ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  const maxAge = (opts.maxAgeHours ?? 72) * 60 * 60 * 1000;
  const now = (opts.now ?? new Date()).getTime();
  const seen = new Set<string>();
  const merged: BriefingCandidate[] = [];
  for (const c of lists.flat()) {
    if (blocked.some((b) => (c.sourceName ?? '').toLowerCase().includes(b))) continue;
    if (c.publishedAt && now - new Date(c.publishedAt).getTime() > maxAge) continue;
    const key = dedupeKeyOf(c.title);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(c);
  }
  merged.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  return merged.slice(0, opts.cap ?? 60);
}
