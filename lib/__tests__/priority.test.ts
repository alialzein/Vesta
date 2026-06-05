import { describe, expect, it } from 'vitest';
import { filterWorkItems, priorityBand } from '@/lib/priority';
import { demoWorkItems } from '@/lib/demo-data';

describe('priorityBand', () => {
  it('returns red for high scores (>= 85)', () => {
    expect(priorityBand(92)).toBe('red');
    expect(priorityBand(85)).toBe('red');
  });

  it('returns amber for mid scores (65-84)', () => {
    expect(priorityBand(84)).toBe('amber');
    expect(priorityBand(65)).toBe('amber');
  });

  it('returns green for low scores (< 65)', () => {
    expect(priorityBand(64)).toBe('green');
    expect(priorityBand(0)).toBe('green');
  });
});

describe('filterWorkItems', () => {
  it('returns all items for the "all" filter', () => {
    expect(filterWorkItems(demoWorkItems, 'all')).toHaveLength(demoWorkItems.length);
  });

  it('returns only items in a given category', () => {
    const result = filterWorkItems(demoWorkItems, 'delegate');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.categories.includes('delegate'))).toBe(true);
  });

  it('returns an empty array when no items match', () => {
    // 'fyi' is a valid category with no demo items.
    expect(filterWorkItems(demoWorkItems, 'fyi')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const before = [...demoWorkItems];
    filterWorkItems(demoWorkItems, 'critical');
    expect(demoWorkItems).toEqual(before);
  });
});
