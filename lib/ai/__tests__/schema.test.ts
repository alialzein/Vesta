import { describe, expect, it } from 'vitest';
import { parseAnalysis, extractJson } from '@/lib/ai/schema';

const valid = JSON.stringify({
  summary: 'Maya needs Q3 budget sign-off.',
  category: 'waiting',
  priority: 88,
  deadline: '2026-06-12',
  nextAction: 'Approve the Q3 budget so vendor contracts proceed.',
  reason: 'Vendor contracts are blocked on your approval.',
});

describe('extractJson', () => {
  it('pulls JSON out of code fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it('pulls JSON out of surrounding prose', () => {
    expect(extractJson('Here you go: {"a":1} thanks')).toBe('{"a":1}');
  });
  it('throws when there is no object', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('parseAnalysis', () => {
  it('parses a valid response', () => {
    const a = parseAnalysis(valid);
    expect(a.category).toBe('waiting');
    expect(a.priority).toBe(88);
    expect(a.deadline).toBe('2026-06-12');
    expect(a.nextAction).toMatch(/Approve/);
  });

  it('tolerates code fences and preamble', () => {
    const a = parseAnalysis('Sure!\n```json\n' + valid + '\n```');
    expect(a.summary).toMatch(/Q3 budget/);
  });

  it('clamps priority to 0-100 and rounds', () => {
    expect(parseAnalysis(JSON.stringify({ summary: 'x', priority: 150 })).priority).toBe(100);
    expect(parseAnalysis(JSON.stringify({ summary: 'x', priority: -5 })).priority).toBe(0);
    expect(parseAnalysis(JSON.stringify({ summary: 'x', priority: 73.6 })).priority).toBe(74);
  });

  it('falls back to a safe category for an unknown one', () => {
    expect(parseAnalysis(JSON.stringify({ summary: 'x', category: 'banana' })).category).toBe(
      'followup',
    );
  });

  it('nulls an invalid deadline', () => {
    expect(parseAnalysis(JSON.stringify({ summary: 'x', deadline: 'soon' })).deadline).toBeNull();
  });

  it('keeps a stated deadline time (v4) and rejects malformed ones', () => {
    const at = (deadlineTime: unknown, deadline: unknown = '2026-06-12') =>
      parseAnalysis(JSON.stringify({ summary: 'x', deadline, deadlineTime })).deadlineTime;
    expect(at('15:00')).toBe('15:00'); // "meet at 3:00 PM"
    expect(at('09:30')).toBe('09:30');
    expect(at('25:00')).toBeNull(); // not a real hour
    expect(at('3pm')).toBeNull(); // must be HH:MM 24h
    expect(at(null)).toBeNull();
    // A time without a date is meaningless — dropped.
    expect(at('15:00', null)).toBeNull();
  });

  it('throws when all text fields are empty', () => {
    expect(() => parseAnalysis(JSON.stringify({ priority: 10 }))).toThrow();
  });
});
