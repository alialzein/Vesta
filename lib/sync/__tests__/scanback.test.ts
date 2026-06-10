import { describe, expect, it } from 'vitest';
import { applyScanBack, isWithinScanBack, scanBackCutoffIso } from '@/lib/sync/scanback';

const CUTOFF = '2026-06-03T00:00:00.000Z';

describe('scan-back window (initial import bound)', () => {
  it('keeps messages at/after the cutoff and drops older ones', () => {
    expect(isWithinScanBack({ receivedDateTime: '2026-06-05T10:00:00Z' }, CUTOFF)).toBe(true);
    expect(isWithinScanBack({ receivedDateTime: '2026-06-01T10:00:00Z' }, CUTOFF)).toBe(false);
  });

  it('falls back to sentDateTime and keeps undated messages', () => {
    expect(isWithinScanBack({ sentDateTime: '2026-06-04T08:00:00Z' }, CUTOFF)).toBe(true);
    expect(isWithinScanBack({ sentDateTime: '2026-05-30T08:00:00Z' }, CUTOFF)).toBe(false);
    expect(isWithinScanBack({}, CUTOFF)).toBe(true);
  });

  it('applyScanBack filters a batch; null cutoff keeps everything', () => {
    const msgs = [
      { id: 'old', receivedDateTime: '2026-05-01T00:00:00Z' },
      { id: 'new', receivedDateTime: '2026-06-09T00:00:00Z' },
    ];
    expect(applyScanBack(msgs, CUTOFF).map((m) => m.id)).toEqual(['new']);
    expect(applyScanBack(msgs, null)).toHaveLength(2);
  });

  it('computes the cutoff N days back', () => {
    const now = Date.parse('2026-06-10T00:00:00Z');
    expect(scanBackCutoffIso(7, now)).toBe('2026-06-03T00:00:00.000Z');
  });
});
