import { describe, it, expect } from 'vitest';
import { fmtDateTime, fmtDate, fmtRel, fmtUsd, fmtInt } from '@/lib/admin/format';

describe('admin/format', () => {
  it('formats USD with sensible precision', () => {
    expect(fmtUsd(0)).toBe('$0.00');
    expect(fmtUsd(null)).toBe('$0.00');
    expect(fmtUsd(12.5)).toBe('$12.50');
    expect(fmtUsd(0.0004)).toBe('$0.0004'); // sub-cent keeps 4 dp
  });

  it('formats integers with grouping', () => {
    expect(fmtInt(0)).toBe('0');
    expect(fmtInt(1234567)).toBe('1,234,567');
    expect(fmtInt(null)).toBe('0');
  });

  it('formats absolute UTC datetimes', () => {
    expect(fmtDateTime('2026-06-09T17:05:00Z')).toBe('2026-06-09 17:05 UTC');
    expect(fmtDate('2026-06-09T17:05:00Z')).toBe('2026-06-09');
    expect(fmtDateTime(null)).toBe('—');
    expect(fmtDateTime('not-a-date')).toBe('—');
  });

  it('formats coarse relative ages from a fixed now', () => {
    const now = Date.parse('2026-06-09T12:00:00Z');
    expect(fmtRel(null, now)).toBe('never');
    expect(fmtRel('2026-06-09T11:59:30Z', now)).toBe('30s ago');
    expect(fmtRel('2026-06-09T11:30:00Z', now)).toBe('30m ago');
    expect(fmtRel('2026-06-09T07:00:00Z', now)).toBe('5h ago');
    expect(fmtRel('2026-06-06T12:00:00Z', now)).toBe('3d ago');
  });
});
