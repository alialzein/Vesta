import { describe, expect, it } from 'vitest';
import { briefFingerprint, isBriefStale, type BriefSections } from '@/lib/dashboard/brief-guard';
import { BRIEF_PROMPT_VERSION } from '@/lib/ai/brief';

type Item = { id: string; overdue?: boolean };

const ITEMS: Item[] = [
  { id: 'a', overdue: true },
  { id: 'b' },
  { id: 'c' },
];

function sectionsFor(items: Item[], extra?: Partial<BriefSections>): BriefSections {
  return {
    prompt_version: BRIEF_PROMPT_VERSION,
    state: briefFingerprint(items),
    focus_item_id: null,
    ...extra,
  };
}

describe('briefFingerprint', () => {
  it('captures open + overdue counts', () => {
    expect(briefFingerprint(ITEMS)).toEqual({ open: 3, overdue: 1 });
    expect(briefFingerprint([])).toEqual({ open: 0, overdue: 0 });
  });
});

describe('isBriefStale', () => {
  it('is fresh when the queue matches the fingerprint', () => {
    expect(isBriefStale(sectionsFor(ITEMS, { focus_item_id: 'a' }), ITEMS)).toBe(false);
  });

  it('is stale when there is no fingerprint (pre-v2 cache) or an older prompt version', () => {
    expect(isBriefStale(null, ITEMS)).toBe(true);
    expect(isBriefStale({}, ITEMS)).toBe(true);
    expect(isBriefStale(sectionsFor(ITEMS, { prompt_version: 'brief-v1' }), ITEMS)).toBe(true);
  });

  it('is stale when something became overdue after the brief was written (the owner-caught bug)', () => {
    // Written when nothing was overdue…
    const written = sectionsFor([{ id: 'a' }, { id: 'b' }]);
    // …but now an item is overdue: "no overdue item in the queue" would be a lie.
    expect(isBriefStale(written, [{ id: 'a', overdue: true }, { id: 'b' }])).toBe(true);
  });

  it('is NOT stale when an overdue item got resolved (fewer overdue is fine)', () => {
    const written = sectionsFor(ITEMS); // 1 overdue at writing time
    expect(isBriefStale(written, [{ id: 'b' }, { id: 'c' }])).toBe(false);
  });

  it('is stale when the focus pick left the radar', () => {
    const written = sectionsFor(ITEMS, { focus_item_id: 'a' });
    expect(isBriefStale(written, [{ id: 'b' }, { id: 'c' }])).toBe(true);
  });

  it('tolerates plain count drift (marking a task done does not burn an AI call)', () => {
    const written = sectionsFor(ITEMS, { focus_item_id: 'b' }); // open=3
    expect(isBriefStale(written, [{ id: 'a', overdue: true }, { id: 'b' }])).toBe(false);
  });
});
