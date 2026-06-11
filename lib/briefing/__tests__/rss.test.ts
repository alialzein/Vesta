import { describe, expect, it } from 'vitest';
import {
  buildQueries,
  dedupeKeyOf,
  googleNewsFeedUrl,
  mergeCandidates,
  parseRssItems,
  type BriefingCandidate,
} from '@/lib/briefing/rss';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>"AI regulation" - Google News</title>
  <item>
    <title>New AI data regulation announced in the UAE - Gulf Times</title>
    <link>https://news.google.com/rss/articles/abc123</link>
    <pubDate>Thu, 11 Jun 2026 06:00:00 GMT</pubDate>
    <source url="https://gulftimes.example">Gulf Times</source>
    <description>&lt;a href="https://x"&gt;New AI data regulation announced&lt;/a&gt;&amp;nbsp;covering data storage rules.</description>
  </item>
  <item>
    <title><![CDATA[Markets rally as tech earnings beat expectations - Reuters]]></title>
    <link>https://news.google.com/rss/articles/def456</link>
    <pubDate>Wed, 10 Jun 2026 18:30:00 GMT</pubDate>
    <source url="https://reuters.example">Reuters</source>
  </item>
  <item><title>No link, should be skipped</title></item>
</channel></rss>`;

describe('googleNewsFeedUrl / buildQueries', () => {
  it('builds a per-query search feed with language + region', () => {
    const url = googleNewsFeedUrl('UAE data privacy law', { lang: 'en', region: 'AE' });
    expect(url).toContain('news.google.com/rss/search');
    expect(url).toContain('q=UAE+data+privacy+law');
    expect(url).toContain('gl=AE');
    expect(url).toContain('ceid=AE%3Aen');
  });

  it('merges topics + companies, trimmed, deduped, capped', () => {
    expect(
      buildQueries({ topics: [' AI ', 'AI', ''], companies: ['Microsoft'] }),
    ).toEqual(['AI', 'Microsoft']);
    expect(buildQueries({ topics: Array.from({ length: 20 }, (_, i) => `t${i}`), companies: [] })).toHaveLength(8);
  });
});

describe('parseRssItems', () => {
  it('parses items with entities, CDATA, dates, and source suffix stripping', () => {
    const items = parseRssItems(FEED, 'AI regulation');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('New AI data regulation announced in the UAE');
    expect(items[0].sourceName).toBe('Gulf Times');
    expect(items[0].sourceHomepage).toBe('https://gulftimes.example');
    expect(items[0].publishedAt).toBe('2026-06-11T06:00:00.000Z');
    expect(items[0].snippet).toContain('covering data storage rules');
    expect(items[0].snippet).not.toContain('<a');
    expect(items[1].title).toBe('Markets rally as tech earnings beat expectations');
    expect(items[1].query).toBe('AI regulation');
  });

  it('returns an empty list for junk input', () => {
    expect(parseRssItems('not xml at all', 'q')).toEqual([]);
  });
});

describe('dedupeKeyOf / mergeCandidates', () => {
  const make = (title: string, over: Partial<BriefingCandidate> = {}): BriefingCandidate => ({
    title,
    url: `https://x/${title}`,
    sourceName: 'Src',
    publishedAt: '2026-06-11T06:00:00.000Z',
    snippet: null,
    query: 'q',
    ...over,
  });

  it('keys ignore punctuation/case so the same story collapses', () => {
    expect(dedupeKeyOf('UAE: AI Regulation Announced!')).toBe(
      dedupeKeyOf('uae ai regulation announced'),
    );
  });

  it('dedupes, drops blocked sources and stale items, sorts newest first', () => {
    const now = new Date('2026-06-11T12:00:00.000Z');
    const merged = mergeCandidates(
      [
        [
          make('Story A'),
          make('story a!', { sourceName: 'Other' }), // duplicate of A
          make('Blocked story', { sourceName: 'Tabloid Daily' }),
          make('Old story', { publishedAt: '2026-06-01T00:00:00.000Z' }),
          make('Story B', { publishedAt: '2026-06-11T09:00:00.000Z' }),
        ],
      ],
      { blockedSources: ['tabloid'], now },
    );
    expect(merged.map((c) => c.title)).toEqual(['Story B', 'Story A']);
  });
});
