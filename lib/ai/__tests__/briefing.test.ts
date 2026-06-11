import { describe, expect, it } from 'vitest';
import { buildBriefingPrompt, parseBriefing } from '@/lib/ai/briefing';
import type { BriefingCandidate } from '@/lib/briefing/rss';

const CANDIDATES: BriefingCandidate[] = [
  {
    title: 'New AI data regulation announced in the UAE',
    url: 'https://news.example/1',
    sourceName: 'Gulf Times',
    publishedAt: '2026-06-11T06:00:00.000Z',
    snippet: 'Covers data storage rules for AI workflows.',
    query: 'UAE data privacy law',
  },
  {
    title: 'Markets rally as tech earnings beat expectations',
    url: 'https://news.example/2',
    sourceName: 'Reuters',
    publishedAt: '2026-06-10T18:30:00.000Z',
    snippet: null,
    query: 'Business and markets',
  },
];

describe('buildBriefingPrompt', () => {
  it('includes the candidates by index, the manager context, and the contract', () => {
    const { system, user } = buildBriefingPrompt({
      candidates: CANDIDATES,
      topics: ['AI and technology', 'UAE data privacy law'],
      companies: ['Microsoft'],
      role: 'Managing Director',
      itemsWanted: 8,
      today: 'Thursday, June 11, 2026',
    });
    expect(user).toContain('[0] | title="New AI data regulation announced in the UAE"');
    expect(user).toContain('[1] |');
    expect(user).toContain('Manager role: Managing Director');
    expect(user).toContain('Tracked companies/clients/competitors: Microsoft');
    expect(system).toContain('candidateIndex');
    expect(system).toContain('Never invent stories');
    expect(system).toContain('Return ONLY a JSON object');
  });
});

describe('parseBriefing', () => {
  it('parses a valid selection and sorts by relevance', () => {
    const items = parseBriefing(
      JSON.stringify({
        items: [
          {
            candidateIndex: 1,
            title: 'Tech earnings beat',
            summary: 'Earnings beat expectations.',
            whyItMatters: 'Your vendors are in this sector.',
            suggestedAction: null,
            category: 'market',
            relevanceScore: 60,
          },
          {
            candidateIndex: 0,
            title: 'UAE AI data regulation',
            summary: 'New rules on AI data storage.',
            whyItMatters: 'May affect how you store customer data.',
            suggestedAction: 'Share with Legal and IT.',
            category: 'regulation_risk',
            relevanceScore: 90,
          },
        ],
      }),
      2,
    );
    expect(items).toHaveLength(2);
    expect(items[0].candidateIndex).toBe(0); // higher relevance first
    expect(items[0].category).toBe('regulation_risk');
    expect(items[1].suggestedAction).toBeNull();
  });

  it('drops invented or duplicate candidate indexes and junk categories', () => {
    const items = parseBriefing(
      JSON.stringify({
        items: [
          { candidateIndex: 99, title: 'Invented', summary: 's', whyItMatters: 'w' },
          { candidateIndex: 0, title: 'Real', summary: 's', whyItMatters: 'w', category: 'nonsense' },
          { candidateIndex: 0, title: 'Dup', summary: 's', whyItMatters: 'w' },
        ],
      }),
      2,
    );
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Real');
    expect(items[0].category).toBe('other');
  });

  it('throws when nothing usable came back (caller surfaces an honest error)', () => {
    expect(() => parseBriefing('{"items": []}', 2)).toThrow();
    expect(() => parseBriefing('no json', 2)).toThrow();
  });
});
