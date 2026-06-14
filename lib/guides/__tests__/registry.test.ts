import { describe, expect, it } from 'vitest';
import {
  GUIDES,
  GUIDE_GROUPS,
  getGuideMeta,
  guidesByGroup,
  isGuideSlug,
  neighbours,
} from '@/lib/guides/registry';

describe('guide registry', () => {
  it('never exposes the operator-only admin guide or the folder README', () => {
    expect(isGuideSlug('admin-panel')).toBe(false);
    expect(isGuideSlug('readme')).toBe(false);
    expect(isGuideSlug('README')).toBe(false);
  });

  it('every guide points at a real group', () => {
    const ids = new Set(GUIDE_GROUPS.map((g) => g.id));
    for (const guide of GUIDES) expect(ids.has(guide.group)).toBe(true);
  });

  it('has no duplicate slugs', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('guidesByGroup covers every guide exactly once, in order', () => {
    const flattened = guidesByGroup().flatMap((b) => b.guides.map((g) => g.slug));
    expect(flattened).toEqual(GUIDES.map((g) => g.slug));
  });

  it('getGuideMeta resolves known slugs and rejects unknown ones', () => {
    expect(getGuideMeta('getting-started')?.title).toBe('Getting started');
    expect(getGuideMeta('does-not-exist')).toBeUndefined();
  });

  it('neighbours wires up previous/next across reading order', () => {
    const first = GUIDES[0].slug;
    const last = GUIDES[GUIDES.length - 1].slug;
    expect(neighbours(first).prev).toBeUndefined();
    expect(neighbours(first).next?.slug).toBe(GUIDES[1].slug);
    expect(neighbours(last).next).toBeUndefined();
    expect(neighbours(last).prev?.slug).toBe(GUIDES[GUIDES.length - 2].slug);
    expect(neighbours('nope')).toEqual({});
  });
});
