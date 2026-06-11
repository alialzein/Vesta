import { describe, expect, it } from 'vitest';
import { buildBriefPrompt, parseBrief, type BriefItem } from '@/lib/ai/brief';

const ITEMS: BriefItem[] = [
  {
    id: 'wi-1',
    title: 'Q3 budget approval',
    person: 'Maya Khoury',
    category: 'waiting',
    score: 88,
    due: 'Overdue (was due Jun 9)',
    overdue: true,
    summary: 'Maya needs your sign-off on the revised numbers.',
  },
  { id: 'wi-2', title: 'Vendor follow-up', category: 'followup', score: 60, fresh: true },
];

describe('buildBriefPrompt', () => {
  it('includes the date, every item with its id, and the JSON contract', () => {
    const { system, user } = buildBriefPrompt({ items: ITEMS, today: 'Thursday, June 11, 2026' });
    expect(user).toContain('Thursday, June 11, 2026');
    expect(user).toContain('id=wi-1');
    expect(user).toContain('id=wi-2');
    expect(user).toContain('(OVERDUE)');
    expect(user).toContain('new-since-yesterday');
    expect(user).toContain('"Maya Khoury"');
    expect(system).toContain('focusItemId');
    expect(system).toContain('Return ONLY a JSON object');
    // The model must never invent content.
    expect(system).toContain('Never invent');
  });
});

describe('parseBrief', () => {
  const VALID = new Set(['wi-1', 'wi-2']);

  it('parses a well-formed brief', () => {
    const brief = parseBrief(
      JSON.stringify({
        headline: 'Maya is blocked on the Q3 budget.',
        body: 'Two items need you. The budget is overdue; the vendor nudge can wait until after.',
        focusItemId: 'wi-1',
        focusReason: 'It is overdue and a person is waiting on it.',
      }),
      VALID,
    );
    expect(brief.headline).toBe('Maya is blocked on the Q3 budget.');
    expect(brief.focusItemId).toBe('wi-1');
    expect(brief.focusReason).toContain('overdue');
  });

  it('drops an invented focusItemId (and its reason)', () => {
    const brief = parseBrief(
      JSON.stringify({
        headline: 'h',
        body: 'b',
        focusItemId: 'wi-999',
        focusReason: 'made up',
      }),
      VALID,
    );
    expect(brief.focusItemId).toBeNull();
    expect(brief.focusReason).toBeNull();
  });

  it('tolerates code fences around the JSON', () => {
    const raw = '```json\n{"headline":"h","body":"b","focusItemId":null,"focusReason":null}\n```';
    expect(parseBrief(raw, VALID).headline).toBe('h');
  });

  it('throws when headline or body is missing (caller keeps the deterministic brief)', () => {
    expect(() => parseBrief(JSON.stringify({ headline: '', body: 'b' }), VALID)).toThrow();
    expect(() => parseBrief('no json here at all', VALID)).toThrow();
  });
});
